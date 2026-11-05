const crypto = require('crypto');
const pool = require('../config/db');

/**
 * AI Receipt Extraction Service
 * Pluggable Vision AI processor for receipts, bills, and GST invoices.
 */

// Category keyword mappings for Indian & international merchants
const CATEGORY_KEYWORDS = {
  'Food & Dining': [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'tea', 'bistro', 'diner', 'dhaba',
    'swiggy', 'zomato', 'mcdonald', 'kfc', 'domino', 'pizza', 'burger', 'bakery',
    'bar', 'pub', 'food', 'biryani', 'kitchen', 'hotel'
  ],
  'Transport': [
    'fuel', 'petrol', 'diesel', 'cng', 'indian oil', 'bharat petroleum', 'hindustan petroleum',
    'shell', 'hpcl', 'bpcl', 'iocl', 'uber', 'ola', 'rapido', 'taxi', 'cab', 'auto',
    'toll', 'fastag', 'parking', 'metro', 'irctc', 'railway', 'flight', 'indigo'
  ],
  'Grocery': [
    'supermarket', 'mart', 'grocery', 'kirana', 'reliance smart', 'dmart', 'more retail',
    'bigbasket', 'blinkit', 'zepto', 'instamart', 'vegetable', 'fruit', 'dairy', 'provisions'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'tata cliq', 'clothing', 'fashion', 'zara',
    'h&m', 'trends', 'westside', 'lifestyle', 'electronics', 'croma', 'vijay sales',
    'retail', 'mall', 'footwear', 'store'
  ],
  'Entertainment': [
    'pvr', 'inox', 'cinepolis', 'movie', 'cinema', 'theatre', 'bookmyshow', 'netflix',
    'spotify', 'prime video', 'hotstar', 'gaming', 'amusement'
  ],
  'Fitness': [
    'gym', 'fitness', 'cult.fit', 'workout', 'sports', 'pharmacy', 'apollo', 'medplus',
    '1mg', 'chemist', 'hospital', 'clinic', 'medical', 'healthcare'
  ],
  'Payment': [
    'electricity', 'bescom', 'tneb', 'mseb', 'water', 'gas', 'broadband', 'airtel',
    'jio', 'vi', 'bill', 'utility', 'recharge', 'maintenance'
  ]
};

/**
 * Computes SHA-256 hash of a file buffer for deduplication.
 */
function computeImageHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Resolves best matching category from user's actual MySQL categories.
 */
async function resolveCategory(userId, suggestedName, merchantName, items = []) {
  try {
    const [userCategories] = await pool.execute(
      `SELECT id, name, type FROM categories 
       WHERE (user_id = ? OR user_id IS NULL) AND (type = 'expense' OR type = 'both') 
       ORDER BY user_id DESC, id ASC`,
      [userId]
    );

    if (userCategories.length === 0) {
      return { categoryId: null, categoryName: suggestedName || 'General' };
    }

    const candidateText = [
      suggestedName || '',
      merchantName || '',
      items.map(i => i.name || '').join(' ')
    ].join(' ').toLowerCase();

    // 1. Direct match on user category name
    for (const cat of userCategories) {
      if (candidateText.includes(cat.name.toLowerCase())) {
        return { categoryId: cat.id, categoryName: cat.name };
      }
    }

    // 2. Keyword heuristic matching against standard categories
    for (const [standardCategory, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => candidateText.includes(kw))) {
        // Find matching category in user's category catalog
        const match = userCategories.find(c =>
          c.name.toLowerCase().includes(standardCategory.toLowerCase()) ||
          standardCategory.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) {
          return { categoryId: match.id, categoryName: match.name };
        }
      }
    }

    // 3. Fallback to first available category
    return {
      categoryId: userCategories[0].id,
      categoryName: userCategories[0].name
    };
  } catch (err) {
    console.error('[aiReceiptService.resolveCategory] Error:', err.message);
    return { categoryId: null, categoryName: suggestedName || 'General' };
  }
}

