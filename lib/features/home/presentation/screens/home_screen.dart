import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/routes/app_routes.dart';
import 'package:mono_app/core/widgets/curved_header_painter.dart';
import 'package:mono_app/core/widgets/mono_avatar_image.dart';
import 'package:mono_app/features/auth/bloc/auth_bloc.dart';
import 'package:mono_app/features/auth/bloc/auth_state.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';
import 'package:mono_app/features/expense/models/contact_model.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

class HomeScreen extends StatelessWidget {
  final VoidCallback onAddExpensePressed;

  const HomeScreen({
    super.key,
    required this.onAddExpensePressed,
  });

  void _showQuickTransferDialog(BuildContext context, String recipientName) {
    final amountController = TextEditingController();
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Quick Transfer to $recipientName',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter amount to record transfer:',
              style: GoogleFonts.inter(
                  fontSize: 13, color: const Color(0xFF666666)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                prefixText: '₹ ',
                hintText: '0.00',
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text('Cancel',
                style: GoogleFonts.inter(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () {
              final amount =
                  double.tryParse(amountController.text.trim()) ?? 0.0;
              if (amount <= 0) return;
              Navigator.of(dialogCtx).pop();

              final transaction = TransactionModel(
                id: 'tx_${DateTime.now().millisecondsSinceEpoch}',
                title: 'Transfer to $recipientName',
                category: 'Transfer',
                amount: amount,
                type: TransactionType.expense,
                date: DateTime.now(),
                iconName: 'transfer',
              );
              context.read<ExpenseBloc>().add(AddExpenseEvent(transaction));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                      'Transferred ₹${amount.toStringAsFixed(2)} to $recipientName'),
                  backgroundColor: AppColors.primary,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(
              'Record Transfer',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Top Section with Curved Teal Header and Balance Card
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Header Background
                SizedBox(
                  height: 250,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: CurvedHeaderPainter(
                      gradient: AppColors.splashGradient,
                      showCircles: true,
                    ),
                  ),
                ),

                // Greeting & Profile Avatar
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                    child: BlocBuilder<AuthBloc, AuthState>(
                      builder: (context, state) {
                        String userName = 'User';
                        if (state is Authenticated) {
                          userName = state.user.name;
                        }

                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Good afternoon,',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    color: Colors.white.withOpacity(0.85),
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  userName,
                                  style: GoogleFonts.inter(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                GestureDetector(
                                  onTap: () => Navigator.of(context)
                                      .pushNamed(AppRoutes.aiAssistant),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.22),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.4),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.auto_awesome,
                                            color: Colors.amberAccent,
                                            size: 16),
                                        const SizedBox(width: 4),
                                        Text(
                                          'AI Ask',
                                          style: GoogleFonts.inter(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withOpacity(0.2),
                                    border: Border.all(
                                      color: Colors.white.withOpacity(0.5),
                                      width: 2,
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      userName.trim().isNotEmpty
                                          ? userName
                                              .trim()
                                              .split(' ')
                                              .map((e) =>
                                                  e.isNotEmpty ? e[0] : '')
                                              .take(2)
                                              .join()
                                              .toUpperCase()
                                          : 'U',
                                      style: GoogleFonts.inter(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),

                // Elevated Balance Card (Overlapping header)
                Padding(
                  padding: const EdgeInsets.only(top: 120, left: 24, right: 24),
                  child: BlocBuilder<ExpenseBloc, ExpenseState>(
                    builder: (context, state) {
                      double balance = 0.00;
                      double income = 0.00;
                      double expense = 0.00;

                      if (state is ExpenseLoaded) {
                        balance = state.totalBalance;
                        income = state.totalIncome;
                        expense = state.totalExpense;
                      }

                      return Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFF2F7E79),
                              Color(0xFF205B57),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2F7E79).withOpacity(0.35),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Total Balance Row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Total Balance',
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white.withOpacity(0.9),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.keyboard_arrow_up_rounded,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ],
                                ),
                                const SizedBox.shrink(),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Balance Amount (Dynamic from MySQL)
                            Text(
                              '₹ ${balance.toStringAsFixed(2)}',
                              style: GoogleFonts.inter(
                                fontSize: 30,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Income & Expenses Row (Dynamic from MySQL)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Income Column
                                Row(
                                  children: [
                                    Container(
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.18),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.arrow_downward_rounded,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Income',
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            color:
                                                Colors.white.withOpacity(0.8),
                                          ),
                                        ),
                                        Text(
                                          '₹ ${income.toStringAsFixed(2)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),

                                // Expense Column
                                Row(
                                  children: [
                                    Container(
                                      width: 28,
                                      height: 28,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.18),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.arrow_upward_rounded,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Expenses',
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            color:
                                                Colors.white.withOpacity(0.8),
                                          ),
                                        ),
                                        Text(
                                          '₹ ${expense.toStringAsFixed(2)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // AI Financial Assistant Banner Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: InkWell(
                onTap: () =>
                    Navigator.of(context).pushNamed(AppRoutes.aiAssistant),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFE0F2F1), Color(0xFFF0FDF4)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border:
                        Border.all(color: const Color(0xFF80CBC4), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.auto_awesome,
                            color: Colors.amberAccent, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'AI Financial Assistant',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF004D40),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Get smart spending insights & safe limit',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: const Color(0xFF00796B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded,
                          size: 14, color: Color(0xFF004D40)),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Transactions History Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Transactions History',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF222222),
                  ),
                ),
              ),
            ),

            // Dynamic Transactions List from MySQL
            BlocBuilder<ExpenseBloc, ExpenseState>(
              builder: (context, state) {
                if (state is ExpenseLoaded) {
                  if (state.transactions.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 20),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.receipt_long_outlined,
                                size: 36, color: Colors.grey.shade400),
                            const SizedBox(height: 10),
                            Text(
                              'No transactions recorded yet',
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF333333),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tap the + button below to record your first expense',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: const Color(0xFF888888),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: state.transactions.length.clamp(0, 5),
                    itemBuilder: (context, index) {
                      final item = state.transactions[index];
                      return _buildTransactionTile(context, item);
                    },
                  );
                }
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                );
              },
            ),

            const SizedBox(height: 16),

            // Send Again Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Send Again',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF222222),
                  ),
                ),
              ),
            ),

            // Send Again Dynamic Row (Fetched from MySQL via API)
            BlocBuilder<ExpenseBloc, ExpenseState>(
              builder: (context, expState) {
                return BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, authState) {
                    String? userAvatar;
                    String userName = 'You';
                    if (authState is Authenticated) {
                      userAvatar = authState.user.avatarUrl;
                      userName = authState.user.name;
                    }

                    List<ContactModel> contacts = [];
                    if (expState is ExpenseLoaded) {
                      contacts = expState.sendAgainContacts;
                    }

                    return SizedBox(
                      height: 64,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: contacts.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return _buildSendAgainAvatar(
                              context,
                              userAvatar ?? 'assets/images/avatar_clean.png',
                              userName,
                            );
                          }
                          final contact = contacts[index - 1];
                          return _buildDynamicContactAvatar(
                              context, contact, index - 1);
                        },
                      ),
                    );
                  },
                );
              },
            ),

            const SizedBox(
                height:
                    120), // Bottom padding for navigation bar and center FAB
          ],
        ),
      ),
    );
  }

  Widget _buildSendAgainAvatar(
      BuildContext context, String avatarUrl, String name) {
    final initials = name.trim().isNotEmpty
        ? name
            .trim()
            .split(' ')
            .map((e) => e.isNotEmpty ? e[0] : '')
            .take(2)
            .join()
            .toUpperCase()
        : 'U';
    return GestureDetector(
      onTap: () => _showQuickTransferDialog(context, name),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary.withOpacity(0.12),
            border: Border.all(
                color: AppColors.primary.withOpacity(0.4), width: 1.5),
          ),
          child: Center(
            child: Text(
              initials,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDynamicContactAvatar(
      BuildContext context, ContactModel contact, int index) {
    final pastelColors = [
      Colors.teal.shade400,
      Colors.purple.shade300,
      Colors.blue.shade400,
      Colors.orange.shade400,
      Colors.pink.shade300,
      Colors.indigo.shade300,
    ];
    final color = pastelColors[index % pastelColors.length];

    if (contact.avatarUrl != null && contact.avatarUrl!.isNotEmpty) {
      return GestureDetector(
        onTap: () => _showQuickTransferDialog(context, contact.name),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.grey.shade200, width: 2),
            ),
            child: ClipOval(
              child: MonoAvatarImage(
                avatarUrl: contact.avatarUrl,
                width: 52,
                height: 52,
              ),
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: () => _showQuickTransferDialog(context, contact.name),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withOpacity(0.18),
            border: Border.all(color: color.withOpacity(0.5), width: 1.5),
          ),
          child: Center(
            child: Text(
              contact.computedInitials,
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w700,
                color: color,
                fontSize: 16,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionTile(BuildContext context, TransactionModel item) {
    IconData iconData = Icons.receipt_long_rounded;
    Color iconBg = const Color(0xFFF4F6F6);
    Color iconColor = AppColors.primary;

    final tLower = item.title.toLowerCase();
    final cLower = item.category.toLowerCase();

    if (tLower.contains('upwork') ||
        cLower.contains('freelance') ||
        cLower.contains('work')) {
      iconData = Icons.work_outline_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF2E7D32);
    } else if (tLower.contains('transfer') || cLower.contains('transfer')) {
      iconData = Icons.swap_horiz_rounded;
      iconBg = const Color(0xFFEDE7F6);
      iconColor = const Color(0xFF5E35B1);
    } else if (tLower.contains('paypal') || cLower.contains('payment')) {
      iconData = Icons.payment_rounded;
      iconBg = const Color(0xFFE3F2FD);
      iconColor = const Color(0xFF1565C0);
    } else if (tLower.contains('youtube') ||
        cLower.contains('entertain') ||
        cLower.contains('movie')) {
      iconData = Icons.play_circle_fill_rounded;
      iconBg = const Color(0xFFFFEBEE);
      iconColor = const Color(0xFFC62828);
    } else if (tLower.contains('starbucks') ||
        cLower.contains('coffee') ||
        cLower.contains('food')) {
      iconData = Icons.coffee_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF00704A);
    } else if (cLower.contains('grocer') || cLower.contains('shop')) {
      iconData = Icons.shopping_bag_outlined;
      iconBg = const Color(0xFFFFF3E0);
      iconColor = const Color(0xFFE65100);
    } else if (cLower.contains('music') || tLower.contains('spotify')) {
      iconData = Icons.music_note_rounded;
      iconBg = const Color(0xFFE8F5E9);
      iconColor = const Color(0xFF1DB954);
    }

    final amountColor =
        item.isIncome ? const Color(0xFF25A969) : const Color(0xFFF95B51);

    return InkWell(
      onTap: () => _confirmDeleteTransaction(context, item),
      onLongPress: () => _confirmDeleteTransaction(context, item),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(iconData, color: iconColor, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF222222),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.category,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: const Color(0xFF888888),
                    ),
                  ),
                ],
              ),
            ),
            Text(
              item.formattedAmount,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: amountColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteTransaction(BuildContext context, TransactionModel item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 18),
            Container(
              width: 48,
              height: 48,
              decoration: const BoxDecoration(
                color: Color(0xFFFEE2E2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.delete_outline_rounded,
                  color: Color(0xFFDC2626), size: 26),
            ),
            const SizedBox(height: 14),
            Text(
              'Delete Transaction?',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF222222),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Do you want to delete "${item.title}" (${item.formattedAmount})? This will update your balance and statistics.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: const Color(0xFF666666),
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.grey.shade300),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF444444),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(sheetCtx).pop();
                      context
                          .read<ExpenseBloc>()
                          .add(DeleteTransactionEvent(item.id));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Deleted "${item.title}"'),
                          backgroundColor: AppColors.primary,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      'Delete',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
