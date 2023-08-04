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
    const config = await this.file.getJsonFile(input);
    if (config.extends) {
      for (const line of config.extends) {
        const dat = JSON.parse(this.file.get(line));
        merge(config, dat);
      }
    }

    // set the server options
    this.port = config?.port || this.port;
    this.index = config?.index || this.index;
    this.index = this.index && this.file.getFullAddress(this.index);
    this.verbose = config?.verbose || this.verbose;


    // load the routes
    this.route.init(config.route);

    // attach request handlers
    this.attachFileHandler();
    this.attachApiHandler();
    this.attachProxyHandler();

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
    this.app.get('*', async (req, res, next) => {

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
      let fileId = this.route.target(route, req.path);

      // check for specific method file
      if (!route.methods?.length) {
        if (!path.extname(fileId)) {
          const method = req.method.toLowerCase();
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

      if (fileId.endsWith('.js')) {
        const module = await import(fileId);
        // res.setHeader('Content-Type', 'application/json');
        module.default(req, res, next);
        res.end();
      } else {
        await this.file.send(fileId, req, res, next);
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
