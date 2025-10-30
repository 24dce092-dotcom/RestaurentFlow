import http from 'http';

http.get('http://localhost:5001/api/printers', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try { console.log('Response:', JSON.parse(data)); } catch { console.log(data); }
  });
}).on('error', err => console.error('Error:', err.message));