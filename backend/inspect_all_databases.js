const mongoose = require('mongoose');

async function inspectAllDatabases() {
  try {
    console.log('==================================================');
    console.log('  INSPECTING ALL MONGODB DATABASES & ACCOUNTS     ');
    console.log('==================================================\n');

    // Connect to admin database to list all databases
    const adminConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
    const adminDb = adminConn.db.admin();
    const dbsList = await adminDb.listDatabases();
    
    console.log('📂 Databases found in local MongoDB:');
    dbsList.databases.forEach(db => {
      console.log(`   - ${db.name} (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    console.log('\n--------------------------------------------------');

    for (const dbInfo of dbsList.databases) {
      if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;

      console.log(`\n🔍 Checking Database: [${dbInfo.name}]`);
      const dbConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbInfo.name}`).asPromise();
      
      const collections = await dbConn.db.listCollections().toArray();
      const collNames = collections.map(c => c.name);
      console.log(`   Collections: ${collNames.join(', ')}`);

      if (collNames.includes('users')) {
        const usersColl = dbConn.db.collection('users');
        const users = await usersColl.find({}).toArray();
        console.log(`   👤 Users (${users.length}):`);
        users.forEach(u => {
          console.log(`      └─ ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, PasswordHash: ${u.password ? u.password.substring(0, 15) + '...' : 'none'}`);
        });
      }

      if (collNames.includes('behaviormodels')) {
        const modelsColl = dbConn.db.collection('behaviormodels');
        const count = await modelsColl.countDocuments();
        console.log(`   🧠 BehaviorModels count: ${count}`);
      }

      if (collNames.includes('behaviorwindows')) {
        const windowsColl = dbConn.db.collection('behaviorwindows');
        const count = await windowsColl.countDocuments();
        console.log(`   📊 BehaviorWindows count: ${count}`);
      }

      if (collNames.includes('behaviorsessions')) {
        const sessionsColl = dbConn.db.collection('behaviorsessions');
        const count = await sessionsColl.countDocuments();
        console.log(`   🎯 BehaviorSessions count: ${count}`);
      }

      await dbConn.close();
    }

    await adminConn.close();
    console.log('\n==================================================');
    console.log('Inspection complete!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error inspecting MongoDB:', err.message);
  }
}

inspectAllDatabases();
