const pool = require('../config/db');

async function migrate() {
  try {
    console.log('[Migration] Creating notifications table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        url VARCHAR(500) DEFAULT NULL,
        type VARCHAR(50) DEFAULT 'broadcast',
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert an initial welcome notification if table is empty
    const [[count]] = await pool.execute('SELECT COUNT(*) as total FROM notifications');
    if (count.total === 0) {
      await pool.execute(
        `INSERT INTO notifications (title, message, url, type, status) VALUES (?, ?, ?, ?, ?)`,
        [
          'Welcome to Mono v1.0.3! 🚀',
          'Explore daily financial tracking, responsive profile controls, and high-speed cloud sync.',
          'https://mono-nbt6.onrender.com/api/app/download',
          'broadcast',
          'sent'
        ]
      );
    }

    const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY id DESC LIMIT 5');
    console.log('[Migration] Success! Current notifications:', rows);
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

migrate();
