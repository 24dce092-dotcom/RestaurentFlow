import { mergeItems, buildTextBill } from '../src/utils/mergeBill.js';

function assertEqual(a, b, message) {
  if (a !== b) {
    console.error('Assertion failed:', message, a, '!==', b);
    process.exitCode = 1;
  }
}

const items = [
  { menuItemId: 'm1', name: 'Sample Dish 1', quantity: 2, price: 14 },
  { menuItemId: 'm2', name: 'Sample Dish 2', quantity: 1, price: 9 },
  // same dish ordered later
  { menuItemId: 'm1', name: 'Sample Dish 1', quantity: 3, price: 14 },
];

const merged = mergeItems(items);
console.log('Merged items:', merged);

assertEqual(merged.length, 2, 'should merge sample dish 1 into single item');
const dish1 = merged.find(x => x.menuItemId === 'm1' || (x.name && x.name.toLowerCase().includes('sample dish 1')));
assertEqual(dish1.quantity, 5, 'quantity should be 5');
assertEqual(Math.round(dish1.totalAmount), 70, 'totalAmount should be 70');

const bill = buildTextBill(items);
console.log('\nText bill:\n', bill);

console.log('\nAll tests ran (exit code may be non-zero if assertion failed).');
