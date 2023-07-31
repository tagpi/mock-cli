#! /usr/bin/env node

const command = process.argv[2] || 'serve';
const path = require('path');

switch(command) {
  case 'serve': {
    const configFilePath = process.argv[3] || './mock.config.json';
    const { MockServer } = require('../lib/mock-server.js');
    const instance = new MockServer();
    instance.init(configFilePath);
    instance.start();
    return;
  }
  default: 
    console.log('Invalid command. Try the following command:');
    console.log('npx mock-cli serve')
    return;
}

console.log();
console.log('run', command, configFilePath);
console.log();
console.log('>', process.cwd())
console.log();
console.log();