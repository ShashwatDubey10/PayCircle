const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info('DB', `Connected to MongoDB: ${conn.connection.host}`);
  } catch (err) {
    logger.error('DB', `Initial connection failed: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () =>
  logger.warn('DB', 'MongoDB disconnected — waiting for reconnect')
);
mongoose.connection.on('reconnected', () =>
  logger.info('DB', 'MongoDB reconnected')
);
mongoose.connection.on('error', (err) =>
  logger.error('DB', `MongoDB runtime error: ${err.message}`)
);

module.exports = connectDB;
