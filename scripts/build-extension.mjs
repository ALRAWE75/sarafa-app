// Builds the Chrome extension (Manifest V3) from the shared app in www/.
// Chrome extensions do not allow inline <script>, so the page is split into
// popup.html + popup.css + popup.js. Output: dist-extension/
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';

const OUT = 'dist-extension';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let html = readFileSync('www/index.html', 'utf8');

const style = html.match(/<style>([\s\S]*?)<\/style>/);
const script = html.match(/<script>([\s\S]*?)<\/script>/);
if (!style || !script) throw new Error('Could not find the inline <style> / <script> in www/index.html');

const popupCss =
  style[1] +
  `
/* Extension popup: fixed width, no outer page padding */
html{width:400px}
body{padding-top:14px;padding-bottom:18px;padding-left:12px;padding-right:12px}
.app{gap:12px}
`;

html = html
  .replace(style[0], '<link rel="stylesheet" href="popup.css">')
  .replace(script[0], '<script src="popup.js"></script>');

writeFileSync(`${OUT}/popup.html`, html);
writeFileSync(`${OUT}/popup.css`, popupCss);
writeFileSync(`${OUT}/popup.js`, script[1]);
copyFileSync('www/rates-bundled.js', `${OUT}/rates-bundled.js`);
for (const s of [16, 48, 128]) copyFileSync(`build/ext-${s}.png`, `${OUT}/icon-${s}.png`);

const manifest = {
  manifest_version: 3,
  name: 'حاسبة الصيرفة',
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  description: 'تحويل بين الدينار العراقي والليرة التركية والدولار',
  action: {
    default_popup: 'popup.html',
    default_title: 'حاسبة الصيرفة',
    default_icon: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' }
  },
  icons: { 16: 'icon-16.png', 48: 'icon-48.png', 128: 'icon-128.png' },
  host_permissions: ['https://raw.githubusercontent.com/*']
};
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log('Extension built in', OUT);
