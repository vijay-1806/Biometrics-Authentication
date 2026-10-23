const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

// Generate once and persist a unique signing key for a setup with no manual steps.
if (!process.env.JWT_SECRET) {
  const secretPath = path.join(process.env.BACKEND_RUNTIME_DIR || '/app/runtime', 'jwt-secret');
  try {
    fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  process.env.JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim();
}
const appDirectory = process.env.BACKEND_APP_DIR || '/app/backend';
require(path.join(appDirectory, 'scripts/seed-demo.js'))()
  .then(() => require(path.join(appDirectory, 'src/server.js')))
  .catch(error => { console.error('Demo bootstrap failed:', error); process.exitCode = 1; });
