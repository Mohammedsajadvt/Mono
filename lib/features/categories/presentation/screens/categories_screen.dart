import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/widgets/curved_header_painter.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddCategorySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) => _CreateCategorySheet(
        onSave: (newCategory) {
          context.read<ExpenseBloc>().add(AddCategoryEvent(newCategory));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Created "${newCategory.name}" successfully'),
              backgroundColor: AppColors.primary,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Top Curved Teal Header
            Stack(
              clipBehavior: Clip.none,
              children: [
                SizedBox(
                  height: 220,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: CurvedHeaderPainter(
                      gradient: AppColors.splashGradient,
                      showCircles: true,
                    ),
                  ),
                ),

                // Header Title & Actions
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Categories',
                              style: GoogleFonts.inter(
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            IconButton(
                              onPressed: () => _showAddCategorySheet(context),
                              icon: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: const Color(0x30FFFFFF),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.add,
                                    color: Colors.white, size: 22),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // Search & Filter Card (Overlapping header)
                Padding(
                  padding: const EdgeInsets.only(top: 130, left: 20, right: 20),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    child: TextField(
                      controller: _searchController,
                      textAlign: TextAlign.start,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: const Color(0xFF222222),
                        fontWeight: FontWeight.w500,
                      ),
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val.trim().toLowerCase();
                        });
                      },
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        prefixIcon: const Icon(
                          Icons.search,
                          color: AppColors.primary,
                          size: 22,
                        ),
                        hintText: 'Search expense name...',
                        hintStyle: GoogleFonts.inter(
                          color: const Color(0xFFAAAAAA),
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            vertical: 14, horizontal: 8),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                              )
                            : null,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Content Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: BlocBuilder<ExpenseBloc, ExpenseState>(
                builder: (context, state) {
                  if (state is ExpenseLoading) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: AppColors.primary,
                        ),
                      ),
                    );
                  }

                  List<CategoryModel> categories = [];
                  if (state is ExpenseLoaded) {
                    categories = state.categories;
                  }

                  if (_searchQuery.isNotEmpty) {
                    categories = categories
                        .where(
                            (c) => c.name.toLowerCase().contains(_searchQuery))
                        .toList();
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'All Categories (${categories.length})',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF222222),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => _showAddCategorySheet(context),
                            icon: const Icon(Icons.add_circle_outline,
                                size: 18, color: AppColors.primary),
                            label: Text(
                              'Add New',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (categories.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.category_outlined,
                                  size: 48, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              Text(
                                'No categories found',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF444444),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Tap "Add New" to create an expense name',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: const Color(0xFF888888),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: categories.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final category = categories[index];
                            return _buildCategoryCard(context, category);
                          },
                        ),
                      const SizedBox(height: 100),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCard(BuildContext context, CategoryModel category) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          // Icon Container
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: category.color.withOpacity(0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              category.icon,
              color: category.color,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),

          // Name and Label
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  category.name,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF222222),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Expense item',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: const Color(0xFF888888),
                  ),
                ),
              ],
            ),
          ),

          // Delete Button
          IconButton(
            icon: Icon(Icons.delete_outline_rounded,
                color: Colors.grey.shade400, size: 20),
            onPressed: () {
              context.read<ExpenseBloc>().add(DeleteCategoryEvent(category.id));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Removed "${category.name}"'),
                  backgroundColor: Colors.black87,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CreateCategorySheet extends StatefulWidget {
  final ValueChanged<CategoryModel> onSave;

  const _CreateCategorySheet({required this.onSave});

  @override
  State<_CreateCategorySheet> createState() => _CreateCategorySheetState();
}

class _CreateCategorySheetState extends State<_CreateCategorySheet> {
  final _nameController = TextEditingController();
  int _selectedIconIndex = 0;
  int _selectedColorIndex = 0;

  final List<IconData> _icons = const [
    Icons.movie_outlined,
    Icons.coffee_rounded,
    Icons.shopping_bag_outlined,
    Icons.swap_horiz_rounded,
    Icons.payment_rounded,
    Icons.play_circle_fill,
    Icons.music_note_rounded,
    Icons.bolt_rounded,
    Icons.restaurant_rounded,
    Icons.directions_car_rounded,
    Icons.fitness_center_rounded,
    Icons.home_outlined,
    Icons.flight_takeoff_rounded,
    Icons.school_outlined,
    Icons.local_hospital_outlined,
    Icons.card_giftcard_rounded,
  ];

  final List<Color> _colors = const [
    Color(0xFF438883), // Teal (Brand)
    Color(0xFFE50914), // Red
    Color(0xFF00704A), // Green
    Color(0xFFFFA000), // Amber
    Color(0xFF7B1FA2), // Purple
    Color(0xFF0079C1), // Blue
    Color(0xFFE91E63), // Pink
    Color(0xFF3F51B5), // Indigo
  ];

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _onSavePressed() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a category name'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final newCategory = CategoryModel(
      id: 'cat_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      icon: _icons[_selectedIconIndex],
      color: _colors[_selectedColorIndex],
    );

    widget.onSave(newCategory);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 24,
        left: 24,
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Header Title
            Text(
              'Create Expense Name',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF222222),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'This name will appear in your Add Expense dropdown',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: const Color(0xFF888888),
              ),
            ),
            const SizedBox(height: 20),

            // Name Input (with 'Enter Name' label per user instruction!)
            Text(
              'NAME',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _nameController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Enter Name',
                hintStyle: GoogleFonts.inter(color: Colors.grey.shade400),
                prefixIcon: Icon(
                  _icons[_selectedIconIndex],
                  color: _colors[_selectedColorIndex],
                ),
                filled: true,
                fillColor: const Color(0xFFF9FAFB),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide:
                      const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Select Icon
            Text(
              'CHOOSE ICON',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 52,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _icons.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final isSelected = _selectedIconIndex == i;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedIconIndex = i;
                      });
                    },
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? _colors[_selectedColorIndex].withOpacity(0.18)
                            : const Color(0xFFF4F5F7),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? _colors[_selectedColorIndex]
                              : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        _icons[i],
                        color: isSelected
                            ? _colors[_selectedColorIndex]
                            : const Color(0xFF666666),
                        size: 22,
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),

            // Select Color
            Text(
              'CHOOSE COLOR',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _colors.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, i) {
                  final isSelected = _selectedColorIndex == i;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedColorIndex = i;
                      });
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _colors[i],
                        shape: BoxShape.circle,
                        border: Border.all(
                          color:
                              isSelected ? Colors.black87 : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                      child: isSelected
                          ? const Icon(Icons.check,
                              color: Colors.white, size: 20)
                          : null,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 28),

            // Save Button
            SizedBox(
              width: double.infinity,
              height: 54,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppColors.buttonGradient,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: const [
                    BoxShadow(
                      color: AppColors.buttonShadow,
                      blurRadius: 14,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: _onSavePressed,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: Text(
                    'Save Category',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
