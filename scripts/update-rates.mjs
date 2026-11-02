// Reads the bank rates for USD→IQD and USD→TRY from egcurrency.com and writes
//   rates.json            (the apps download this file from GitHub)
//   www/rates-bundled.js  (a copy shipped inside the apps for first launch / no internet)
// The pages embed their data as JSON in a data-page="..." attribute.
// If anything looks wrong the script exits with an error and changes nothing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PAGES = {
  iqd: 'https://egcurrency.com/en/currency/usd-to-iqd/bank',
  try: 'https://egcurrency.com/en/currency/usd-to-try/bank'
};
const LIMITS = { iqd: [1000, 3000], try: [20, 150] };

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function parsePage(html, expectTo) {
  const m = html.match(/data-page=(?:'([^']*)'|"([^"]*)")/);
  if (!m) throw new Error('data-page attribute not found');
  const json = JSON.parse(decodeEntities(m[1] ?? m[2]));
  const d = json?.data;
  if (!d?.rate) throw new Error('rate block missing');
  if (d.from?.code !== 'USD') throw new Error('unexpected base currency: ' + d.from?.code);
  if (String(d.to?.code).toLowerCase() !== expectTo) throw new Error('unexpected quote currency: ' + d.to?.code);
  if (d.source?.code !== 'bank') throw new Error('unexpected source: ' + d.source?.code);
  const buy = Number(d.rate.buy);
  const sell = Number(d.rate.sell);
  const day = String(d.dayId);
  if (!/^\d{8}$/.test(day)) throw new Error('bad dayId: ' + day);
  const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
  const [lo, hi] = LIMITS[expectTo];
  for (const v of [buy, sell]) {
    if (!(v >= lo && v <= hi)) throw new Error(`${expectTo} rate out of range: ${v}`);
  }
  if (Math.abs(buy - sell) / Math.max(buy, sell) > 0.05) throw new Error(`${expectTo} buy/sell too far apart`);
  return { buy, sell, date };
}

async function load(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const iqd = parsePage(await load(PAGES.iqd), 'iqd');
  const tr = parsePage(await load(PAGES.try), 'try');
  const date = iqd.date < tr.date ? iqd.date : tr.date; // the older of the two days

  const age = (Date.now() - Date.parse(date + 'T00:00:00Z')) / 86400000;
  if (age > 4) throw new Error(`rates are ${Math.round(age)} days old (${date}), not writing`);

  const next = {
    date,
    source: 'egcurrency.com',
    iqd: { buy: iqd.buy, sell: iqd.sell },
    try: { buy: tr.buy, sell: tr.sell }
  };

  const same =
    existsSync('rates.json') &&
    (() => {
      try {
        const old = JSON.parse(readFileSync('rates.json', 'utf8'));
        return JSON.stringify({ ...old, updatedAt: undefined }) === JSON.stringify(next);
      } catch {
        return false;
      }
    })();
  if (same) {
    console.log('No change:', JSON.stringify(next));
    return;
  }

  const out = { ...next, updatedAt: new Date().toISOString() };
  writeFileSync('rates.json', JSON.stringify(out, null, 2) + '\n');
  writeFileSync('www/rates-bundled.js', 'window.BUNDLED_RATES = ' + JSON.stringify(out) + ';\n');
  console.log('Updated:', JSON.stringify(out));
}

// Run only when executed directly (so tests can import parsePage).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('update-rates failed:', e.message);
    console.log('::error title=update-rates failed::' + String(e.message).replace(/\n/g, ' ').slice(0, 300));
    process.exit(1);
  });
}
