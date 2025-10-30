import axios from 'axios';

const BASE = process.env.BASE || 'http://localhost:5002/api';

async function run() {
  try {
    console.log('Trying to GET /bills');
    const res = await axios.get(`${BASE}/bills`, { timeout: 3000 });
    console.log('GET /bills status', res.status);
    console.log('Sample bills (first 2):', (res.data || []).slice(0,2));
  } catch (err) {
    console.error('GET /bills failed:', err.message);
  }

  // Try to create a sample bill by POSTing via the existing bills route using a fake orderId
  try {
    console.log('Attempting to POST /bills via orderId (may fail if Order not present)');
    const postRes = await axios.post(`${BASE}/bills`, { orderId: '000000000000000000000000' }, { timeout: 3000 });
    console.log('POST /bills created:', postRes.data);
  } catch (err) {
    console.error('POST /bills failed (expected if order missing or Mongo not available):', err.message);
  }

  // Attempt to PATCH a bill id if available
  try {
    const billsRes = await axios.get(`${BASE}/bills`, { timeout: 3000 });
    const first = (billsRes.data || [])[0];
    if (!first) {
      console.log('No bills to PATCH (create a bill first via the app).');
      return;
    }
    console.log('Patching first bill id', first._id || first.id);
    const id = first._id || first.id;
    const items = (first.items || []).map((it, idx) => ({ ...it, price: (it.price || 0) + 1 }));
    const patchRes = await axios.patch(`${BASE}/bills/${id}`, { items, editedBy: 'integration-test' }, { timeout: 3000 });
    console.log('PATCH result:', patchRes.status, patchRes.data);
  } catch (err) {
    console.error('PATCH attempt failed:', err.message);
  }
}

run().then(()=>process.exit(0));
