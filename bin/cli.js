#!/usr/bin/env node
'use strict';

const path = require('path');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

require(path.join(rootDir, 'server.js'));
