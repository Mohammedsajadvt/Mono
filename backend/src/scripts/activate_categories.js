const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'FhCGq9CdLamFc3e.root',
    password: '9lLYocTvSLdA7ef5',
    database: 'mono_db',
    ssl: { rejectUnauthorized: false }
  });

  const [res] = await conn.query("UPDATE categories SET status = 'active' WHERE user_id = 1");
  console.log('Categories activated for user 1:', res.affectedRows);

  const [active] = await conn.query("SELECT id, user_id, name, type, status FROM categories WHERE status = 'active'");
  console.log('Active categories in DB:', active.length);
  console.table(active);

  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

