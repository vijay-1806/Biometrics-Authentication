// Idempotent local demo bootstrap. Production deployments leave DEMO_SEED unset.
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seedDemo() {
  if (process.env.DEMO_SEED !== 'true') return;
  const directory = process.env.DEMO_SEED_DIR || '/app/demo-seeds/lms';
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_demo');
  try {
    const db = mongoose.connection.db;
    const markers = db.collection('_demo_bootstrap');
    if (await markers.findOne({ _id: 'saved-demo-v1' })) return;
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.json'));
    files.sort((a, b) => Number(b === 'users.json') - Number(a === 'users.json'));
    const knownPasswords = {
      'admin@gmail.com': 'LmsAdmin@2026!',
      'teacher@gmail.com': 'password123',
      'teacher-01@gmail.com': 'password123',
      'student@gmail.com': 'password123',
    };
    for (const file of files) {
      const name = path.basename(file, '.json');
      const collection = db.collection(name);
      const records = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      for (const record of records) {
        if (name === 'users') {
          const byEmail = await collection.findOne({ email: record.email });
          if (byEmail && String(byEmail._id) !== String(record._id)) {
            throw new Error(`Saved account ID conflict for ${record.email}; existing data was kept.`);
          }
          const password = knownPasswords[record.email];
          if (password) {
            const oldHash = record.password;
            record.password = await bcrypt.hash(password, 10);
            // Adopt accounts previously imported from this exact export; never reset a changed password.
            await collection.updateOne({ _id: record._id, password: oldHash }, { $set: { password: record.password } });
          }
        }
        for (const key of ['createdAt', 'updatedAt', 'lastActiveAt']) {
          if (typeof record[key] === 'string') record[key] = new Date(record[key]);
        }
        await collection.updateOne({ _id: record._id }, { $setOnInsert: record }, { upsert: true });
      }
      console.log(`Demo bootstrap: ${records.length} saved ${name} records checked.`);
    }
    await markers.insertOne({ _id: 'saved-demo-v1', completedAt: new Date() });
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = seedDemo;
if (require.main === module) seedDemo().catch(error => { console.error(error); process.exitCode = 1; });
