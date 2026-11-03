const mysql = require('mysql2/promise');

async function clean() {
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'FhCGq9CdLamFc3e.root',
    password: '9lLYocTvSLdA7ef5',
    database: 'mono_db',
    ssl: { rejectUnauthorized: false }
  });

  await conn.query('DELETE FROM transactions');
  await conn.query('DELETE FROM users');
  await conn.query('DELETE FROM categories WHERE user_id IS NOT NULL');
  await conn.query("UPDATE categories SET status = 'active'");

  const [u] = await conn.query('SELECT count(*) as count FROM users');
  const [c] = await conn.query('SELECT count(*) as count FROM categories');
  const [t] = await conn.query('SELECT count(*) as count FROM transactions');

  console.log(`[Clean DB] Users: ${u[0].count}, Transactions: ${t[0].count}, Default Categories: ${c[0].count}`);
  await conn.end();
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});