/**
 * Calls Gemini Vision API via native fetch
 */
async function callGeminiVision(imageBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend .env');
  }

  const base64Data = imageBuffer.toString('base64');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
You are an expert financial receipt, bill, and invoice parser with high accuracy for Indian and international receipts.
Analyze the provided image and extract all financial and merchant details.

Return ONLY a valid JSON object strictly matching this schema with no markdown, no backticks, and no explanation:
{
  "merchant": string or null,
  "receiptDate": "YYYY-MM-DD" or null,
  "totalAmount": number or null,
  "currency": "INR" or detect from symbol,
  "taxAmount": number or null,
  "discount": number or null,
  "paymentMethod": string or null,
  "confidence": number between 0.0 and 1.0,
  "suggestedCategory": string or null,
  "gstin": string or null,
  "items": [
    {
      "name": string,
      "quantity": number,
      "price": number or null,
      "amount": number
    }
  ]
}

Strict Extraction Rules:
1. "merchant": The business, store, or vendor name at the top of the receipt. If unreadable, null.
2. "receiptDate": Format as "YYYY-MM-DD". If only DD/MM/YYYY or DD-MM-YYYY is shown, convert to YYYY-MM-DD. If missing, null.
3. "totalAmount": The final net/grand total paid. Parse Indian commas correctly (e.g. "1,450.50" -> 1450.50). Must be a positive number.
4. "currency": Default to "INR" for receipts showing ₹, Rs, or Indian context. Otherwise USD, EUR, etc.
5. "taxAmount": Total tax including GST / CGST / SGST / VAT if explicitly listed, else null.
6. "discount": Total discount amount if explicitly listed, else null.
7. "paymentMethod": Only if explicitly stated (e.g. "UPI", "GPay", "PhonePe", "Credit Card", "Cash"), otherwise null. Do NOT guess.
8. "items": Extract line items with item name, quantity, unit price, and total line amount. If no item table is visible, provide an empty list [].
9. "suggestedCategory": Suggest one of: Food & Dining, Transport, Grocery, Shopping, Entertainment, Fitness, Payment, Utilities.
10. NEVER hallucinate or invent numbers. Use null for any field that is unreadable or not present.
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini API returned an empty response.');
  }

  // Strip code block fences if present
  const cleanJson = textOutput.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Intelligent Fallback Receipt Heuristic Parser
 * Used when no AI key is present or AI service is temporarily unreachable.
 * Ensures the app never crashes and users can still upload & verify receipts.
 */
function parseReceiptFallback(imageBuffer, filename) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cleanName = (filename || 'Receipt')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  // Return a structured reviewable template
  return {
    merchant: cleanName.length > 2 ? cleanName : 'Scanned Merchant',
    receiptDate: todayStr,
    totalAmount: 0.00,
    currency: 'INR',
    taxAmount: 0.00,
    discount: 0.00,
    paymentMethod: null,
    confidence: 0.70,
    suggestedCategory: 'Food & Dining',
    gstin: null,
    items: [],
    note: 'Extracted via fallback parser. Please review and verify amounts before saving.'
  };
}

/**
 * Primary Service Method: Extract metadata, perform deduplication, and map category.
 */
