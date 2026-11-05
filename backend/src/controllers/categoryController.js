const pool = require('../config/db');
const {
  validateCategoryType,
  validateHexColor,
  validateId,
  validateString,
} = require('../utils/validators');

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
  { name: 'Business', icon: 'payment_rounded', color: '#047857', type: 'income' },
];

/**
 * Seed default categories for a specific user if they have none
 */
const seedDefaultCategoriesForUser = async (userId) => {
  try {
    const [existing] = await pool.execute(
      'SELECT COUNT(*) as count FROM categories WHERE user_id = ?',
      [userId]
    );

    if (existing[0].count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await pool.execute(
          'INSERT INTO categories (user_id, name, icon, color, type, status) VALUES (?, ?, ?, ?, ?, "active")',
          [userId, cat.name, cat.icon, cat.color, cat.type]
        );
      }
      console.log(`[CategoryController] Successfully seeded default categories for user_id: ${userId}`);
    }
  } catch (err) {
    console.error(`[CategoryController] Error seeding default categories for user_id ${userId}:`, err);
  }
};

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, type, all } = req.query;

    let baseFilter = 'WHERE user_id = ?';
    const params = [userId];

    if (type && (type === 'income' || type === 'expense')) {
      baseFilter += " AND (type = ? OR type = 'both')";
      params.push(type);
    }

    if (all === 'false' || (page && limit)) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM categories ${baseFilter}`,
        params
      );
      const total = parseInt(countResult[0].total, 10) || 0;

      const [categories] = await pool.execute(
        `SELECT id, user_id, name, icon, color, status, type, created_at 
         FROM categories 
         ${baseFilter}
         ORDER BY name ASC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
      );

      return res.json({
        success: true,
        categories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum < Math.ceil(total / limitNum),
        },
      });
    }

    // Default: Return all categories for this user (fast & sorted)
    const [categories] = await pool.execute(
      `SELECT id, user_id, name, icon, color, status, type, created_at 
       FROM categories 
       ${baseFilter}
       ORDER BY name ASC`,
      params
    );

    return res.json({
      success: true,
      categories,
      pagination: {
        page: 1,
        limit: categories.length,
        total: categories.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  } catch (error) {
    console.error('[CategoryController.getCategories] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories.',
    });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon, color, type } = req.body;

    const nameVal = validateString(name, 'Category name', 60, true);
    if (!nameVal.valid) {
      return res.status(400).json({
        success: false,
        message: nameVal.error,
      });
    }

    const iconVal = validateString(icon, 'Category icon', 60, false);
    const categoryName = nameVal.sanitized;
    const categoryIcon = iconVal.sanitized || 'movie_outlined';
    const categoryColor = validateHexColor(color).value;
    const categoryType = validateCategoryType(type).value;

    // Insert new category strictly with user_id
    const [result] = await pool.execute(
      'INSERT INTO categories (user_id, name, icon, color, type, status) VALUES (?, ?, ?, ?, ?, "active")',
      [userId, categoryName, categoryIcon, categoryColor, categoryType]
    );

    const newCategory = {
      id: result.insertId,
      user_id: userId,
      name: categoryName,
      icon: categoryIcon,
      color: categoryColor,
      type: categoryType,
      status: 'active',
    };

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: newCategory,
    });
  } catch (error) {
    console.error('[CategoryController.createCategory] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category.',
    });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const catIdVal = validateId(req.params.id, 'Category ID');
    if (!catIdVal.valid) {
      return res.status(400).json({
        success: false,
        message: catIdVal.error,
      });
    }
    const categoryId = catIdVal.value;
    const { name, icon, color, type } = req.body;

    const nameVal = validateString(name, 'Category name', 60, true);
    if (!nameVal.valid) {
      return res.status(400).json({
        success: false,
        message: nameVal.error,
      });
    }

    const iconVal = validateString(icon, 'Category icon', 60, false);
    const categoryName = nameVal.sanitized;
    const categoryIcon = iconVal.sanitized || 'category_rounded';
    const categoryColor = validateHexColor(color).value;
    const categoryType = validateCategoryType(type).value;

    // Strict multi-tenant isolation: user_id = ?
    const [result] = await pool.execute(
      `UPDATE categories 
       SET name = ?, icon = ?, color = ?, type = ? 
       WHERE id = ? AND user_id = ?`,
      [categoryName, categoryIcon, categoryColor, categoryType, categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized.',
      });
    }

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category: {
        id: categoryId,
        user_id: userId,
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
        type: categoryType,
        status: 'active',
      },
    });
  } catch (error) {
    console.error('[CategoryController.updateCategory] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category.',
    });
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const catIdVal = validateId(req.params.id, 'Category ID');
    if (!catIdVal.valid) {
      return res.status(400).json({
        success: false,
        message: catIdVal.error,
      });
    }
    const categoryId = catIdVal.value;

    // Unlink any transactions using this category first
    await pool.execute(
      'UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?',
      [categoryId, userId]
    );

    // Hard delete category strictly for this user
    const [result] = await pool.execute(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or unauthorized.',
      });
    }

    return res.json({
      success: true,
      message: 'Category permanently deleted from database.',
    });
  } catch (error) {
    console.error('[CategoryController.deleteCategory] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category.',
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategoriesForUser,
};
