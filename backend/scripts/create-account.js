// Explicit provisioning only: never runs automatically at startup.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const { ACCOUNT_NAME, ACCOUNT_EMAIL, ACCOUNT_PASSWORD, ACCOUNT_ROLE = 'teacher' } = process.env;
  if (!ACCOUNT_NAME || !ACCOUNT_EMAIL || !ACCOUNT_PASSWORD || ACCOUNT_PASSWORD.length < 12) {
    throw new Error('Set ACCOUNT_NAME, ACCOUNT_EMAIL and ACCOUNT_PASSWORD (at least 12 characters).');
  }
  if (!['teacher', 'admin', 'student'].includes(ACCOUNT_ROLE)) throw new Error('Invalid ACCOUNT_ROLE');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_demo');
  if (await User.exists({ email: ACCOUNT_EMAIL })) throw new Error('Account already exists; refusing to overwrite it.');
  await User.create({ name: ACCOUNT_NAME, email: ACCOUNT_EMAIL, password: ACCOUNT_PASSWORD, role: ACCOUNT_ROLE });
  console.log('Account created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
