(async () => {
  const { buildTextBill } = await import('../src/utils/mergeBill.js');

  const sample = [
    { id: '1', name: 'Sample Dish 1', price: 14.0, quantity: 2 },
    { id: '2', name: 'Sample Dish 2', price: 9.0, quantity: 1 },
    { id: '1', name: 'Sample Dish 1', price: 14.0, quantity: 3 }
  ];

  console.log(buildTextBill(sample));
})();
