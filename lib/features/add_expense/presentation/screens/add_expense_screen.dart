import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:mono_app/core/constants/app_colors.dart';
import 'package:mono_app/core/widgets/curved_header_painter.dart';
import 'package:mono_app/features/categories/models/category_model.dart';
import 'package:mono_app/features/expense/bloc/expense_bloc.dart';
import 'package:mono_app/features/expense/bloc/expense_event.dart';
import 'package:mono_app/features/expense/bloc/expense_state.dart';
import 'package:mono_app/features/expense/models/transaction_model.dart';

class AddExpenseScreen extends StatefulWidget {
  final TransactionModel? initialTransaction;

  const AddExpenseScreen({super.key, this.initialTransaction});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  late bool _isIncome;
  String? _selectedCategory;
  late String _amount;
  late DateTime _selectedDate;
  late final TextEditingController _titleController;

  @override
  void initState() {
    super.initState();
    final init = widget.initialTransaction;
    if (init != null) {
      _isIncome = init.isIncome;
      _selectedCategory = init.category;
      _amount = init.amount.toStringAsFixed(2);
      _selectedDate = init.date;
      _titleController = TextEditingController(text: init.title);
    } else {
      _isIncome = false;
      _selectedCategory = null;
      _amount = '0.00';
      _selectedDate = DateTime.now();
      _titleController = TextEditingController();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  void _onKeypadTap(String value) {
    setState(() {
      if (value == 'clear') {
        _amount = '0.00';
      } else if (value == 'backspace') {
        if (_amount.length > 1) {
          _amount = _amount.substring(0, _amount.length - 1);
        } else {
          _amount = '0';
        }
      } else if (value == '.') {
        if (_amount == '0' || _amount == '0.00') {
          _amount = '0.';
        } else if (!_amount.contains('.')) {
          _amount += '.';
        }
      } else {
        if (_amount == '0' || _amount == '0.00') {
          _amount = value;
        } else {
          if (_amount.contains('.')) {
            final parts = _amount.split('.');
            if (parts.length > 1 && parts[1].length >= 2) {
              return;
            }
          }
          _amount += value;
        }
      }
    });
  }

  void _onSaveTransaction() {
    final parsedAmount = double.tryParse(_amount) ?? 0.0;
    if (parsedAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded,
                  color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Please enter an amount greater than ₹0',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFF95B51),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final catName = _selectedCategory ?? (_isIncome ? 'Salary' : 'General');
    final enteredTitle = _titleController.text.trim();
    final txTitle = enteredTitle.isNotEmpty ? enteredTitle : catName;

    final isEditing = widget.initialTransaction != null;

    final transaction = TransactionModel(
      id: isEditing
          ? widget.initialTransaction!.id
          : 'tx_${DateTime.now().millisecondsSinceEpoch}',
      title: txTitle,
      category: catName,
      amount: parsedAmount,
      type: _isIncome ? TransactionType.income : TransactionType.expense,
      date: _selectedDate,
      iconName: catName.toLowerCase(),
    );

    if (isEditing) {
      context.read<ExpenseBloc>().add(UpdateTransactionEvent(transaction));
    } else {
      context.read<ExpenseBloc>().add(AddExpenseEvent(transaction));
    }

    final prefix = _isIncome ? '+ ₹' : '- ₹';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isEditing
              ? 'Updated Transaction: ${transaction.title} ($prefix${parsedAmount.toStringAsFixed(2)})'
              : 'Added ${_isIncome ? "Income" : "Expense"}: $prefix${parsedAmount.toStringAsFixed(2)} for ${transaction.title}',
        ),
        backgroundColor:
            _isIncome ? const Color(0xFF16A34A) : AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  Widget _buildIncomeChip(String label, String defaultTitle, String category) {
    final isSelected = _selectedCategory == category;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCategory = category;
          _titleController.text = defaultTitle;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF16A34A).withOpacity(0.12)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF16A34A) : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isSelected
                ? const Color(0xFF16A34A)
                : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formattedDate = DateFormat('EEE, d MMM yyyy').format(_selectedDate);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Top Section with Curved Teal Header
            Stack(
              clipBehavior: Clip.none,
              children: [
                SizedBox(
                  height: 240,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: CurvedHeaderPainter(
                      gradient: _isIncome
                          ? const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF16A34A), Color(0xFF15803D)],
                            )
                          : AppColors.splashGradient,
                      showCircles: true,
                    ),
                  ),
                ),

