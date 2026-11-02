// Reads today's market (local) dollar price in Iraqi dinar from the public Telegram channel
// "شركة القصر للصرافة" (https://t.me/Kukh_alomlat) and writes market.json.
// The channel posts the price per 100 USD. The shop's "البيع" (they sell dollars) is what a customer
// PAYS to get dollars -> our "buy"; the shop's "الشراء" is what a customer RECEIVES for dollars -> our "sell".
// If no valid post is found the script exits with an error and changes nothing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CHANNEL = 'Kukh_alomlat';
const URL_ = `https://t.me/s/${CHANNEL}`;

function decodeEntities(s) {
  return s
    .replace(/&#0?36;/g, '$')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
const toNum = (s) => Number(String(s).replace(/[,٬\s]/g, ''));

/** Returns the newest valid dollar-price post: {buy, sell, post, postedAt} or null. */
export function parseChannel(html, now = Date.now()) {
  const parts = html.split('tgme_widget_message_wrap').slice(1);
  let best = null;
  for (const p of parts) {
    const id = (p.match(/data-post="[^"/]+\/(\d+)"/) || [])[1];
    const t = p.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!id || !t) continue;
    const text = decodeEntities(
      t[1].replace(/<br\s*\/?>/g, '\n').replace(/<i class="emoji"[^>]*>.*?<\/i>/g, '').replace(/<[^>]+>/g, '')
    ).replace(/[‎‏‌]/g, '');
    if (!text.includes('سعر') || !text.includes('$')) continue;
    // Dollar block = from the first "$" up to the euro section (or the end).
    const from = text.indexOf('$');
    const eu = text.indexOf('€', from);
    const block = text.slice(from, eu > 0 ? eu : undefined);
    const sellM = block.match(/البيع\s*[:.]?\s*([\d,٬.]+)/);
    const buyM = block.match(/(?:ال)?شراء\s*[:.]?\s*([\d,٬.]+)/);
    if (!sellM || !buyM) continue;
    const shopSell = toNum(sellM[1]);
    const shopBuy = toNum(buyM[1]);
    const when = (p.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    const postedAt = when ? new Date(when).toISOString() : null;
    if (!postedAt) continue;
    const cand = { id: Number(id), shopSell, shopBuy, postedAt };
    if (!best || cand.id > best.id) best = cand;
  }
  if (!best) return null;
  const { shopSell, shopBuy } = best;
  // Per 100 USD, IQD. Plausible range and a sane spread.
  for (const v of [shopSell, shopBuy]) {
    if (!(v >= 100000 && v <= 300000)) throw new Error('market price out of range: ' + v);
  }
  if (shopSell < shopBuy) throw new Error('market sell is below buy');
  if ((shopSell - shopBuy) / shopSell > 0.05) throw new Error('market buy/sell too far apart');
  const ageH = (now - Date.parse(best.postedAt)) / 3600000;
  if (ageH > 72) throw new Error(`latest price post is ${Math.round(ageH)} hours old`);
  return {
    buy: shopSell / 100,
    sell: shopBuy / 100,
    post: `${CHANNEL}/${best.id}`,
    postedAt: best.postedAt
  };
}

async function main() {
  const res = await fetch(URL_, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; sarafa-rates/1.0; +https://github.com/ALRAWE75/sarafa-app)', 'accept-language': 'ar,en' }
  });
  if (!res.ok) throw new Error(`${URL_} -> HTTP ${res.status}`);
  const r = parseChannel(await res.text());
  if (!r) throw new Error('no dollar price post found on the channel page');
  const next = {
    date: r.postedAt.slice(0, 10),
    postedAt: r.postedAt,
    source: 't.me/' + CHANNEL,
    post: r.post,
    iqd: { buy: r.buy, sell: r.sell }
  };
  if (existsSync('market.json')) {
    try {
      const old = JSON.parse(readFileSync('market.json', 'utf8'));
      if (JSON.stringify({ ...old, updatedAt: undefined }) === JSON.stringify(next)) {
        console.log('No change:', JSON.stringify(next));
        return;
      }
    } catch {}
  }
  const out = { ...next, updatedAt: new Date().toISOString() };
  writeFileSync('market.json', JSON.stringify(out, null, 2) + '\n');
  console.log('Updated:', JSON.stringify(out));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('update-market failed:', e.message);
    process.exit(1);
  });
}
