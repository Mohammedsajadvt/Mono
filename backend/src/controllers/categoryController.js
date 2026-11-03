const pool = require('../config/db');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch active categories only (user_id IS NULL or user_id = ?)
    const [categories] = await pool.execute(
      `SELECT id, user_id, name, icon, color, status, type, created_at 
       FROM categories 
       WHERE (user_id IS NULL OR user_id = ?) AND status = 'active'
       ORDER BY (user_id IS NOT NULL) ASC, name ASC`,
      [userId]
    );

    return res.json({
      success: true,
      categories,
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

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const categoryName = name.trim();
    const categoryIcon = icon || 'movie_outlined';
    const categoryColor = color || '#438883';
    const categoryType = (type === 'income' || type === 'expense') ? type : 'both';

    // Insert new category
    const [result] = await pool.execute(
      'INSERT INTO categories (user_id, name, icon, color, type) VALUES (?, ?, ?, ?, ?)',
      [userId, categoryName, categoryIcon, categoryColor, categoryType]
    );

    const newCategory = {
      id: result.insertId,
      user_id: userId,
      name: categoryName,
      icon: categoryIcon,
      color: categoryColor,
      type: categoryType,
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
    const categoryId = req.params.id;
    const { name, icon, color, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
      });
    }

    const categoryName = name.trim();
    const categoryIcon = icon || 'category_rounded';
    const categoryColor = color || '#438883';
    const categoryType = (type === 'income' || type === 'expense') ? type : 'both';

    const [result] = await pool.execute(
      `UPDATE categories 
       SET name = ?, icon = ?, color = ?, type = ? 
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [categoryName, categoryIcon, categoryColor, categoryType, categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category: {
        id: categoryId,
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
        type: categoryType,
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
    const categoryId = req.params.id;

    // Soft delete: set status to 'inactive' so the category is retained in DB but never shown in app
    const [result] = await pool.execute(
      `UPDATE categories 
       SET status = 'inactive' 
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Category status set to inactive. Hidden from app.',
    });
  } catch (error) {
    console.error('[CategoryController.deleteCategory] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.',
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
