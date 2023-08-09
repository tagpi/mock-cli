const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const https = require('https');


class File {

  protocol = { 
    'http://': 'web',
    'https://': 'web',
    '.': 'file',
  };

  getProtocol(fileId) { 
    for (const [id, protocol] of Object.entries(this.protocol)) {
      if (fileId.startsWith(id)) {
        return protocol;
      }
    }
  }

  async getTextFile(fileId) { 
    if (fileId.startsWith('http')) {
      return this.getWebFile(fileId);
    } else {
      return this.getLocalFile(fileId);
    }
  }

  async getJsonFile(fileId) { 
    return JSON.parse(await this.getTextFile(fileId));
  }

  async send(fileId, req, res, next) {
    const protocol = this.getProtocol(fileId) || 'file';
    switch(protocol) {
      case 'file':
        res.sendFile(fileId);
        // res.end();
        return;
      case 'web': {
        const options = {};
        if (fileId.startsWith('https://')) {
          options.agent = new https.Agent({
            rejectUnauthorized: false,
          })
        }
        const response = await fetch(fileId, { 
          method: 'GET',
          ...options
        });
        const contentType = response.headers.get('content-type');
        const buffer = await response.buffer();
        res.setHeader('Content-Type', contentType);
        res.status(200).send(buffer);
        res.end();
        return;
      }
      default:
        throw new Error(`Unknown protocol for ${fileId} `);
    }
  }

  async getWebFile(filepath) { 
    const response = await fetch(filepath);
    data = await response.text();
    if (!data) { 
      throw new Error(`File not found: ${filepath}`);
    }
    return data;
  }

  getFullAddress(fileId) { 
    if (fileId.startsWith('.')) {
      return path.join(process.cwd(), fileId);
    }
    return fileId;
  }

  getLocalFile(filepath) {
    filepath = this.getFullAddress(filepath);
    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }
    return fs.readFileSync(filepath, { encoding: 'utf-8' });
  }

  isFile(filepath) { 
    return path.extname(filepath).length;
  }

}

module.exports = { File };