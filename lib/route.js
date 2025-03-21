const { merge, cloneDeep } = require('lodash');

class Route {

  path = { };
  priority = [];
  file;

  init(config) {
    if (!config) { return }

    for (let [pathId, route] of Object.entries(config)) {
      if (!pathId.startsWith('/')) {
        pathId = `/${pathId}`;
      }
      this.path[pathId] = this.format(pathId, route);
      this.priority.push(pathId);
    }

    this.priority.sort((a, b) => this.compare(a, b));
    
  }

  format(path, fileId) { 

    if (typeof fileId !== 'string') { 
      return fileId;
    }

    const output = { path, target: fileId };

    // no formatting required
    if (this.file.getProtocol(fileId)) {
      return output;
    }

    // split char not identified
    const index = fileId.indexOf(':');
    if (index === -1) {
      return output;
    }

    // expand
    const identifiers = fileId.substring(0, index).split(' ');
    output.target = fileId.substring(index+1);
    
    for (const identifier of identifiers) {
      switch(identifier.toLowerCase()) {
        case 'get':
        case 'post': 
        case 'put': 
        case 'delete': 
          output.methods = output.methods || [];
          output.methods.push(identifier.toLowerCase());
          break;
        case 'api':
          output.api = true;
          break;
        case 'proxy':
          output.proxy = true;
          output.options = merge({ pathRewrite: { [`^${path}`]: '/' } }, output.options);
          break;
      }
    }

    return output;

  }

  get(request) { 

    const parts = request.split('/').filter(part => !!part.trim());
    let routes = cloneDeep(this.priority);

    routes = routes.filter(route => route.split('/').filter(part => !!part.trim()).length <= parts.length);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const valid = [];
      for (const route of routes) { 
        const routePart = route.split('/').filter(part => !!part.trim())[i];
        if (!routePart) { valid.push(route); continue }
        if (routePart.startsWith(':')) { valid.push(route); continue }
        if (routePart === part) { valid.push(route); continue }
      }
      if (!valid.length) {
        break;
      }
      routes = valid;
    }

    // sort
    routes.sort((a, b) => {
      const aWild = a.split('/').filter(part => part.startsWith(':')).length;
      const bWild = b.split('/').filter(part => part.startsWith(':')).length;
      if (aWild > bWild) { return -1 }
      if (aWild < bWild) { return 1 }
      return 0;
    });

    return routes.length && this.path[routes[0]];

  }

  compare(a, b) { 

    // sort by more specific path
    const aLength = a.split('/').length;
    const bLength = b.split('/').length;

    if (aLength > bLength) { return -1 }
    if (aLength < bLength) { return 1 }
    
    // sort by longest names first
    if (a.length > b.length) { return -1 }
    if (a.length < b.length) { return 1 } 

    return 0;

  }

  target(route, path) { 

    // remove path
    let fwd = path.substring(route.path.length);
    while (fwd.startsWith('/')) { 
      fwd = fwd.substring(1);
    }

    // clear trailing /
    let fileId = `${route.target}/${fwd}`.trim();
    if (fileId.endsWith('/')) {
      fileId = fileId.substring(0, fileId.length - 1);
    }

    if (this.file.getProtocol(fileId) === 'file') {
      fileId = this.file.getFullAddress(fileId);
    }

    return fileId;
    
  }

}

module.exports = { Route }