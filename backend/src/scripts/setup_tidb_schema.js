
const mysql = require('mysql2/promise');

async function setupTiDB() {
  const config = {
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'FhCGq9CdLamFc3e.root',
    password: '9lLYocTvSLdA7ef5',
    database: 'mono_db',
    ssl: { rejectUnauthorized: false }
  };

  console.log('[TiDB Setup] Connecting to TiDB Cloud mono_db...');
  const conn = await mysql.createConnection(config);
  console.log('[TiDB Setup] Connected successfully.');

  const dropTables = [
    'savings_transactions',
    'savings_goals',
    'bills_emi_debts',
    'send_again_contacts',
    'transactions',
    'budgets',
    'categories',
    'users'
  ];

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const tbl of dropTables) {
    console.log(`[TiDB Setup] Dropping table if exists: ${tbl}`);
    await conn.query(`DROP TABLE IF EXISTS \`${tbl}\``);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  const createStatements = [
    `CREATE TABLE \`users\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`name\` varchar(100) NOT NULL,
      \`email\` varchar(150) NOT NULL,
      \`password_hash\` varchar(255) NOT NULL,
      \`avatar_url\` varchar(255) DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_users_email\` (\`email\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`categories\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL for global defaults, user_id for custom categories',
      \`name\` varchar(80) NOT NULL,
      \`icon\` varchar(50) NOT NULL DEFAULT 'movie_outlined',
      \`color\` varchar(20) NOT NULL DEFAULT '#438883',
      \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_categories_user\` (\`user_id\`),
      CONSTRAINT \`categories_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`transactions\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`category_id\` int(10) UNSIGNED DEFAULT NULL,
      \`title\` varchar(120) NOT NULL,
      \`type\` enum('income','expense') NOT NULL DEFAULT 'expense',
      \`amount\` decimal(12,2) NOT NULL,
      \`transaction_date\` date NOT NULL,
      \`invoice_url\` varchar(255) DEFAULT NULL,
      \`notes\` text DEFAULT NULL,
      \`payment_mode\` varchar(50) DEFAULT 'UPI',
      \`currency\` varchar(10) DEFAULT 'INR',
      \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`category_id\` (\`category_id\`),
      KEY \`idx_transactions_user_date\` (\`user_id\`,\`transaction_date\`),
      KEY \`idx_transactions_type\` (\`type\`),
      CONSTRAINT \`transactions_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`transactions_ibfk_2\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`budgets\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`category_id\` int(10) UNSIGNED DEFAULT NULL,
      \`category_name\` varchar(80) NOT NULL,
      \`amount_limit\` decimal(12,2) NOT NULL,
      \`period\` enum('monthly','weekly','yearly') NOT NULL DEFAULT 'monthly',
      \`month\` int(11) NOT NULL,
      \`year\` int(11) NOT NULL,
      \`alert_threshold\` int(11) DEFAULT 80,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`category_id\` (\`category_id\`),
      KEY \`idx_budgets_user_period\` (\`user_id\`,\`year\`,\`month\`),
      CONSTRAINT \`budgets_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`budgets_ibfk_2\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`savings_goals\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`goal_name\` varchar(120) NOT NULL,
      \`category\` varchar(60) NOT NULL DEFAULT 'trip',
      \`target_amount\` decimal(12,2) NOT NULL,
      \`saved_amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
      \`monthly_limit\` decimal(12,2) NOT NULL DEFAULT 0.00,
      \`target_date\` date DEFAULT NULL,
      \`icon\` varchar(50) NOT NULL DEFAULT 'flight_takeoff',
      \`color\` varchar(20) NOT NULL DEFAULT '#438883',
      \`priority\` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
      \`status\` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
      \`notes\` text DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_savings_user\` (\`user_id\`,\`status\`),
      CONSTRAINT \`savings_goals_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`savings_transactions\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`goal_id\` int(10) UNSIGNED NOT NULL,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`type\` enum('deposit','withdraw') NOT NULL DEFAULT 'deposit',
      \`amount\` decimal(12,2) NOT NULL,
      \`transaction_date\` date NOT NULL,
      \`notes\` text DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`goal_id\` (\`goal_id\`),
      KEY \`user_id\` (\`user_id\`),
      CONSTRAINT \`savings_transactions_ibfk_1\` FOREIGN KEY (\`goal_id\`) REFERENCES \`savings_goals\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`savings_transactions_ibfk_2\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`bills_emi_debts\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`title\` varchar(120) NOT NULL,
      \`type\` enum('bill','emi','debt') NOT NULL DEFAULT 'bill',
      \`payee\` varchar(120) NOT NULL,
      \`amount\` decimal(12,2) NOT NULL,
      \`due_date\` date NOT NULL,
      \`frequency\` enum('monthly','one_time','quarterly','yearly') NOT NULL DEFAULT 'monthly',
      \`status\` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
      \`interest_rate\` decimal(5,2) DEFAULT 0.00,
      \`payment_mode\` varchar(50) DEFAULT 'Bank Transfer',
      \`notes\` text DEFAULT NULL,
      \`paid_at\` timestamp NULL DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_bills_user_status\` (\`user_id\`,\`status\`),
      KEY \`idx_bills_due_date\` (\`due_date\`),
      CONSTRAINT \`bills_emi_debts_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE \`send_again_contacts\` (
      \`id\` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` int(10) UNSIGNED NOT NULL,
      \`name\` varchar(100) NOT NULL,
      \`avatar_url\` varchar(255) DEFAULT NULL,
      \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`user_id\` (\`user_id\`),
      CONSTRAINT \`send_again_contacts_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const stmt of createStatements) {
    const tableName = stmt.match(/CREATE TABLE `(\w+)`/)[1];
    console.log(`[TiDB Setup] Creating table: ${tableName}`);
    await conn.query(stmt);
  }

  console.log('[TiDB Setup] Seeding default active categories...');
  const seedCategoriesSql = `
    INSERT INTO \`categories\` (\`user_id\`, \`name\`, \`icon\`, \`color\`, \`status\`) VALUES
    (NULL, 'Grocery', 'shopping_bag_outlined', '#438883', 'active'),
    (NULL, 'Entertainment', 'movie_outlined', '#FA3E3E', 'active'),
    (NULL, 'Shopping', 'shopping_cart_outlined', '#FF9800', 'active'),
    (NULL, 'Transfer', 'sync_alt', '#2196F3', 'active'),
    (NULL, 'Payment', 'payment_outlined', '#9C27B0', 'active'),
    (NULL, 'Food & Dining', 'restaurant_outlined', '#FF5722', 'active'),
    (NULL, 'Transport', 'directions_car_outlined', '#009688', 'active'),
    (NULL, 'Fitness', 'fitness_center_outlined', '#4CAF50', 'active');
  `;
  await conn.query(seedCategoriesSql);

  console.log('[TiDB Setup] Validating tables and auto-increment...');
  const [tables] = await conn.query('SHOW TABLES');
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await conn.query('DESCRIBE ' + tableName);
    const idCol = cols.find(c => c.Field === 'id');
    console.log(`[Table] ${tableName} -> id extra: ${idCol ? idCol.Extra : 'N/A'}`);
  }

  const [cats] = await conn.query('SELECT count(*) as count FROM categories WHERE status = "active"');
  console.log(`[TiDB Setup] Active categories seeded: ${cats[0].count}`);

  await conn.end();
  console.log('[TiDB Setup] All schema and initial seed setup completed successfully on TiDB Cloud!');
}

setupTiDB().catch(err => {
  console.error('[TiDB Setup] Fatal error:', err);
  process.exit(1);
});