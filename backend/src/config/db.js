const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms_demo');
    // Older installs used a 24 hour TTL on biometric sessions, which erased trust summaries before teachers could review results.
    try {
      const indexes = await conn.connection.collection('behaviorsessions').indexes();
      const ttlIndex = indexes.find(index => index.key?.createdAt === 1 && index.expireAfterSeconds !== undefined);
      if (ttlIndex) await conn.connection.collection('behaviorsessions').dropIndex(ttlIndex.name);
    } catch (indexError) {
      if (indexError.codeName !== 'NamespaceNotFound') console.warn('Could not update behavioral session retention index:', indexError.message);
    }
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
