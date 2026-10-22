const fs = require('node:fs');
const crypto = require('node:crypto');

// Generate once and persist a unique signing key for a setup with no manual steps.
if (!process.env.JWT_SECRET) {
  const secretPath = '/app/runtime/jwt-secret';
  try {
    fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
}
require('/app/backend/src/server.js');
