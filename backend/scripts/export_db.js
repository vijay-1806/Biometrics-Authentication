const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo';
const OUTPUT_DIR = path.join(__dirname, '..', 'db_seeds');

async function exportDatabase() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections.`);

    let totalDocs = 0;
    for (const col of collections) {
      const colName = col.name;
      // Skip system collections if any
      if (colName.startsWith('system.')) continue;

      const data = await mongoose.connection.db.collection(colName).find({}).toArray();
      const filePath = path.join(OUTPUT_DIR, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  - Exported ${colName}: ${data.length} documents -> ${colName}.json`);
      totalDocs += data.length;
    }

    console.log(`\nSuccessfully exported ${totalDocs} total documents to: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error('Export failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

exportDatabase();
