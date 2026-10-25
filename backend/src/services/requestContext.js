'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();
const DEFAULT_CONTEXT = Object.freeze({ testing: false, admin: null });

function getRequestContext() {
  return storage.getStore() || DEFAULT_CONTEXT;
}

function runWithContext(context, work) {
  return storage.run({ ...DEFAULT_CONTEXT, ...context }, work);
}

function isTestingMode() {
  return getRequestContext().testing === true;
}

module.exports = { getRequestContext, runWithContext, isTestingMode };
