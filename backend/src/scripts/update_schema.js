const pool = require('../config/db');

async function updateSchema() {
  try {
    const [cols] = await pool.query('DESCRIBE transactions');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('payment_mode')) {
      await pool.query("ALTER TABLE transactions ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'UPI'");
      console.log('Added payment_mode column');
    }
    if (!colNames.includes('currency')) {
      await pool.query("ALTER TABLE transactions ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'");
      console.log('Added currency column');
    }
    console.log('Schema update complete');
  } catch (e) {
    console.error('Schema update error:', e);
  } finally {
    process.exit(0);
  }
}

updateSchema();