                // AppBar Row
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          onPressed: () {
                            if (Navigator.of(context).canPop()) {
                              Navigator.of(context).pop();
                            }
                          },
                          icon: const Icon(Icons.arrow_back_ios_new,
                              color: Colors.white, size: 20),
                        ),
                        Text(
                          widget.initialTransaction != null
                              ? 'Edit Transaction'
                              : (_isIncome ? 'Add Income' : 'Add Expense'),
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 48),
                      ],
                    ),
                  ),
                ),

                // Form Card Overlapping Header
                Padding(
                  padding: const EdgeInsets.only(top: 105, left: 24, right: 24),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Segmented Control: [ Expense | Income ]
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.all(4),
                          child: Row(
                            children: [
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _isIncome = false;
                                      _selectedCategory = null;
                                      _titleController.clear();
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10),
                                    decoration: BoxDecoration(
                                      color: !_isIncome
                                          ? Colors.white
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                      boxShadow: !_isIncome
                                          ? [
                                              BoxShadow(
                                                color: Colors.black
                                                    .withOpacity(0.06),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              )
                                            ]
                                          : null,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.arrow_upward_rounded,
                                          size: 16,
                                          color: !_isIncome
                                              ? const Color(0xFFF95B51)
                                              : Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Expense',
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: !_isIncome
                                              ? const Color(0xFF1E293B)
                                              : Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _isIncome = true;
                                      _selectedCategory = 'Salary';
                                      _titleController.text = 'Salary Credit';
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _isIncome
                                          ? Colors.white
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(10),
                                      boxShadow: _isIncome
                                          ? [
                                              BoxShadow(
                                                color: Colors.black
                                                    .withOpacity(0.06),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              )
                                            ]
                                          : null,
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.arrow_downward_rounded,
                                          size: 16,
                                          color: _isIncome
                                              ? const Color(0xFF16A34A)
                                              : Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Income',
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: _isIncome
                                                ? const Color(0xFF16A34A)
                                                : Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Quick Salary & Credits chips for Income
                        if (_isIncome) ...[
                          const SizedBox(height: 16),
                          Text(
                            'QUICK SALARY & CREDITS',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF888888),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildIncomeChip('💼 Salary', 'Salary Credit', 'Salary'),
                                _buildIncomeChip('💳 Bonus', 'Performance Bonus', 'Credits & Bonus'),
                                _buildIncomeChip('💻 Freelance', 'Freelance Project', 'Freelance'),
                                _buildIncomeChip('📈 Investments', 'Mutual Fund Return', 'Investments'),
                                _buildIncomeChip('🏢 Business', 'Business Revenue', 'Business'),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 16),

                        // Title / Description
                        Text(
                          _isIncome ? 'INCOME TITLE' : 'TITLE / DESCRIPTION',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF888888),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _titleController,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF222222),
                          ),
                          decoration: InputDecoration(
                            hintText: _isIncome
                                ? 'e.g. Monthly Salary Credit, TCS Salary'
                                : 'e.g. Starbucks, Grocery Shopping',
                            hintStyle: GoogleFonts.inter(
                              fontSize: 13,
                              color: Colors.grey.shade400,
                            ),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                  color: _isIncome
                                      ? const Color(0xFF16A34A)
                                      : AppColors.primary),
                            ),
                          ),
                        ),

                        const SizedBox(height: 16),

                        // CATEGORY Selector
                        Text(
                          'CATEGORY',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF888888),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        BlocBuilder<ExpenseBloc, ExpenseState>(
                          builder: (context, state) {
                            List<CategoryModel> categories = [];
                            if (state is ExpenseLoaded) {
                              categories = state.categories;
                            }

                            if (categories.isEmpty) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: Text(
                                  'Loading categories from server...',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                              );
                            }

                            // Filter categories according to active mode
                            final filteredCategories = categories.where((c) {
                              if (_isIncome) {
                                return c.isIncome;
                              } else {
                                return c.isExpense;
                              }
                            }).toList();

                            final activeCategories = filteredCategories.isNotEmpty
                                ? filteredCategories
                                : categories;

                            final hasCurrent = activeCategories
                                .any((c) => c.name == _selectedCategory);
                            if (!hasCurrent && activeCategories.isNotEmpty) {
                              _selectedCategory = activeCategories.first.name;
                            }

                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedCategory,
                                  isExpanded: true,
                                  icon: const Icon(
                                      Icons.keyboard_arrow_down_rounded,
                                      color: Color(0xFF666666)),
                                  items: activeCategories.map((c) {
                                    return DropdownMenuItem<String>(
                                      value: c.name,
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 32,
                                            height: 32,
                                            decoration: BoxDecoration(
                                              color: c.color.withOpacity(0.15),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Icon(c.icon,
                                                color: c.color, size: 18),
                                          ),
                                          const SizedBox(width: 12),
                                          Text(
                                            c.name,
                                            style: GoogleFonts.inter(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                              color: const Color(0xFF222222),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        _selectedCategory = val;
                                      });
                                    }
                                  },
                                ),
                              ),
                            );
                          },
                        ),

                        const SizedBox(height: 16),

                        // AMOUNT Input
                        Text(
                          'AMOUNT',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF888888),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: _isIncome
                                    ? const Color(0xFF16A34A)
                                    : AppColors.primary,
                                width: 1.5),
                          ),
                          child: Row(
                            children: [
                              Text(
                                '${_isIncome ? "+ " : ""}₹ $_amount',
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: _isIncome
                                      ? const Color(0xFF16A34A)
                                      : AppColors.primary,
                                ),
                              ),
                              const Spacer(),
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _amount = '0.00';
                                  });
                                },
                                child: Text(
                                  'Clear',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF666666),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // DATE Selector
                        Text(
                          'DATE',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF888888),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime(2020),
                              lastDate: DateTime(2030),
                            );
                            if (picked != null) {
                              setState(() {
                                _selectedDate = picked;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                Text(
                                  formattedDate,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF222222),
                                  ),
                                ),
                                const Spacer(),
                                const Icon(
                                  Icons.calendar_month_rounded,
                                  color: Color(0xFF666666),
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Number Keypad
            Container(
              color: const Color(0xFFECEFF1),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                children: [
                  _buildKeypadRow(['1', '2', '3'], [' ', 'ABC', 'DEF']),
                  const SizedBox(height: 8),
                  _buildKeypadRow(['4', '5', '6'], ['GHI', 'JKL', 'MNO']),
                  const SizedBox(height: 8),
                  _buildKeypadRow(['7', '8', '9'], ['PQRS', 'TUV', 'WXYZ']),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildKeypadButton(
                          child: Text(
                            '.',
                            style: GoogleFonts.inter(
                              fontSize: 26,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF222222),
                            ),
                          ),
                          onTap: () => _onKeypadTap('.'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildKeypadButton(
                          child: const Text('0',
                              style: TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.bold)),
                          onTap: () => _onKeypadTap('0'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildKeypadButton(
                          child: const Icon(Icons.backspace_outlined, size: 20),
                          onTap: () => _onKeypadTap('backspace'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Save CTA Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: _isIncome
                        ? const LinearGradient(
                            colors: [Color(0xFF16A34A), Color(0xFF15803D)],
                          )
                        : AppColors.buttonGradient,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: _isIncome
                            ? const Color(0xFF16A34A).withOpacity(0.3)
                            : AppColors.buttonShadow,
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _onSaveTransaction,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                    ),
                    child: Text(
                      widget.initialTransaction != null
                          ? 'Save Changes'
                          : (_isIncome ? 'Save Income' : 'Save Expense'),
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> digits, List<String> subtitles) {
    return Row(
      children: List.generate(3, (i) {
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(left: i == 0 ? 0 : 4, right: i == 2 ? 0 : 4),
            child: _buildKeypadButton(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    digits[i],
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF222222),
                    ),
                  ),
                  Text(
                    subtitles[i],
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF888888),
                    ),
                  ),
                ],
              ),
              onTap: () => _onKeypadTap(digits[i]),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildKeypadButton({required Widget child, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
        ),
        height: 48,
        child: Center(child: child),
      ),
    );
  }
}
