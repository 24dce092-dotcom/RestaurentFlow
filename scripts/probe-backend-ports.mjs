import axios from 'axios';

const ports = [5001, 5002, 5003];

(async function run() {
  for (const p of ports) {
    try {
      process.stdout.write(`Trying ${p}... `);
      const r = await axios.get(`http://localhost:${p}/api/bills`, { timeout: 2000 });
      console.log('OK', r.status);
    } catch (e) {
      console.log('ERR', e.message);
    }
  }
})();
