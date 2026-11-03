import 'package:flutter/material.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/features/home/presentation/screens/home_screen.dart';
import 'package:mono_app/features/statistics/presentation/screens/statistics_screen.dart';
import 'package:mono_app/features/categories/presentation/screens/categories_screen.dart';
import 'package:mono_app/features/add_expense/presentation/screens/add_expense_screen.dart';
import 'package:mono_app/features/profile/presentation/screens/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  void _onAddExpensePressed() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const AddExpenseScreen(),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onAddExpensePressed: _onAddExpensePressed),
      const StatisticsScreen(),
      const CategoriesScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.buttonGradient,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          onPressed: _onAddExpensePressed,
          elevation: 0,
          backgroundColor: Colors.transparent,
          child: const Icon(
            Icons.add,
            color: Colors.white,
            size: 30,
          ),
        ),
      ),
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        color: Colors.white,
        elevation: 16,
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: 60,
          child: Row(
            children: [
              // Home Tab
              Expanded(
                child: _buildNavItem(
                  index: 0,
                  icon: Icons.home_rounded,
                  label: 'Home',
                ),
              ),

              // Statistics Tab
              Expanded(
                child: _buildNavItem(
                  index: 1,
                  icon: Icons.bar_chart_rounded,
                  label: 'Statistics',
                ),
              ),

              // Center Docked Floating Action Button notch spacing
              const SizedBox(width: 56),

              // Categories Tab (Fills the blank space dynamically!)
              Expanded(
                child: _buildNavItem(
                  index: 2,
                  icon: Icons.grid_view_rounded,
                  label: 'Categories',
                ),
              ),

              // Profile Tab
              Expanded(
                child: _buildNavItem(
                  index: 3,
                  icon: Icons.person_outline_rounded,
                  label: 'Profile',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? AppColors.primary : const Color(0xFFAAAAAA);

    return InkWell(
      onTap: () {
        setState(() {
          _currentIndex = index;
        });
      },
      borderRadius: BorderRadius.circular(16),
      child: Center(
        child: Icon(
          icon,
          color: color,
          size: 28,
        ),
      ),
    );
  }
}
