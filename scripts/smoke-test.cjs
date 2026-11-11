// Runs against a fresh Compose stack; never depends on personal seed data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { io } = require('../frontend/node_modules/socket.io-client');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8080';
const statePath = path.join(__dirname, '..', '.smoke-state.json');

async function request(route, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(base + route, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, text: await response.text() };
}

async function json(route, options) {
  const { response, text } = await request(route, options);
  assert.ok(response.ok, route + ': HTTP ' + response.status + ' ' + text);
  return JSON.parse(text);
}

async function websocket(token) {
  await new Promise((resolve, reject) => {
    const socket = io(base, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 10000 });
    const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket connection timed out')); }, 12000);
    socket.once('connect', () => { clearTimeout(timer); socket.close(); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); socket.close(); reject(error); });
  });
}

async function main() {
  const health = await json('/api/health');
  assert.equal(health.status, 'healthy');
  assert.match((await request('/')).text, /<div id="root">/);
  assert.match((await request('/dashboard')).text, /<div id="root">/);
  assert.equal((await json('/bio-api/v1/system/health')).status, 'healthy');
  assert.match((await request('/sdk.js')).text, /BioAuth/);

  if (process.argv.includes('--persistence')) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const profile = await json('/api/auth/profile', { token: state.token });
    assert.equal(profile.email, state.email); // Mongo data and JWT signing key survived.
    const status = await json('/bio-api/users/' + state.userId + '/status', {
      headers: { 'X-API-Key': 'bio_live_default_lms_key' },
    });
    assert.ok(status.samples_collected >= 1); // ML enrollment volume survived.
    await websocket(state.token);
    fs.unlinkSync(statePath);
    console.log('PASS: accounts, signing key, enrollment data, and WebSockets survived recreation.');
    return;
  }

  const email = 'ci-' + crypto.randomBytes(8).toString('hex') + '@example.com';
  const password = crypto.randomBytes(20).toString('hex');
  const user = await json('/api/auth/register', {
    method: 'POST', body: { name: 'CI Learner', email, password, role: 'admin' },
  });
  assert.equal(user.role, 'student');
  assert.ok(user.token);
  assert.equal((await json('/api/auth/profile', { token: user.token })).email, email);
  assert.equal((await request('/api/auth/profile')).response.status, 401);
  const loggedIn = await json('/api/auth/login', { method: 'POST', body: { email, password } });
  await websocket(loggedIn.token);

  const headers = { 'X-API-Key': 'bio_live_default_lms_key' };
  assert.equal((await json('/bio-api/api-keys/validate', { headers })).tenant_id, 'default');
  assert.equal((await request('/bio-api/users/' + user._id + '/status')).response.status, 401);
  const initial = await json('/bio-api/users/' + user._id + '/status', { headers });
  assert.equal(initial.samples_collected, 0);
  const events = [];
  const passage = 'the quick brown fox jumps over the lazy dog and the student types a sample ';
  for (let i = 0; i < passage.length; i++) {
    events.push({ key: passage[i], type: 'down', t: i * 150 });
    events.push({ key: passage[i], type: 'up', t: i * 150 + 80 });
  }
  await json('/bio-api/enroll', { method: 'POST', headers, body: { user_id: user._id, events } });
  const enrolled = await json('/bio-api/users/' + user._id + '/status', { headers });
  assert.equal(enrolled.samples_collected, 1);
  fs.writeFileSync(statePath, JSON.stringify({ token: loggedIn.token, email, userId: user._id }), { mode: 0o600 });
  console.log('PASS: SPA routes, signup, login, role guard, authenticated WebSockets, SDK, and ML enrollment.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
