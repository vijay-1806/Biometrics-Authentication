const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const seedDemo = require('./seed-demo');

async function main() {
  const uri = new URL(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_demo');
  uri.pathname = '/demo_bootstrap_test_' + process.pid + '_' + Date.now();
  process.env.MONGO_URI = uri.toString();
  process.env.DEMO_SEED = 'true';
  const seedDir = process.env.DEMO_SEED_DIR || '/app/demo-seeds/lms';
  const users = JSON.parse(fs.readFileSync(path.join(seedDir, 'users.json'), 'utf8'));
  const archivedAdmin = users.find(user => user.email === 'admin@gmail.com');
  const archivedVijay = users.find(user => user.email === 'vijay@gmail.com');
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.db.collection('users').insertMany([
    archivedAdmin, {...archivedVijay, password: await bcrypt.hash('ChangedPassword@2026!', 10)},
  ]);
  await mongoose.disconnect();
  await seedDemo();
  await mongoose.connect(process.env.MONGO_URI);
  let db = mongoose.connection.db;
  const admin = await db.collection('users').findOne({email: archivedAdmin.email});
  assert.ok(await bcrypt.compare('LmsAdmin@2026!', admin.password));
  assert.ok(await bcrypt.compare('ChangedPassword@2026!', (await db.collection('users').findOne({email: archivedVijay.email})).password));
  assert.equal(await db.collection('courses').countDocuments(), 3);
  const course = await db.collection('courses').findOne();
  await db.collection('courses').updateOne({_id: course._id}, {$set: {title: 'Edited after startup'}});
  await db.collection('users').updateOne({_id: admin._id}, {$set: {password: await bcrypt.hash('CustomAdmin@2026!', 10)}});
  await mongoose.disconnect();
  await seedDemo();
  await mongoose.connect(process.env.MONGO_URI);
  db = mongoose.connection.db;
  assert.equal((await db.collection('courses').findOne({_id: course._id})).title, 'Edited after startup');
  assert.ok(await bcrypt.compare('CustomAdmin@2026!', (await db.collection('users').findOne({_id: admin._id})).password));
  assert.equal(await db.collection('users').countDocuments(), 7);
  assert.equal(await db.collection('_demo_bootstrap').countDocuments(), 1);
  console.log('PASS: saved records restored once; imported admin adopted; changed passwords and edited courses preserved.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  if (!mongoose.connection.name.startsWith('demo_bootstrap_test_')) throw new Error('Unexpected test database');
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