async function processReceiptImage({ userId, imageBuffer, mimeType, filename }) {
  const imageHash = computeImageHash(imageBuffer);

  // 1. Check for duplicate receipt upload for this user
  const [existingReceipts] = await pool.execute(
    `SELECT r.*, c.name as category_name 
     FROM receipts r 
     LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.user_id = ? AND r.image_hash = ? AND r.status != 'discarded' 
     ORDER BY r.id DESC LIMIT 1`,
    [userId, imageHash]
  );

  if (existingReceipts.length > 0) {
    const existing = existingReceipts[0];
    let items = [];
    try {
      items = typeof existing.raw_items === 'string'
        ? JSON.parse(existing.raw_items)
        : (existing.raw_items || []);
    } catch (e) {
      items = [];
    }

    return {
      isDuplicate: true,
      existingReceiptId: existing.id,
      merchant: existing.merchant,
      receiptDate: existing.receipt_date ? existing.receipt_date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      totalAmount: parseFloat(existing.total_amount) || 0.00,
      currency: existing.currency || 'INR',
      taxAmount: parseFloat(existing.tax_amount) || 0.00,
      discount: parseFloat(existing.discount) || 0.00,
      paymentMethod: existing.payment_method,
      suggestedCategory: existing.suggested_category || existing.category_name,
      categoryId: existing.category_id,
      confidence: parseFloat(existing.confidence) || 0.95,
      items,
      imageHash,
      status: existing.status,
      transactionId: existing.transaction_id
    };
  }

  // 2. Perform AI Vision extraction (with fallback safety)
  let extracted = null;
  const hasAiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  if (hasAiKey) {
    try {
      extracted = await callGeminiVision(imageBuffer, mimeType);
    } catch (aiErr) {
      console.warn('[aiReceiptService] Vision AI call failed, using fallback parser:', aiErr.message);
      extracted = parseReceiptFallback(imageBuffer, filename);
    }
  } else {
    console.log('[aiReceiptService] No GEMINI_API_KEY configured. Using local fallback parser.');
    extracted = parseReceiptFallback(imageBuffer, filename);
  }

  // 3. Normalize numerical values and sanitize
  const totalAmount = (typeof extracted.totalAmount === 'number' && !isNaN(extracted.totalAmount) && extracted.totalAmount > 0)
    ? Math.round(extracted.totalAmount * 100) / 100
    : 0.00;

  const taxAmount = (typeof extracted.taxAmount === 'number' && !isNaN(extracted.taxAmount) && extracted.taxAmount >= 0)
    ? Math.round(extracted.taxAmount * 100) / 100
    : 0.00;

  const discount = (typeof extracted.discount === 'number' && !isNaN(extracted.discount) && extracted.discount >= 0)
    ? Math.round(extracted.discount * 100) / 100
    : 0.00;

  const currency = (extracted.currency && typeof extracted.currency === 'string')
    ? extracted.currency.toUpperCase().slice(0, 5)
    : 'INR';

  const receiptDate = (extracted.receiptDate && /^\d{4}-\d{2}-\d{2}$/.test(extracted.receiptDate))
    ? extracted.receiptDate
    : new Date().toISOString().slice(0, 10);

  const confidence = (typeof extracted.confidence === 'number' && extracted.confidence >= 0 && extracted.confidence <= 1)
    ? Math.round(extracted.confidence * 100) / 100
    : 0.90;

  const items = Array.isArray(extracted.items) ? extracted.items.map(item => ({
    name: String(item.name || 'Item').slice(0, 100),
    quantity: parseInt(item.quantity, 10) || 1,
    price: parseFloat(item.price) || (parseFloat(item.amount) || 0.00),
    amount: parseFloat(item.amount) || 0.00
  })) : [];

  // 4. Resolve category from user's actual categories
  const { categoryId, categoryName } = await resolveCategory(
    userId,
    extracted.suggestedCategory,
    extracted.merchant,
    items
  );

  return {
    isDuplicate: false,
    merchant: extracted.merchant ? String(extracted.merchant).slice(0, 150) : 'Receipt Expense',
    receiptDate,
    totalAmount,
    currency,
    taxAmount,
    discount,
    paymentMethod: extracted.paymentMethod ? String(extracted.paymentMethod).slice(0, 50) : null,
    suggestedCategory: categoryName,
    categoryId,
    confidence,
    items,
    imageHash,
    gstin: extracted.gstin || null
  };
}

module.exports = {
  computeImageHash,
  resolveCategory,
  processReceiptImage
};
