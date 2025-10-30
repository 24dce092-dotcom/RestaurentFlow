const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

async function waitForServer(url, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          // consume a little and close
          res.resume();
          resolve();
        });
        req.on('error', (err) => {
          req.destroy();
          reject(err);
        });
        req.setTimeout(2000, () => {
          req.destroy(new Error('timeout'));
        });
      });
      return;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Server did not become ready in time: ' + url);
}

async function run() {
  const url = 'http://localhost:5173/';

  console.log('Waiting for dev server at', url);
  await waitForServer(url, 60000).catch(e => {
    console.error('Server not ready:', e.message);
  });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  console.log('Opening', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    console.error('goto failed', e.message || e);
  }

  // Enable test mode so billing page exposes window.__triggerExportForTest
  await page.evaluate(() => { window.__TEST_MODE__ = true; });

  // Navigate to billing page route (assumes route '/billing' or root shows billing in this app)
  // Adjust path if your app uses a route like /billing-payment-management
  await page.evaluate(() => {
    // try to navigate via router link - look for link/button
    const link = document.querySelector('a[href*=\"billing\"]') || document.querySelector('a[href*=\"billing-payment\"]');
    if (link) link.click();
  });

  // lightweight pause
  await new Promise(r => setTimeout(r, 1000));

  // Provide mock table data and trigger export hook
  const table = {
    tableNumber: 99,
    number: 99,
    business: { name: 'Headless Test Restaurant' },
    items: [
      { id: 'd1', name: 'Test Dish A', price: 10.0, quantity: 2 },
      { id: 'd2', name: 'Test Dish B', price: 5.5, quantity: 1 },
      { id: 'd1', name: 'Test Dish A', price: 10.0, quantity: 1, specialRequest: 'No onion' }
    ]
  };

  await page.evaluate((t) => {
    window.__TEST_TABLE__ = t;
  }, table);

  // allow app wiring
  await new Promise(r => setTimeout(r, 1000));

  // Call the exposed trigger (billing index.jsx must expose window.__triggerExportForTest)
  const exported = await page.evaluate(async () => {
    if (window.__triggerExportForTest) {
      try {
        await window.__triggerExportForTest(window.__TEST_TABLE__);
        return true;
      } catch (e) {
        return 'err:' + (e && e.message ? e.message : String(e));
      }
    }
    return false;
  });

  console.log('Exported?', exported);

  // Capture the rendered receipt HTML as snapshot and write to file.
  const receiptHtml = await page.evaluate(() => {
    const el = document.querySelector('#receipt-export-root .receipt-root') || document.querySelector('.receipt-root') || document.body;
    return el ? el.outerHTML : document.body.outerHTML;
  });

  fs.writeFileSync(path.join(__dirname, '..', 'test-receipt-snapshot.html'), receiptHtml, 'utf8');
  console.log('Wrote test-receipt-snapshot.html');

  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });
