const puppeteer = require('puppeteer');

(async () => {
  try {
    const url = process.argv[2] || 'http://localhost:5174/billing-payment-management';
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => {
      try {
        console.log('PAGE LOG:', msg.type(), msg.text());
      } catch (e) { console.log('PAGE LOG ERROR', e); }
    });
    page.on('pageerror', err => {
      console.error('PAGE ERROR:', err.stack || err.message || err);
    });
    page.on('requestfailed', req => {
      console.warn('REQUEST FAILED:', req.url(), req.failure && req.failure().errorText);
    });

    await page.setViewport({width: 1200, height: 900});
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => { console.error('GOTO ERROR', e.message); });
    if (resp) console.log('HTTP STATUS', resp.status());

    // wait briefly
    await page.waitForTimeout(2000);

    const html = await page.content();
    console.log('PAGE HTML LENGTH', html.length);

    await page.screenshot({ path: 'capture.png', fullPage: true });
    console.log('Saved screenshot capture.png');

    await browser.close();
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();