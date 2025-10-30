// Test frontend proxy connection to backend
fetch('/api/bills')
  .then(response => {
    console.log('Proxy test - Status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  })
  .then(data => {
    console.log('Proxy test - Success! Got', data.length, 'bills');
    
    // Test PATCH with first bill
    if (data.length > 0) {
      const testBill = data[0];
      console.log('Testing PATCH with bill:', testBill._id);
      
      const testPayload = {
        items: testBill.items.map((item, idx) => ({
          ...item,
          price: idx === 0 ? (item.price + 0.01) : item.price
        })),
        editedBy: 'frontend-test'
      };
      
      return fetch(`/api/bills/${testBill._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
    }
  })
  .then(response => {
    if (response) {
      console.log('PATCH test - Status:', response.status);
      return response.json();
    }
  })
  .then(result => {
    if (result) {
      console.log('PATCH test - Success! New total:', result.totalAmount);
    }
  })
  .catch(error => {
    console.error('Proxy test failed:', error);
  });