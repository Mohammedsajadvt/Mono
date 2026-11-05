/**
 * Server-Side Validation Utilities for Mono
 * Centralized, strict, type-safe validation for all API inputs.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;
const OTP_REGEX = /^\d{6}$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Validates an email address.
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 150) {
    return { valid: false, error: 'Email address must be between 5 and 150 characters.' };
  }
  if (!EMAIL_REGEX.test(clean)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates a password.
 */
function validatePassword(password, fieldName = 'Password') {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: `${fieldName} is required.` };
  }
  if (password.length < 6) {
    return { valid: false, error: `${fieldName} must be at least 6 characters long.` };
  }
  if (password.length > 128) {
    return { valid: false, error: `${fieldName} cannot exceed 128 characters.` };
  }
  return { valid: true, sanitized: password };
}

/**
 * Validates an administrator username.
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 50) {
    return { valid: false, error: 'Username must be between 3 and 50 characters long.' };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return { valid: false, error: 'Username can only contain alphanumeric characters, underscores, hyphens, and periods.' };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates a user display name.
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required.' };
  }
  const clean = name.trim();
  if (clean.length < 1 || clean.length > 100) {
    return { valid: false, error: 'Name must be between 1 and 100 characters long.' };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates a 6-digit confirmation/OTP code.
 */
function validateOtp(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'A 6-digit verification code is required.' };
  }
  const clean = code.trim();
  if (!OTP_REGEX.test(clean)) {
    return { valid: false, error: 'Verification code must be exactly 6 numeric digits.' };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates a financial transaction amount.
 */
function validateAmount(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return { valid: false, error: 'Amount is required.' };
  }
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Amount must be a valid number.' };
  }
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero.' };
  }
  if (num > 1000000000) {
    return { valid: false, error: 'Amount cannot exceed 1,000,000,000.' };
  }
  // Standardize to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, value: rounded };
}

/**
 * Validates a date string in YYYY-MM-DD format.
 */
function validateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { valid: false, error: 'Date is required.' };
  }
  const clean = dateStr.trim();
  if (!DATE_REGEX.test(clean)) {
    return { valid: false, error: 'Date must be formatted as YYYY-MM-DD.' };
  }
  const [year, month, day] = clean.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { valid: false, error: 'Please provide a valid calendar date.' };
  }
  return { valid: true, sanitized: clean };
}

/**
 * Validates transaction type.
 */
function validateTransactionType(type) {
  if (!type || typeof type !== 'string') {
    return { valid: true, value: 'expense' };
  }
  const clean = type.trim().toLowerCase();
  if (clean === 'income' || clean === 'expense') {
    return { valid: true, value: clean };
  }
  return { valid: false, error: "Transaction type must be 'income' or 'expense'." };
}

/**
 * Validates category type.
 */
function validateCategoryType(type) {
  if (!type || typeof type !== 'string') {
    return { valid: true, value: 'both' };
  }
  const clean = type.trim().toLowerCase();
  if (clean === 'income' || clean === 'expense' || clean === 'both') {
    return { valid: true, value: clean };
  }
  return { valid: false, error: "Category type must be 'income', 'expense', or 'both'." };
}

/**
 * Validates a hex color code.
 */
function validateHexColor(color, defaultColor = '#438883') {
  if (!color || typeof color !== 'string') {
    return { valid: true, value: defaultColor };
  }
  const clean = color.trim();
  if (HEX_COLOR_REGEX.test(clean)) {
    return { valid: true, value: clean };
  }
  return { valid: true, value: defaultColor };
}

/**
 * Validates an integer ID parameter.
 */
function validateId(id, fieldName = 'ID') {
  const num = parseInt(id, 10);
  if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    return { valid: false, error: `Invalid ${fieldName}: must be a positive integer.` };
  }
  return { valid: true, value: num };
}

/**
 * Validates and sanitizes a general text string.
 */
function validateString(val, fieldName, maxLen = 255, required = false) {
  if (val === undefined || val === null || val === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required.` };
    }
    return { valid: true, sanitized: null };
  }
  if (typeof val !== 'string') {
    return { valid: false, error: `${fieldName} must be a text string.` };
  }
  const clean = val.trim();
  if (required && clean.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty.` };
  }
  if (clean.length > maxLen) {
    return { valid: false, error: `${fieldName} cannot exceed ${maxLen} characters.` };
  }
  return { valid: true, sanitized: clean };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validateOtp,
  validateAmount,
  validateDate,
  validateTransactionType,
  validateCategoryType,
  validateHexColor,
  validateId,
  validateString,
};
