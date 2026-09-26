const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo';
const SEEDS_DIR = path.join(__dirname, '..', 'db_seeds');

function convertTypes(obj, key = '') {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, idx) => convertTypes(item, key));
  }

  if (typeof obj === 'object') {
    // Handle MongoDB extended JSON { "$oid": "..." }
    if (obj.$oid && typeof obj.$oid === 'string') {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    // Handle MongoDB extended JSON { "$date": "..." }
    if (obj.$date) {
      return new Date(obj.$date);
    }

    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
      newObj[k] = convertTypes(v, k);
    }
    return newObj;
  }

  if (typeof obj === 'string') {
    // Convert 24-hex characters to ObjectId for known ID keys or _id
    const isIdKey = k =>
      k === '_id' ||
      k.endsWith('Id') ||
      ['teacher', 'student', 'user', 'course', 'quiz', 'assignment', 'session', 'exam', 'studentsEnrolled', 'enrolledStudents'].includes(k);

    if (/^[0-9a-fA-F]{24}$/.test(obj) && (isIdKey(key) || key === '_id' || !key)) {
      try {
        return new mongoose.Types.ObjectId(obj);
      } catch (e) {
        return obj;
      }
    }

    // Convert ISO date strings to Date objects
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return obj;
}

async function importDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    if (!fs.existsSync(SEEDS_DIR)) {
      console.error(`Seeds directory not found at: ${SEEDS_DIR}`);
      process.exit(1);
    }

    const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} seed files.\n`);

    let totalRestored = 0;
    for (const file of files) {
      const colName = path.basename(file, '.json');
      const filePath = path.join(SEEDS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const rawDocs = JSON.parse(raw);

      if (!Array.isArray(rawDocs) || rawDocs.length === 0) {
        console.log(`  - Skipping ${colName} (0 records)`);
        continue;
      }

      // Convert $oid / date strings / 24-hex ID strings to proper BSON types
      const docs = rawDocs.map(doc => convertTypes(doc));

      const collection = mongoose.connection.db.collection(colName);
      
      // Clear existing collection to avoid duplicates on re-seed
      await collection.deleteMany({});
      
      const result = await collection.insertMany(docs);
      console.log(`  ✓ Restored ${colName}: inserted ${result.insertedCount} documents`);
      totalRestored += result.insertedCount;
    }

    console.log(`\n🎉 Database import completed! Successfully seeded ${totalRestored} documents into ${MONGO_URI}`);
  } catch (err) {
    console.error('Import failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

importDatabase();
