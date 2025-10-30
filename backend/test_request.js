import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/bills',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('BODY:', data));
});

req.on('error', err => console.error('ERR:', err.message));
req.end();
