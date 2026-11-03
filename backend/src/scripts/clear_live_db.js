const mysql = require('mysql2/promise');

async function clearLiveDb() {
  const config = {
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'FhCGq9CdLamFc3e.root',
    password: '9lLYocTvSLdA7ef5',
    database: 'mono_db',
    ssl: { rejectUnauthorized: false }
  };

  console.log('[Clear Live DB] Connecting to TiDB Cloud mono_db...');
  const conn = await mysql.createConnection(config);
  console.log('[Clear Live DB] Connected successfully.');

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  console.log('[Clear Live DB] Deleting transactions...');
  await conn.query('TRUNCATE TABLE transactions');

  console.log('[Clear Live DB] Deleting budgets...');
  await conn.query('TRUNCATE TABLE budgets');

  console.log('[Clear Live DB] Deleting savings_transactions...');
  await conn.query('TRUNCATE TABLE savings_transactions');

  console.log('[Clear Live DB] Deleting savings_goals...');
  await conn.query('TRUNCATE TABLE savings_goals');

  console.log('[Clear Live DB] Deleting bills_emi_debts...');
  await conn.query('TRUNCATE TABLE bills_emi_debts');

  console.log('[Clear Live DB] Deleting send_again_contacts...');
  await conn.query('TRUNCATE TABLE send_again_contacts');

  console.log('[Clear Live DB] Deleting users...');
  await conn.query('TRUNCATE TABLE users');

  console.log('[Clear Live DB] Cleaning categories (retaining active system defaults)...');
  await conn.query('DELETE FROM categories WHERE user_id IS NOT NULL');
  await conn.query("UPDATE categories SET status = 'active'");

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // Verify counts
  const [usersCount] = await conn.query('SELECT count(*) as count FROM users');
  const [txCount] = await conn.query('SELECT count(*) as count FROM transactions');
  const [budgetsCount] = await conn.query('SELECT count(*) as count FROM budgets');
  const [savingsCount] = await conn.query('SELECT count(*) as count FROM savings_goals');
  const [billsCount] = await conn.query('SELECT count(*) as count FROM bills_emi_debts');
  const [cats] = await conn.query('SELECT id, name, type, status FROM categories');

  console.log('----------------------------------------------------');
  console.log(`[Clear Live DB Summary]`);
  console.log(`Users:               ${usersCount[0].count}`);
  console.log(`Transactions:        ${txCount[0].count}`);
  console.log(`Budgets:             ${budgetsCount[0].count}`);
  console.log(`Savings Goals:       ${savingsCount[0].count}`);
  console.log(`Bills & EMI Debts:   ${billsCount[0].count}`);
  console.log(`Default Categories:  ${cats.length} active categories`);
  cats.forEach(c => console.log(`  - [${c.type.toUpperCase()}] ${c.name} (id: ${c.id}, status: ${c.status})`));
  console.log('----------------------------------------------------');

  await conn.end();
  console.log('[Clear Live DB] Database is completely clean and ready for live production use!');
}

clearLiveDb().catch(err => {
  console.error('[Clear Live DB] Error:', err);
  process.exit(1);
});
