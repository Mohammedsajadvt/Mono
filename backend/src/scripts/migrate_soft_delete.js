const pool = require('../config/db');

async function migrate() {
  try {
    console.log('[Migration] Starting soft-delete status migration...');

    // 1. Add status to categories
    const [catCols] = await pool.query("SHOW COLUMNS FROM categories LIKE 'status'");
    if (catCols.length === 0) {
      await pool.query("ALTER TABLE categories ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
      console.log('[Migration] Added status column to categories.');
    } else {
      console.log('[Migration] categories.status already exists.');
    }
    await pool.query("UPDATE categories SET status = 'active' WHERE status IS NULL OR status = ''");

    // 2. Add status to transactions
    const [txCols] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'status'");
    if (txCols.length === 0) {
      await pool.query("ALTER TABLE transactions ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
      console.log('[Migration] Added status column to transactions.');
    } else {
      console.log('[Migration] transactions.status already exists.');
    }
    await pool.query("UPDATE transactions SET status = 'active' WHERE status IS NULL OR status = ''");

    // 3. Add status to send_again_contacts if exists
    try {
      const [contactCols] = await pool.query("SHOW COLUMNS FROM send_again_contacts LIKE 'status'");
      if (contactCols.length === 0) {
        await pool.query("ALTER TABLE send_again_contacts ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
        console.log('[Migration] Added status column to send_again_contacts.');
      }
      await pool.query("UPDATE send_again_contacts SET status = 'active' WHERE status IS NULL OR status = ''");
    } catch (e) {
      console.log('[Migration] send_again_contacts table check skipped:', e.message);
    }

    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    process.exit(1);
  }
}

migrate();
