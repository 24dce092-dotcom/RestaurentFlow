import http from 'http';

function request(method, path) {
  return new Promise((resolve, reject) => {
    const opts = { method, host: 'localhost', port: 5001, path };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let parsed = body;
        try { parsed = JSON.parse(body); } catch {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('--- GET /api/auto-print/config');
    const cfg = await request('GET', '/api/auto-print/config');
    console.dir(cfg, { depth: 6 });

    console.log('\n--- GET /api/auto-print/status');
    const st = await request('GET', '/api/auto-print/status');
    console.dir(st, { depth: 6 });
  } catch (e) {
    console.error('Verbose error object:', e);
  }
}
main();