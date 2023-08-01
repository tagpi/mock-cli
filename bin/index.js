#! /usr/bin/env node

const command = process.argv[2] || 'serve';

(async () => {
  switch(command) {
    case 'serve': {
      const configFilePath = process.argv[3] || './mock.config.json';
      const { MockServer } = require('../lib/mock-server.js');
      const instance = new MockServer();
      await instance.init(configFilePath);
      return;
    }
    default: 
      console.log('Invalid command. Try the following command:');
      console.log('npx mock-cli serve')
      return;
  }
})()