const mysql = require('mysql2/promise');

async function updateCategories() {
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'FhCGq9CdLamFc3e.root',
    password: '9lLYocTvSLdA7ef5',
    database: 'mono_db',
    ssl: { rejectUnauthorized: false }
  });

  console.log('[TiDB] Connected.');

  // Check if type column exists in categories
  const [cols] = await conn.query("SHOW COLUMNS FROM categories LIKE 'type'");
  if (cols.length === 0) {
    console.log('[TiDB] Adding type column to categories table...');
    await conn.query("ALTER TABLE categories ADD COLUMN type ENUM('expense', 'income', 'both') NOT NULL DEFAULT 'both'");
    console.log('[TiDB] Added type column.');
  }

  // Update existing default categories to expense or both
  await conn.query("UPDATE categories SET type = 'expense' WHERE type = 'both' AND name IN ('Grocery', 'Entertainment', 'Shopping', 'Payment', 'Food & Dining', 'Transport', 'Fitness')");
  await conn.query("UPDATE categories SET type = 'both' WHERE name = 'Transfer'");

  // Insert or update income categories
  const incomeCats = [
    { name: 'Salary', icon: 'account_balance_wallet_outlined', color: '#2E7D32', type: 'income' },
    { name: 'Credits & Bonus', icon: 'payments_outlined', color: '#00897B', type: 'income' },
    { name: 'Freelance', icon: 'laptop_mac_outlined', color: '#1565C0', type: 'income' },
    { name: 'Investments', icon: 'trending_up_outlined', color: '#6A1B9A', type: 'income' },
    { name: 'Business', icon: 'store_outlined', color: '#E65100', type: 'income' },
  ];

  for (const cat of incomeCats) {
    const [existing] = await conn.query("SELECT id FROM categories WHERE name = ? AND user_id IS NULL", [cat.name]);
    if (existing.length === 0) {
      await conn.query(
        "INSERT INTO categories (user_id, name, icon, color, status, type) VALUES (NULL, ?, ?, ?, 'active', ?)",
        [cat.name, cat.icon, cat.color, cat.type]
      );
      console.log(`[TiDB] Inserted income category: ${cat.name}`);
    } else {
      await conn.query(
        "UPDATE categories SET icon = ?, color = ?, status = 'active', type = ? WHERE id = ?",
        [cat.icon, cat.color, cat.type, existing[0].id]
      );
      console.log(`[TiDB] Updated income category: ${cat.name}`);
    }
  }

  const [allCats] = await conn.query("SELECT id, name, icon, color, status, type FROM categories WHERE status = 'active'");
  console.log('[TiDB] All Active Categories:', allCats);

  await conn.end();
}

updateCategories().catch(e => {
  console.error('[TiDB Error]', e);
  process.exit(1);
});

