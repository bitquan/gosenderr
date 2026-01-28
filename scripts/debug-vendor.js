(async ()=>{
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => console.log('PAGE:', m.type(), m.text()));
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://127.0.0.1:5181', { waitUntil: 'networkidle' });
  await new Promise(r=>setTimeout(r,1700));
  const body = await page.evaluate(() => document.documentElement.innerHTML);
  console.log('\n=== PAGE HTML START ===\n');
  console.log(body.slice(0,2000));
  console.log('\n=== PAGE HTML END ===\n');
  await browser.close();
})().catch(e=>{ console.error('ERR', e); process.exit(1) });
