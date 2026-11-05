const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const cleanUsername = 'testadmin_' + Date.now();
    const cleanEmail = 'testadmin_' + Date.now() + '@mono.app';
    const passwordHash = await bcrypt.hash('Admin@123456', 10);

    const [existingEmails] = await pool.execute(
      'SELECT id FROM admin_users WHERE email IS NOT NULL AND LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );
    console.log('Existing emails check:', existingEmails);

    const [result] = await pool.execute(
      'INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, cleanEmail, passwordHash, 'admin']
    );
    console.log('Insert test result:', result.insertId);

    // Clean up test admin
    await pool.execute('DELETE FROM admin_users WHERE id = ?', [result.insertId]);
    console.log('Cleanup completed successfully!');
  } catch (err) {
    console.error('Test register error:', err);
  } finally {
    process.exit(0);
  }
})();
