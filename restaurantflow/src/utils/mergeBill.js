// Simple utility to merge duplicate order items and format a text bill

function validateItem(item) {
  if (!item) return null;
  const name = (item.name || '').trim();
  const quantity = Number(item.quantity || 0);
  // Prefer explicit unitPrice, fallback to price
  let price = item.unitPrice != null ? Number(item.unitPrice) : Number(item.price || 0);
  // As a last resort, if portion is half and basePrice provided, compute 50%
  if ((!price || Number.isNaN(price)) && item.basePrice != null) {
    const base = Number(item.basePrice) || 0;
    if (item.portion === 'half') price = base * 0.7;
    else price = base;
  }
  
  if (!name) return null;
  if (isNaN(quantity) || quantity <= 0) return null;
  if (isNaN(price) || price < 0) return null;
  
  return {
    ...item,
    name,
    quantity,
    price
  };
}

export function mergeItems(items) {
  if (!Array.isArray(items)) return [];

  // First pass: validate items and find highest price for each group (name + portion + customizations)
  const priceByKey = {};
  const validItems = items
    .map(validateItem)
    .filter(item => item !== null);
    
  if (validItems.length === 0) return [];

  const buildGroupKey = (it) => {
    const portion = it?.portion === 'half' ? 'half' : 'full';
    let customRaw = it?.customizations || it?.specialRequest || '';
    // Ensure customRaw is a string before trimming
    if (typeof customRaw !== 'string') {
      customRaw = '';
    }
    const custom = customRaw.trim();
    return `${it.name}|${portion}|${custom}`;
  };

  validItems.forEach(item => {
    const key = buildGroupKey(item);
    if (item.price > (priceByKey[key] || 0)) {
      priceByKey[key] = item.price;
    }
  });

  // Second pass: merge quantities using the highest price seen for each dish
  const groups = {};
  items.forEach(item => {
    const name = (item.name || '').trim();
    if (!name) return; // skip items without a name

    const qty = Number(item.quantity || 0);
    const portion = item?.portion === 'half' ? 'half' : 'full';
    let customRaw = item?.customizations || item?.specialRequest || '';
    if (typeof customRaw !== 'string') {
      customRaw = '';
    }
    const custom = customRaw.trim();
    const groupKey = `${name}|${portion}|${custom}`;
    // Always use the highest price we found for this group
    const price = priceByKey[groupKey];

    if (!groups[groupKey]) {
      groups[groupKey] = {
        ...item,
        name,
        portion,
        customizations: custom,
        quantity: qty,
        price,
        key: groupKey,
        totalAmount: price * qty
      }
    } else {
      // Additional occurrence: add quantity and update total
      groups[groupKey].quantity += qty;
      groups[groupKey].totalAmount = groups[groupKey].price * groups[groupKey].quantity;
    }
  });

  // Filter out invalid items and convert to array
  return Object.values(groups)
    .filter(item => item.quantity > 0 && item.price > 0)  // Remove items with zero/negative quantity/price
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(item => {
      const displayName = item.portion === 'half' ? `${item.name} (Half)` : item.name;
      return {
        ...item,
        name: displayName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        totalAmount: Number(((item.price * item.quantity * 100) | 0) / 100)  // Avoid floating point precision issues
      };
    });
}

function safeRound(amount, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Number(((amount * factor) | 0) / factor);
}

function formatCurrency(amount, locale = 'en-US', currency = 'USD', options = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useGrouping = true // Whether to use thousand separators
  } = options;

  try {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    }).format(safeRound(amount, maximumFractionDigits));
  } catch (error) {
    // Fallback formatting if locale/currency is invalid
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    const rounded = safeRound(abs, maximumFractionDigits);
    return `${sign}${currency}${rounded.toFixed(minimumFractionDigits)}`;
  }
}

export function buildTextBill(items, options = {}) {
  const {
    locale = 'en-US',
    currency = 'USD',
    taxRate = 0.08,
    taxLabel = 'Tax (8%)',
    title = 'Receipt',
    discount = 0,
    discountLabel = 'Discount',
    additionalFees = [],
    notes = [],
    metadata = {}, // Optional metadata like order ID, table number, server name
    showDate = true,
    dateFormat = { 
      dateStyle: 'medium',
      timeStyle: 'short'
    },
    numberFormat = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }
  } = options;
  if (!items?.length) return '';
  
  const lines = [];
  let subtotal = 0;

  // Add header
  // Add title and metadata
  lines.push(title.toUpperCase());
  if (showDate) {
    try {
      lines.push(new Intl.DateTimeFormat(locale, dateFormat).format(new Date()));
    } catch (error) {
      lines.push(new Date().toLocaleString(locale));
    }
  }
  
  // Add metadata if provided
  Object.entries(metadata).forEach(([key, value]) => {
    if (value) lines.push(`${key}: ${value}`);
  });
  
  lines.push('-'.repeat(40));
  lines.push('Item                  Qty    Price    Total');
  lines.push('-'.repeat(40));

  // Add items
  mergeItems(items).forEach(item => {
    const total = item.quantity * item.price;
    subtotal += total;
    lines.push(
      `${item.name.padEnd(20)} ${String(item.quantity).padStart(3)}  ${formatCurrency(item.price).padStart(8)}  ${formatCurrency(total).padStart(8)}`
    );
  });

  // Add totals
  lines.push('-'.repeat(40));
  lines.push(`Subtotal: ${formatCurrency(subtotal, locale, currency).padStart(29)}`);
  
  // Apply discount if any
  if (discount > 0) {
    lines.push(`${discountLabel}: ${formatCurrency(-discount, locale, currency).padStart(29)}`);
    subtotal -= discount;
  }
  
  // Add any additional fees
  let totalFees = 0;
  additionalFees.forEach(fee => {
    const amount = Number(((fee.amount * 100) | 0) / 100);
    totalFees += amount;
    lines.push(`${fee.label}: ${formatCurrency(amount, locale, currency).padStart(31 - fee.label.length)}`);
  });
  
  // Calculate tax on subtotal after discount but including fees
  const taxableAmount = subtotal + totalFees;
  const tax = Number(((taxableAmount * taxRate * 100) | 0) / 100);
  lines.push(`${taxLabel}: ${formatCurrency(tax, locale, currency).padStart(31 - taxLabel.length)}`);
  
  // Calculate final total
  const total = taxableAmount + tax;
  lines.push('-'.repeat(40));
  lines.push(`Total:    ${formatCurrency(total, locale, currency).padStart(29)}`);
  
  // Add any notes at the bottom
  if (notes.length > 0) {
    lines.push('');
    notes.forEach(note => lines.push(note));
  }

  return lines.join('\n');
}
