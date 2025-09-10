// scripts/snapshots.mjs - capture mobile screenshots of the site
import { chromium, devices } from '@playwright/test';

// Prefer an explicit wave jump so we don't depend on Dev overlay controls being present
const TARGET = process.env.SPACER_URL || 'https://spacer.vectorhost.net/?auto=1&dev=1&pause=1&wave=5&skipIntro=1&patterns=1';
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
  // Wait for app readiness up to 65s (container warm-up + app init).
  // Prefer explicit readiness signal, but also fall back to engine globals present in older builds.
  await page.waitForFunction(
    () => document.title === 'Spacer' && (
      (typeof window !== 'undefined' && (window.spacerReady === true || !!window.spacerInput)) ||
      document.body?.getAttribute('data-spacer-ready') === '1'
    ),
    { timeout: 65000 }
  );
  // Best-effort: if Dev overlay is available, ensure paused and jump to boss; otherwise rely on URL params
  try {
    const devBtn = page.getByTestId('btn-dev');
    await devBtn.click({ timeout: 1500 });
    const pauseBtn = page.getByTestId('btn-dev-pause');
    const label = (await pauseBtn.textContent({ timeout: 1500 }) || '').trim();
    if(label === 'Pause'){
      await pauseBtn.click();
    }
    // optional boss jump if control exists
    await page.getByTestId('btn-next-boss').click({ timeout: 1500 }).catch(()=>{});
  } catch(_) {
    // overlay not present; proceed
  }
  // small settle
  await page.waitForTimeout(600);
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
