import { mergeItems, buildTextBill } from '../restaurantflow/src/utils/mergeBill.js';

// Test data with some edge cases
const items = [
  { name: "Burger", quantity: 2, price: 10 },
  { name: "Fries", quantity: 1, price: 5 },
  { name: "Burger", quantity: 1, price: 12 }, // Same item with higher price
  { name: "Cola", quantity: 3, price: 3 },
  { name: "Invalid Item", quantity: 0, price: 10 }, // Should be filtered out (zero quantity)
  { name: "Free Item", quantity: 1, price: 0 }, // Should be filtered out (zero price)
  { name: "", quantity: 1, price: 5 }, // Should be filtered out (empty name)
  { name: "Bad Data", quantity: "invalid", price: "NaN" }, // Should be filtered out (invalid numbers)
  { name: "Expensive Item", quantity: 1, price: 1000000 } // Test large number formatting
];

// Test mergeItems function
console.log('\nTesting mergeItems:');
const mergedItems = mergeItems(items);
console.log(JSON.stringify(mergedItems, null, 2));

// Test buildTextBill function with default options
console.log('\nTesting buildTextBill (default options):');
console.log(buildTextBill(items));

// Test buildTextBill function with all features
console.log('\nTesting buildTextBill (all features):');
console.log(buildTextBill(items, {
  locale: 'en-GB',
  currency: 'GBP',
  taxRate: 0.20,
  taxLabel: 'VAT (20%)',
  title: 'Sales Receipt',
  discount: 5.00,
  discountLabel: 'Member Discount',
  additionalFees: [
    { label: 'Service Charge (10%)', amount: 5.00 },
    { label: 'Delivery Fee', amount: 3.50 }
  ],
  metadata: {
    'Order ID': 'RF-2025-1002-123',
    'Table': '15',
    'Server': 'John Smith'
  },
  dateFormat: {
    dateStyle: 'full',
    timeStyle: 'medium'
  },
  numberFormat: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  },
  notes: [
    'Thank you for your business!',
    'Follow us on social media @restaurantflow',
    '*Prices include VAT where applicable'
  ]
}));

// Test error handling with invalid locale/currency
console.log('\nTesting error handling (invalid locale/currency):');
console.log(buildTextBill(items, {
  locale: 'invalid',
  currency: 'INVALID',
  title: 'Test Invalid Locale'
}));