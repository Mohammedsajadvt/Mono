const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Fallback to current working directory .env

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mono_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')))
    ? { rejectUnauthorized: false }
    : undefined,
});

// Test MySQL connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database: ${process.env.DB_NAME || 'mono_db'} on ${process.env.DB_HOST || 'localhost'}`);
    connection.release();
  } catch (error) {
    console.error('[Database] MySQL Connection Failed:', error.message);
  }
})();

module.exports = pool;
