const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo';
const SEEDS_DIR = path.join(__dirname, '..', 'db_seeds');

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
      const docs = JSON.parse(raw);

      if (!Array.isArray(docs) || docs.length === 0) {
        console.log(`  - Skipping ${colName} (0 records)`);
        continue;
      }

      // Convert $oid / date strings if any, or insert raw
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
