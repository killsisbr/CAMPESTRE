const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  const url = 'http://localhost:3005/pedido?debug=1';
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'load' });
  // Wait for a little while to let client JS fetch and render
  await page.waitForTimeout(3500);

  // Capture screenshot and current html of current product
  const screenshotsDir = './tmp';
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);
  const screenshotPath = './tmp/pedido_debug.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const currentProductHTML = await page.$eval('#current-product', el => el.innerHTML);
  logs.push({ type: 'info', text: 'current-product innerHTML length: ' + currentProductHTML.length });

  const dotsCount = await page.$$eval('#carousel-dots .dot', els => els.length);
  logs.push({ type: 'info', text: 'carousel dots count: ' + dotsCount });

  console.log('--- CONSOLE LOGS ---');
  console.log(JSON.stringify(logs, null, 2));
  fs.writeFileSync('./tmp/pedido_console_logs.json', JSON.stringify(logs, null, 2));
  console.log('Screenshot written to:', screenshotPath);
  await browser.close();
})();