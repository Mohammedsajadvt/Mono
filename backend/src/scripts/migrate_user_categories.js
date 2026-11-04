const mysql = require('../config/db');

const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: 'Grocery', icon: 'shopping_bag_outlined', color: '#438883', type: 'expense' },
  { name: 'Entertainment', icon: 'movie_outlined', color: '#FA3E3E', type: 'expense' },
  { name: 'Shopping', icon: 'shopping_cart_outlined', color: '#FF9800', type: 'expense' },
  { name: 'Transfer', icon: 'swap_horiz_rounded', color: '#2196F3', type: 'expense' },
  { name: 'Payment', icon: 'payment_rounded', color: '#9C27B0', type: 'expense' },
  { name: 'Food & Dining', icon: 'restaurant_rounded', color: '#FF5722', type: 'expense' },
  { name: 'Transport', icon: 'swap_horiz_rounded', color: '#009688', type: 'expense' },
  { name: 'Fitness', icon: 'fitness_center_rounded', color: '#4CAF50', type: 'expense' },
  // Income Categories
  { name: 'Salary', icon: 'payment_rounded', color: '#25A969', type: 'income' },
  { name: 'Credits & Bonus', icon: 'payment_rounded', color: '#10B981', type: 'income' },
  { name: 'Freelance', icon: 'payment_rounded', color: '#059669', type: 'income' },
  { name: 'Investments', icon: 'bolt_rounded', color: '#34D399', type: 'income' },
  { name: 'Business', icon: 'payment_rounded', color: '#047857', type: 'income' }
];

async function migrate() {
  console.log('[Migration] Starting user-specific category migration...');
  
  // 1. Get all users
  const [users] = await mysql.query('SELECT id, name, email FROM users');
  console.log(`[Migration] Found ${users.length} users.`);

  for (const user of users) {
    console.log(`[Migration] Checking categories for user ${user.id} (${user.email})...`);
    const [existing] = await mysql.query(
      'SELECT id, name FROM categories WHERE user_id = ? AND status = "active"',
      [user.id]
    );

    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
    
    for (const cat of DEFAULT_CATEGORIES) {
      if (!existingNames.has(cat.name.toLowerCase())) {
        await mysql.query(
          'INSERT INTO categories (user_id, name, icon, color, type, status) VALUES (?, ?, ?, ?, ?, "active")',
          [user.id, cat.name, cat.icon, cat.color, cat.type]
        );
        console.log(`  + Seeded '${cat.name}' (${cat.type}) for user ${user.id}`);
      }
    }
  }

  // 2. Remove legacy NULL user_id rows
  const [del] = await mysql.query('DELETE FROM categories WHERE user_id IS NULL');
  console.log(`[Migration] Cleaned up ${del.affectedRows} legacy NULL user_id categories.`);

  // 3. Verify
  const [allCats] = await mysql.query('SELECT id, user_id, name, type, status FROM categories');
  console.log(`[Migration] Total active categories across all users: ${allCats.length}`);
  console.table(allCats);

  process.exit(0);
}

migrate().catch(err => {
  console.error('[Migration] Error:', err);
  process.exit(1);
});

