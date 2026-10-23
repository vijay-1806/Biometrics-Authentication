const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const windowHandlers = new Map();
const documentHandlers = new Map();
const window = {
  addEventListener(type, handler, options) { windowHandlers.set(type, { handler, options }); },
  removeEventListener(type) { windowHandlers.delete(type); },
};
let focused = true;
const document = {
  hidden: false,
  hasFocus: () => focused,
  addEventListener(type, handler) { documentHandlers.set(type, handler); },
  removeEventListener(type) { documentHandlers.delete(type); },
};
const source = fs.readFileSync(path.join(__dirname, process.argv[2] || '../../behavioral-auth-ml-service/backend/sdk/biometrics.js'), 'utf8');
const pendingTimers = new Map();
let timerId = 0;
const flushTimers = () => { for (const [id, callback] of pendingTimers) { pendingTimers.delete(id); callback(); } };
vm.runInNewContext(source, { window, document, console: { log() {}, warn() {} }, setInterval: () => 1, clearInterval() {}, setTimeout: callback => { pendingTimers.set(++timerId, callback); return timerId; }, clearTimeout: id => pendingTimers.delete(id), Date });
const sdk = new window.BioAuth({ apiKey: 'test', apiUrl: 'http://unused', userId: 'test' });
const violations = [];
sdk.startSession({ onViolation: violation => violations.push(violation) });
assert.equal(windowHandlers.get('blur').options, undefined, 'Window blur must not use capture');
for (const target of [{ name: 'editor' }, { name: 'console tab' }, { name: 'run tests button' }]) {
  windowHandlers.get('blur').handler({ target });
}
assert.equal(violations.length, 0, 'Internal control focus changes must not count');
windowHandlers.get('blur').handler({ target: window });
flushTimers();
assert.equal(violations.length, 0, 'Window blur with a focused document must not warn');
focused = false;
windowHandlers.get('blur').handler({ target: window });
document.hidden = true;
documentHandlers.get('visibilitychange')();
assert.equal(violations.length, 1, 'Window blur and hidden event must count one departure');
documentHandlers.get('visibilitychange')();
assert.equal(violations.length, 1);
focused = true;
document.hidden = false;
documentHandlers.get('visibilitychange')();
windowHandlers.get('focus').handler();
focused = false;
windowHandlers.get('blur').handler({ target: window });
flushTimers();
assert.equal(violations.length, 2, 'A second real departure must count');
focused = true;
windowHandlers.get('focus').handler();
document.hidden = true;
documentHandlers.get('visibilitychange')();
assert.equal(violations.length, 3, 'Visibility-only tab changes must count');
document.hidden = false;
focused = true;
windowHandlers.get('focus').handler();
focused = false;
windowHandlers.get('blur').handler({ target: window });
focused = true;
windowHandlers.get('focus').handler();
flushTimers();
assert.equal(violations.length, 3, 'Brief focus movement returning inside must not warn');
focused = false;
windowHandlers.get('blur').handler({ target: window });
sdk.endSession();
flushTimers();
assert.equal(violations.length, 3, 'Stopping tracking must cancel pending warnings');
assert.equal(windowHandlers.size, 0, 'All window listeners must be cleaned up');
assert.equal(documentHandlers.size, 0, 'Document listeners must be cleaned up');
console.log('PASS: internal clicks ignored; real departures counted once; repeated switches detected; listeners cleaned up.');
