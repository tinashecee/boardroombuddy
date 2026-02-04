const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Hint: The database "boardroom_buddy" does not exist. Run schema.sql first.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Hint: Check your DB_USER and DB_PASSWORD in .env');
    }
  } else {
    console.log('✅ Connected to MySQL database');
    connection.release();
  }
});

module.exports = promisePool;
