import http from 'http';

// First get bills to find a valid ID
const getBills = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/bills',
      method: 'GET'
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Test PATCH endpoint
const testPatch = async (billId, payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/bills/${billId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`PATCH STATUS: ${res.statusCode}`);
        console.log('PATCH RESPONSE:', responseData);
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

// Test the save functionality
(async () => {
  try {
    console.log('Getting bills...');
    const bills = await getBills();
    
    if (bills.length === 0) {
      console.log('No bills found to test with');
      return;
    }
    
    const testBill = bills[0];
    console.log(`Testing with bill ID: ${testBill._id}`);
    console.log(`Original items:`, testBill.items.slice(0, 2));
    
    // Test payload - modify first item price
    const testPayload = {
      items: testBill.items.map((item, idx) => ({
        ...item,
        price: idx === 0 ? (item.price + 1) : item.price // Increment first item price by 1
      })),
      editedBy: 'test-user'
    };
    
    console.log('Testing PATCH with payload:', { 
      itemCount: testPayload.items.length,
      firstItemPrice: testPayload.items[0].price,
      editedBy: testPayload.editedBy
    });
    
    const result = await testPatch(testBill._id, testPayload);
    console.log('PATCH successful! Updated bill totalAmount:', result.totalAmount);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
})();