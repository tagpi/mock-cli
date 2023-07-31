const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

class MockServer {

  init(configFilePath) {
    this.config = this.getConfig(configFilePath);
    this.app = express();
  }

  start() {

    // process the api request
    this.app.get('*', (req, res, next) => {
      this.process(req, res, next);
    });

    // handle proxies
    this.attachProxyHandler();

    // start the app
    this.app.listen(this.config.port, () => {
      console.log(`@mock/serve started @${this.config.port}`)
    })

  }

  getConfig(configFilePath) {

    const fullPath = path.join(process.cwd(), configFilePath);
    const txt = fs.existsSync(fullPath) && fs.readFileSync(fullPath, { encoding: 'utf-8'});
    const data = !txt
      ? { port: 3000 }
      : JSON.parse(txt);

    data.file = configFilePath;

    if (data.path) {
      this.expandPath(data.path);
      for(const [key, config] of Object.entries(data.path)) { 
        config.path = key;
      }
    }
    
    return data;

  }

  expandPath(paths) { 
    if (!paths) { return }
    for(const [key, config] of Object.entries(paths)) {
      if (typeof config === 'string') {

        // check shortcut type
        const index = config.indexOf(':');
        if (index === -1) {
          paths[key] = { method: [], type: '*', src: config };
          continue;
        }

        // expand
        const identifer = config.substring(0, index);
        const src = config.substring(index+1);
        switch(identifer) {
          case 'json': 
            paths[key] = { method: [], type: 'json', src };
            break;
          case 'txt': 
            paths[key] = { method: [], type: 'txt', src };
            break;
          case 'GET':
          case 'get':
            paths[key] = { method: ['GET'], type: 'api', src };
            break;
          case 'POST': 
          case 'post': 
            paths[key] = { method: ['POST'], type: 'api', src };
            break;
          case 'dir': 
            paths[key] = { method: [], type: 'api', src, dir: true };
            break;
          case 'proxy':
            paths[key] = { method: [], type: 'proxy', src, options: { pathRewrite: { [`^${key}`]: '/' } } };
            break;
          case 'proxy1':
            paths[key] = { method: [], type: 'proxy1', src, options: { pathRewrite: { [`^${key}`]: '/' } } };
            break;
          case 'static':
            paths[key] = { method: [], type: 'static', src};
            break;
          default: 
            paths[key] = { method: [], type: 'api', src: identifer };
            break;
        }
      }
    }
    
  }

  getPathConfig(apiPath) {
    if (!this.config.path) { return }

    // exact match
    const match = this.config.path[apiPath];
    if (match) { 
      return match;
    }

    // dir 
    const list = Object.entries(this.config.path);
    list.sort((a, b) => {

      // sort by more specific path
      const aLength = a[0].split('/').length;
      const bLength = b[0].split('/').length;
      if (aLength > bLength) { 
        return -1;
      } else if (aLength < bLength) { 
        return 1;
      } else {

        // sort by longest names first
        if (a[0].length > b[0].length) {
          return -1;
        } else if (a[0].length < b[0].length) {
          return 1;
        } 

      }
      return 0;
    });

    for (const [key, config] of list) {
      if (config.dir || config.type === 'proxy' || config.type === 'static') {
        if (apiPath.startsWith(key)) {
          return config;
        }
      }
    }
    
  }

  process(req, res, next) {

    // reload the config everytime
    if (this.config.reload && this.config.file) {
      this.config = this.getConfig(this.config.file);
    }

    // get path instructions
    let info = this.getPathConfig(req.path);
    if (!info) {
      next();
      return;
    }

    // source
    if (info.dir) {
      info = { src: `${info.src}/${req.path.substring(info.path.length)}` }
    }

    if (info.method?.length) {
      const methods = Array.isArray(info.method) ? info.method : [info.method];
      if (methods.indexOf(req.type?.toLowerCase()) === -1) {
        this.handleError(res, 405, 'Invalid method', { api: req.path });
        return;
      }
    }

    // process type
    switch(info.type) {
      case 'static': 
        return this.handleStatic(info, req, res, next);
      case 'proxy': 
        next();
        return;
      case 'proxy1': 
        return this.handleProxy1(info, req, res, next);
      case 'api':
      default:
        return this.handleApi(info, req, res, next);
    }

  }

