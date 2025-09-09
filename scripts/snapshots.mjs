// scripts/snapshots.mjs - capture mobile screenshots of live site
import { chromium, devices } from '@playwright/test';

const TARGET = process.env.SPACER_URL || 'https://spacer.vectorhost.net/?auto=1&dev=1&pause=1';
const OUTDIR = process.env.OUT || 'playwright_screenshots';

const profiles = [
  { name: 'iphone-14-pro', dev: devices['iPhone 14 Pro'] },
  { name: 'iphone-se', dev: devices['iPhone SE'] },
  { name: 'pixel-7', dev: devices['Pixel 7'] },
  { name: 'galaxy-s20-ultra', dev: devices['Galaxy S20 Ultra'] },
  { name: 'ipad-mini', dev: devices['iPad Mini'] },
];

async function snapOne(context, page, name, url){
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // open Dev overlay
  await page.getByTestId('btn-dev').click();
  // ensure pause state (button shows Resume when already paused)
  const pauseBtn = page.getByTestId('btn-dev-pause');
  const label = (await pauseBtn.textContent() || '').trim();
  if(label === 'Pause'){
    await pauseBtn.click();
  }
  // jump to next boss (Wave 5 from Wave 1)
  await page.getByTestId('btn-next-boss').click();
  // small settle
  await page.waitForTimeout(500);
  // screenshot
  await page.screenshot({ path: `${OUTDIR}/${name}.png`, fullPage: true });
}

(async () => {
  for(const p of profiles){
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ ...p.dev });
    const page = await ctx.newPage();
    try{
      await snapOne(ctx, page, p.name, TARGET);
      console.log(`Saved ${OUTDIR}/${p.name}.png`);
    }catch(err){
      console.error(`Failed ${p.name}:`, err.message);
    } finally {
      await browser.close();
    }
  }
})();
