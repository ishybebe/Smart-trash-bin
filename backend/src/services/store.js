'use strict';

const liveStore = require('./backends/mysqlStore');
const testingStore = require('./backends/sqliteStore');
const { isTestingMode } = require('./requestContext');

/**
 * Transactional store facade.
 *
 * Live kiosk traffic uses Aiven MySQL. Requests explicitly marked as admin
 * testing use the local SQLite sandbox. Reference data is not routed here; it
 * is always read from the live database by materialsService.
 */
function backend() {
  return isTestingMode() ? testingStore : liveStore;
}

async function depositExists(eventId) {
  return backend().depositExists(eventId);
}

async function saveDeposit(record, sessionId = null) {
  return backend().saveDeposit(record, sessionId);
}

async function getDeposit(eventId) {
  return backend().getDeposit(eventId);
}

async function saveQr(qrRecord) {
  return backend().saveQr(qrRecord);
}

async function getQrById(id) {
  return backend().getQrById(id);
}

async function redeemQr(id) {
  return backend().redeemQr(id);
}

async function scanQrToSession(request) {
  return backend().scanQrToSession(request);
}

async function ensureSession(sessionId) {
  return backend().ensureSession(sessionId);
}

async function getSession(sessionId) {
  return backend().getSession(sessionId);
}

async function addSessionPoints(sessionId, points) {
  return backend().addSessionPoints(sessionId, points);
}

async function withdrawSessionPoints(sessionId) {
  return backend().withdrawSessionPoints(sessionId);
}

async function deductSessionPoints(sessionId, points) {
  return backend().deductSessionPoints(sessionId, points);
}

async function dispenseRice(request) {
  return backend().dispenseRice(request);
}

async function getRiceInventory() {
  return backend().getRiceInventory();
}

async function addRiceInventory(amount) {
  return backend().addRiceInventory(amount);
}

async function resetRiceInventory() {
  return backend().resetRiceInventory();
}

module.exports = {
  depositExists,
  saveDeposit,
  getDeposit,
  saveQr,
  getQrById,
  redeemQr,
  scanQrToSession,
  ensureSession,
  getSession,
  addSessionPoints,
  withdrawSessionPoints,
  deductSessionPoints,
  dispenseRice,
  getRiceInventory,
  addRiceInventory,
  resetRiceInventory,
};