  getFullFilePath(relativePath) {

    let fullPath = path.join(process.cwd(), relativePath);
    const ext = path.extname(fullPath);
    if (!ext) {
      for(const test of ['txt', 'json', 'js']) {
        if (fs.existsSync(`${fullPath}.${test}`)) {
          fullPath = `${fullPath}.${test}`;
          break;
        }
      }
    }
    return fullPath;

  }

  handleIndex(req, res, next) {

    if (this.config.index) {
      const fullpath = path.join(process.cwd(), this.config.index);
      if (fs.existsSync(fullpath)) {
        res.sendFile(fullpath); 
        return;
      }
    }

    this.handleError(res, 404, 'Static index file not found.');

  }

  handleStatic(info, req, res, next) {

    const partialPath = `${info.src}/${req.path.substring(info.path.length)}`;
    const fullpath = this.getFullFilePath(partialPath);
    if (fs.existsSync(fullpath)) {
      res.sendFile(fullpath); 
      this.log({ api: req.path, static: info.src });
    } else {
      if (path.extname(req.path)) {
        return next();
      } else {
        this.handleIndex(req, res, next);
      }
    }

  }

  handleApi(info, req, res, next) { 

    const fullpath = this.getFullFilePath(info.src);
    if (!fs.existsSync(fullpath)) {
      this.handleError(res, 404, 'API file not found', { api: req.path, file: fullpath });
      return;
    }

    const ext = path.extname(fullpath);
    switch(ext) {
      case '.json':
        res.setHeader('Content-Type', 'application/json');
        break;
      case '.js':
        import(fullpath).then(module => module.default(req, res, next));
        this.log({ api: req.path, fn: fullpath });
        return;
    }

    // send the file
    res.sendFile(fullpath);
    this.log({ api: req.path, file: fullpath });

  }

  handleProxy1(info, req, res, next) { 
        
    const self = this;

    const parts = info.src.split('/');
    parts.pop();
    const dir = parts.join('/');

    info.options.pathRewrite = { '(.*)': '/config.json' }

    const middleware = createProxyMiddleware({ 
      target: dir,
      changeOrigin: true,
      onProxyReq: function onProxyReq(proxyReq, req, res) {
        self.log({ proxy1: req.path })
      },
      ...(info.options || {})
    });

    middleware(req, res, next);

  }

  handleError(res, code, message, notes = {}) { 
    this.log({ ...notes, error: message }, true);
    res.sendStatus(code);
  }

  log(data, override = false) {
    if (!override && !this.config.verbose) { return }
    console.log({ ...data, time: new Date().toISOString()})
  }

  attachProxyHandler() {

    const self = this;

    const list = Object.entries(this.config.path)
      .filter(entry => entry[1].type === 'proxy')

    list.sort((a, b) => {

      // sort by more specific path
      const aLength = a[0].split('/').length;
      const bLength = b[0].split('/').length;
      if (aLength > bLength) { 
        return -1;
      } else if (aLength < bLength) { 
        return 1;
      } else {

        // sort by longest names first
        if (a[0].length > b[0].length) {
          return -1;
        } else if (a[0].length < b[0].length) {
          return 1;
        } 

      }
      return 0;
    });

    for (const [path, config] of list) {
        
      const middleware = createProxyMiddleware(
        { 
          target: config.src,
          changeOrigin: true,
          onProxyReq: function onProxyReq(proxyReq, req, res) {
            self.log({ proxy: path, path: req.path })
          },
          ...(config.options || {})
        }
      );

      this.app.use(config.path, middleware);

    }

  }

}

module.exports = { MockServer }
