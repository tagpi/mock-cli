const express = require('express');
const path = require('path');
const fs = require('fs');
const { merge } = require('lodash');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { File } = require('./file');
const { Route } = require('./route');

class MockServer {

  port = 3000;
  index = '';
  verbose = false;
  apiExtensions = ['.txt', '.json', '.js'];

  file = new File();
  app = express();
  route = new Route();

  async init(input) {

    this.route.file = this.file;

    // prepare the config
    let config = await this.file.getJsonFile(input);
    if (config.extends) {
      for (const line of config.extends) {
        const dat = await this.file.getJsonFile(line);
        config = merge(dat, config);
      }
    }

    // set the server options
    this.port = config?.port || this.port;
    this.index = config?.index || this.index;
    this.index = this.index && this.file.getFullAddress(this.index);
    this.verbose = config?.verbose || this.verbose;


    // load the routes
    this.route.init(config.route);

    // allow json post
    this.app.use(express.json({limit: '50mb'}));

    // attach request handlers
    this.attachFileHandler();
    this.attachApiHandler();
    this.attachProxyHandler();
    this.attachErrorHandler();

    // start
    this.app.listen(this.port, () => {
      console.log(`@mock/serve started @${this.port}`)
    })

  }

  attachFileHandler() { 

    // file based requests
    this.app.get('*', async (req, res, next) => {

      const route = this.route.get(req.path);
      if (!route) { 
        this.handleError(res, 404, 'Route not found.', { path: req.path });
        return;
      }

      // do not handle api routes
      if (route.api) { return next() }

      // do not handle proxy routes 
      if (route.proxy) { return next() }

      // return file
      const fileId = this.route.target(route, req.path);

      if (this.file.isFile(fileId)) {
        await this.file.send(fileId, req, res, next);
        this.log({ target: fileId, path: req.path });
        return;
      }

      if (this.index) {
        await this.file.send(this.index, req, res, next);
        this.log({ error: 'File not found.', path: req.path, index: true });
        return;
      }

      // file not found
      this.handleError(res, 404, 'File not found.', { path: req.path });
      res.end();

    });
    
  }

  attachApiHandler() {

    // file based requests
    this.app.all('*', async (req, res, next) => {

      const route = this.route.get(req.path);
      if (!route) { 
        this.handleError(res, 404, 'Route not found.', { path: req.path });
        return;
      }

      // do not handle other route types
      if (!route.api) { return next() }

      // check for method
      if (route.methods?.length) { 
        if (route.methods.indexOf(req.type) === -1) {
          return next();
        }
      }

      // return file
      const pathDetail = this.parseRoutePath(route, req.path, req.method);
      if (!pathDetail) { 
        res.sendStatus(400);
        return;
      }

      if (pathDetail.fileId.endsWith('.js')) {
        const module = await require(pathDetail.fileId);
        module(req, res, next, pathDetail.params);
      } else {
        await this.file.send(pathDetail.fileId, req, res, next);
      }

    });

  }

  attachProxyHandler() {

    const self = this;

    // create proxy middlewares for proxies in config
    const routes = this.route.priority
      .filter(routeId => this.route.path[routeId].proxy);
      
    for (const routeId of routes) {
      const route = this.route.path[routeId];
      const middleware = createProxyMiddleware({ 
        target: route.target,
        changeOrigin: true,
        onProxyReq: function onProxyReq(proxyReq, req, res) {
          self.log({ proxy: routeId, path: req.path })
        },
        ...(route.options || {})
      });
      this.app.use(route.path, middleware);
    }

  }

  attachErrorHandler() {

    // file based requests
    this.app.all('*', async (req, res, next) => {
      this.handleError(res, 404, 'invalid-request');
    });

  }

  parseRoutePath(route, requestPath, requestMethod) { 

    
    // get route path params
    const params = {};
    const routePathParts = route.path.split('/').filter(item => !!item);
    const requestPathParts = requestPath.split('/').filter(item => !!item);

    for (let i = 0; i < routePathParts.length; i++) { 
      const routePathPart = routePathParts[i];
      if (routePathPart.startsWith(':')) {
        params[routePathPart.substring(1)] = requestPathParts[i];
      }
    }

    const remaining = requestPathParts.slice(routePathParts.length);
    let fileId = path.join(process.cwd(), route.target, ...remaining);

    // check for specific method file
    if (!route.methods?.length) {
      if (!path.extname(fileId)) {
        const method = requestMethod.toLowerCase();
        const temp = `${fileId}/${method}`;
        const ext = this.apiExtensions.find(test => fs.existsSync(`${temp}${test}`));
        if (ext) {
          fileId = `${temp}${ext}`;
        }
      }
    }

    // verify file extension
    if (!path.extname(fileId)) {
      const ext = this.apiExtensions.find(test => fs.existsSync(`${fileId}${test}`));
      if (ext) { 
        fileId = `${fileId}${ext}`;
      }
    }

    return { fileId, params };

  }

  handleError(res, code, message, notes = {}) { 
    this.log({ ...notes, error: message }, true);
    res.sendStatus(code);
  }

  log(data, override = false) {
    if (!override && !this.verbose) { return }
    console.log({ ...data, time: new Date().toISOString()})
  }

}

module.exports = { MockServer }
