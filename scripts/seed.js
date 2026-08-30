/* Seeds sample products + ads. Generates flat-lay garment product illustrations
   as SVG artwork (studio light background) — compatible with every browser.
   Run: npm run seed   (safe to re-run — only seeds when data is empty) */

const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

const UPLOADS = path.join(__dirname, '..', 'public', 'uploads');

/* ---------- color helpers ---------- */
function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function mix(c, target, t) {
  const a = hex(c), b = hex(target), out = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + out.map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

/* ---------- shared studio scene ---------- */
function scene(w, h, opts) {
  const o = opts || {};
  const warm = o.warm ? '#efece4' : '#f2f1ec';
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="36%" r="85%">
      <stop offset="0%" stop-color="${warm}"/><stop offset="100%" stop-color="#e2e0d7"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="45%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="60%" stop-color="#ffffff" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${w / 2}" cy="${h * 0.86}" rx="${w * 0.27}" ry="${h * 0.028}" fill="#26221a" opacity="0.14" filter="url(#blur)"/>
  <circle cx="${w * 0.12}" cy="${h * 0.16}" r="${w * 0.02}" fill="#88837a" opacity="0.3"/>`;
}

function close(tag) { return `</${tag}>`; }

/* garment flat-lay drawing primitives */
function tee(main, neck, printColor, printLabel) {
  const dark = mix(main, '#000000', 0.18);
  return `
  <g id="tee">
    <path d="M352,334 C342,341 330,353 324,365 L300,600 L294,766 C316,790 484,790 506,766 L500,600 L476,365 C470,353 458,341 448,334 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M324,365 L300,502 L220,476 L258,356 Z" fill="${mix(main, '#ffffff', 0.08)}" stroke="${dark}" stroke-width="2"/>
    <path d="M476,365 L500,502 L580,476 L542,356 Z" fill="${mix(main, '#000000', 0.06)}" stroke="${dark}" stroke-width="2"/>
    <path d="M220,476 L258,356" stroke="${dark}" stroke-width="9" fill="none" opacity="0.9"/>
    <path d="M580,476 L542,356" stroke="${dark}" stroke-width="9" fill="none" opacity="0.9"/>
    <path d="M356,332 C376,352 424,352 444,332" fill="none" stroke="${neck}" stroke-width="15"/>
    <rect x="294" y="762" width="212" height="15" rx="7.5" fill="${dark}"/>
    <path d="M336,404 L464,404 L472,496 L460,500 L340,500 L328,496 Z" fill="${printColor}"/>
    <text x="400" y="462" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="26" fill="${mix(printColor, '#000000', 0.55)}" letter-spacing="1">${printLabel}</text>
    <rect x="330" y="398" width="400" height="106" fill="url(#sheen)" opacity="0.7"/>
  </g>`;
}

function hoodie(main, neck, printColor, printLabel) {
  const dark = mix(main, '#000000', 0.16);
  const lite = mix(main, '#ffffff', 0.12);
  return `
  <g id="hoodie">
    <path d="M312,336 C296,224 504,224 488,336 C470,266 438,244 400,244 C362,244 330,266 312,336 Z" fill="${dark}"/>
    <ellipse cx="400" cy="316" rx="44" ry="30" fill="${lite}"/>
    <path d="M352,340 C342,347 330,359 324,371 L300,612 L296,772 C318,796 482,796 504,772 L500,612 L476,371 C470,359 458,347 448,340 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M324,371 L300,506 L222,482 L258,362 Z" fill="${lite}" stroke="${dark}" stroke-width="2"/>
    <path d="M476,371 L500,506 L578,482 L542,362 Z" fill="${mix(main, '#000000', 0.05)}" stroke="${dark}" stroke-width="2"/>
    <path d="M222,482 L258,362" stroke="${dark}" stroke-width="9" fill="none" opacity="0.9"/>
    <path d="M578,482 L542,362" stroke="${dark}" stroke-width="9" fill="none" opacity="0.9"/>
    <rect x="296" y="768" width="208" height="16" rx="8" fill="${dark}"/>
    <path d="M322,606 C322,592 336,584 352,584 L448,584 C464,584 478,592 478,606 L478,664 C478,684 458,696 440,696 L360,696 C342,696 322,684 322,664 Z" fill="${dark}" opacity="0.85"/>
    <path d="M322,606 L478,606" stroke="${main}" stroke-width="4" opacity="0.4"/>
    <path d="M392,318 C384,370 386,430 392,480" stroke="${lite}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M408,318 C416,370 414,430 408,480" stroke="${lite}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="392" cy="484" rx="4" ry="6" fill="${dark}"/>
    <ellipse cx="408" cy="484" rx="4" ry="6" fill="${dark}"/>
    <path d="M352,420 L448,420 L454,486 L446,490 L354,490 L346,486 Z" fill="${printColor}"/>
    <text x="400" y="465" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="19" fill="${mix(printColor, '#000000', 0.5)}" letter-spacing="2">${printLabel}</text>
    <rect x="330" y="404" width="400" height="90" fill="url(#sheen)" opacity="0.7"/>
  </g>`;
}

function jacket(main, accent, label1, label2) {
  const dark = mix(main, '#000000', 0.18);
  const lite = mix(main, '#ffffff', 0.10);
  return `
  <g id="jacket">
    <path d="M352,334 C342,341 330,353 324,365 L300,606 L294,774 C316,798 484,798 506,774 L500,606 L476,365 C470,353 458,341 448,334 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M324,365 L300,512 L216,486 L258,356 Z" fill="${lite}" stroke="${dark}" stroke-width="2"/>
    <path d="M476,365 L500,512 L584,486 L542,356 Z" fill="${mix(main, '#000000', 0.05)}" stroke="${dark}" stroke-width="2"/>
    <path d="M214,480 C230,470 240,440 244,404" stroke="${accent}" stroke-width="12" fill="none"/>
    <path d="M586,480 C570,470 560,440 556,404" stroke="${accent}" stroke-width="12" fill="none"/>
    <path d="M362,340 L400,352 L438,340" fill="none" stroke="${dark}" stroke-width="12"/>
    <path d="M400,352 L400,680" stroke="${accent}" stroke-width="4" fill="none"/>
    <path d="M362,340 L354,392 L382,386 Z" fill="${lite}"/>
    <path d="M438,340 L446,392 L418,386 Z" fill="${dark}"/>
    <rect x="330" y="408" width="66" height="42" rx="6" fill="${dark}" opacity="0.7"/>
    <rect x="404" y="408" width="66" height="42" rx="6" fill="${dark}" opacity="0.7"/>
    <circle cx="363" cy="429" r="4" fill="${accent}"/>
    <circle cx="437" cy="429" r="4" fill="${accent}"/>
    <rect x="294" y="770" width="212" height="15" rx="7.5" fill="${dark}"/>
    <path d="M346,560 L454,560 L454,600 L346,600 Z" fill="${accent}"/>
    <text x="400" y="586" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="15" fill="${mix(accent, '#000000', 0.5)}" letter-spacing="2">${label1} · ${label2}</text>
    <rect x="330" y="540" width="400" height="70" fill="url(#sheen)" opacity="0.7"/>
  </g>`;
}

function cargo(main, accent) {
  const dark = mix(main, '#000000', 0.15);
  const lite = mix(main, '#ffffff', 0.10);
  return `
  <g id="cargo">
    <rect x="298" y="320" width="204" height="26" rx="6" fill="${dark}"/>
    <path d="M306,346 L294,762 C292,792 350,802 366,802 L434,802 C450,802 508,792 506,762 L494,346 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M306,346 L400,560 L494,346 Z" fill="none"/>
    <path d="M400,346 L400,802" stroke="${dark}" stroke-width="3" stroke-dasharray="10 8" opacity="0.65"/>
    <path d="M326,520 L398,520" stroke="${accent}" stroke-width="7" opacity="0.9"/>
    <path d="M402,560 L474,560" stroke="${accent}" stroke-width="7" opacity="0.9"/>
    <path d="M294,762 L304,788" stroke="${dark}" stroke-width="10" stroke-linecap="round"/>
    <path d="M506,762 L496,788" stroke="${dark}" stroke-width="10" stroke-linecap="round"/>
    <path d="M348,640 L452,640" stroke="${lite}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
    <path d="M354,706 L446,706" stroke="${lite}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>
    <path d="M400,346 l-8,16 m8,-16 l8,16" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="318" y="600" width="164" height="34" rx="5" fill="${dark}" opacity="0.75"/>
    <rect x="330" y="120" width="200" height="160" fill="url(#sheen)" opacity="0.6"/>
  </g>`;
}

function kimono(main, gold, label) {
  const dark = mix(main, '#000000', 0.22);
  const lite = mix(main, '#ffffff', 0.14);
  return `
  <g id="kimono">
    <path d="M300,352 L210,344 L192,640 L300,632 Z" fill="${lite}" stroke="${dark}" stroke-width="2"/>
    <path d="M500,352 L590,344 L608,640 L500,632 Z" fill="${dark}" stroke="${dark}" stroke-width="2"/>
    <path d="M318,344 L392,320 L482,344 L494,780 L306,780 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M306,780 L494,780 L490,806 L310,806 Z" fill="${dark}"/>
    <path d="M318,344 L300,540 L306,690" fill="none" stroke="${gold}" stroke-width="6"/>
    <path d="M482,344 L500,540 L494,690" fill="none" stroke="${gold}" stroke-width="6"/>
    <path d="M316,520 L484,520 L478,600 L322,600 Z" fill="${gold}" stroke="${mix(gold, '#000000', 0.25)}" stroke-width="2"/>
    <path d="M306,520 L494,520 L490,600 L310,600 Z" fill="#000000" opacity="0.06"/>
    <path d="M476,520 L500,600" stroke="${dark}" stroke-width="7"/>
    <ellipse cx="478" cy="590" rx="16" ry="22" fill="${gold}"/>
    <path d="M400,344 L400,780" stroke="${gold}" stroke-width="3" stroke-dasharray="2 10" opacity="0.7"/>
    <text x="400" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="30" fill="${mix(main, '#000000', 0.35)}">${label}</text>
    <rect x="330" y="214" width="200" height="46" fill="url(#sheen)" opacity="0.5"/>
  </g>`;
}

function polo(main, gold, label) {
  const dark = mix(main, '#000000', 0.14);
  return `
  <g id="polo">
    <path d="M352,334 C342,341 330,353 324,365 L300,600 L294,766 C316,790 484,790 506,766 L500,600 L476,365 C470,353 458,341 448,334 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M324,365 L300,470 L240,452 L258,356 Z" fill="${mix(main, '#ffffff', 0.08)}" stroke="${dark}" stroke-width="2"/>
    <path d="M476,365 L500,470 L560,452 L542,356 Z" fill="${mix(main, '#000000', 0.02)}" stroke="${dark}" stroke-width="2"/>
    <path d="M240,452 L258,356" stroke="${dark}" stroke-width="8" fill="none" opacity="0.9"/>
    <path d="M560,452 L542,356" stroke="${dark}" stroke-width="8" fill="none" opacity="0.9"/>
    <path d="M352,328 L420,342 L448,346 L440,404 L448,346 L452,352 L468,336 L432,330 L400,334 L372,326 Z" fill="${mix(main, '#000000', 0.06)}"/>
    <path d="M366,329 L434,343 L440,342 Z" fill="none" stroke="${dark}" stroke-width="5"/>
    <path d="M400,338 L400,372" stroke="${dark}" stroke-width="4"/>
    <circle cx="396" cy="352" r="3.2" fill="${gold}"/>
    <circle cx="404" cy="352" r="3.2" fill="${gold}"/>
    <rect x="294" y="762" width="212" height="15" rx="7.5" fill="${dark}"/>
    <text x="400" y="480" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="20" fill="${mix(main, '#000000', 0.3)}" letter-spacing="3">${label}</text>
    <rect x="330" y="440" width="400" height="60" fill="url(#sheen)" opacity="0.7"/>
  </g>`;
}

function knit(main, gold, label) {
  const dark = mix(main, '#000000', 0.16);
  const lite = mix(main, '#ffffff', 0.10);
  let rows = '';
  for (let y = 430; y < 700; y += 22) {
    rows += `<path d="M312,${y} Q356,${y - 8} 400,${y} Q444,${y + 8} 488,${y}" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.07"/>`;
  }
  return `
  <g id="knit">
    <path d="M352,332 C344,338 332,350 326,362 L302,600 L296,770 C318,794 482,794 504,770 L498,600 L474,362 C468,350 456,338 448,332 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
    <path d="M326,362 L302,498 L226,472 L262,354 Z" fill="${lite}" stroke="${dark}" stroke-width="2"/>
    <path d="M474,362 L498,498 L574,472 L538,354 Z" fill="${mix(main, '#000000', 0.05)}" stroke="${dark}" stroke-width="2"/>
    <path d="M226,472 L262,354" stroke="${dark}" stroke-width="8" fill="none" opacity="0.9"/>
    <path d="M574,472 L538,354" stroke="${dark}" stroke-width="8" fill="none" opacity="0.9"/>
    <path d="M352,308 C372,330 428,330 448,308 L444,344 L356,344 Z" fill="${dark}"/>
    <path d="M356,330 L444,330" stroke="${dark}" stroke-width="6"/>
    ${rows}
    <rect x="296" y="766" width="208" height="18" rx="9" fill="${dark}"/>
    <text x="400" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="26" fill="${gold}">${label}</text>
    <rect x="330" y="216" width="200" height="40" fill="url(#sheen)" opacity="0.4"/>
  </g>`;
}

function belt(main, metal, label) {
  const dark = mix(main, '#000000', 0.18);
  return `
  <g id="belt">
    <rect x="320" y="250" width="60" height="470" rx="30" fill="${main}" stroke="${dark}" stroke-width="3"/>
    <rect x="332" y="250" width="60" height="470" rx="30" fill="url(#sheen)" opacity="0.9"/>
    <rect x="304" y="180" width="92" height="52" rx="10" fill="${metal}" stroke="${mix(metal, '#000000', 0.25)}" stroke-width="3"/>
    <rect x="314" y="206" width="72" height="14" rx="5" fill="${metal}"/>
    <rect x="330" y="196" width="40" height="10" rx="4" fill="${mix(metal, '#000000', 0.3)}"/>
    <circle cx="350" cy="330" r="5" fill="${dark}"/>
    <circle cx="350" cy="400" r="5" fill="${dark}"/>
    <circle cx="350" cy="470" r="5" fill="${dark}"/>
    <circle cx="350" cy="540" r="5" fill="${dark}"/>
    <circle cx="350" cy="610" r="5" fill="${dark}"/>
    <text x="400" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="26" fill="${mix(main, '#000000', 0.3)}">${label}</text>
  </g>`;
}

/* ---------- builders ---------- */
function productSvg(w, h, body) {
  return (scene(w, h) + body + `\n</svg>`).replace(/^\s+/, '');
}
function adSvg(w, h, body) {
  return (scene(w, h, { warm: true }) + body + `\n</svg>`).replace(/^\s+/, '');
}

/* ================================================================ */

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const products = store.getProducts();
const ads = store.getAds();

if (products.length || ads.length) {
  console.log('Data already seeded — skipping. Delete data/*.json to re-seed.');
  process.exit(0);
}

/* ---- STREETWEAR ---- */
const swDark = '#16181c';

/* hoodie */
fs.writeFileSync(path.join(UPLOADS, 'hoodie_black.svg'), productSvg(800, 1000,
  hoodie(swDark, mix(swDark, '#ffffff', 0.25), '#d6ff3f', 'DM-01')), 'utf8');
/* tee */
fs.writeFileSync(path.join(UPLOADS, 'tee_volt.svg'), productSvg(800, 1000,
  tee('#1b1d12', mix('#1b1d12', '#000000', 0.2), '#d6ff3f', 'VOLT')), 'utf8');
/* jacket */
fs.writeFileSync(path.join(UPLOADS, 'jacket_ember.svg'), productSvg(800, 1000,
  jacket('#241711', '#ff4d2e', 'EMBER', 'RAIN')), 'utf8');
/* cargo */
fs.writeFileSync(path.join(UPLOADS, 'cargo.svg'), productSvg(800, 1000,
  cargo('#20241a', '#9dff57')), 'utf8');

/* ---- LUXURY ---- */
const gold = '#b9965c';
/* kimono */
fs.writeFileSync(path.join(UPLOADS, 'kimono_onyx.svg'), productSvg(800, 1000,
  kimono('#171512', gold, 'ONYX · EDITION XIX')), 'utf8');
/* polo */
fs.writeFileSync(path.join(UPLOADS, 'polo_ivory.svg'), productSvg(800, 1000,
  polo('#efe9dc', gold, 'ÉDITION N° I')), 'utf8');
/* knit */
fs.writeFileSync(path.join(UPLOADS, 'knit_noir.svg'), productSvg(800, 1000,
  knit('#191919', gold, 'M-16 · EXTRA-FINE')), 'utf8');
/* belt */
fs.writeFileSync(path.join(UPLOADS, 'belt_pd.svg'), productSvg(800, 1000,
  belt('#231f1a', '#cfd6e0', 'PALLADIUM')), 'utf8');

/* ---- ADS ---- */
fs.writeFileSync(path.join(UPLOADS, 'hero_ads.svg'), adSvg(1200, 1000, `
  <g id="hero">
    <text x="120" y="560" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="170" fill="#16181c" letter-spacing="6">AURE</text>
    <path d="M120,612 L300,612" stroke="#2447ff" stroke-width="14"/>
    <text x="124" y="672" font-family="Courier New, monospace" font-size="26" fill="#85827a" letter-spacing="10">THE NOISE COLLECTION — 2026</text>
    <circle cx="960" cy="500" r="180" fill="none" stroke="#2447ff" stroke-width="4" opacity="0.5"/>
    <circle cx="960" cy="500" r="120" fill="none" stroke="#16181c" stroke-width="2" stroke-dasharray="14 12" opacity="0.4"/>
    <text x="960" y="520" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="46" fill="#2447ff">DROP 01</text>
    <circle cx="960" cy="500" r="46" fill="#2447ff" opacity="0.12"/>
  </g>`), 'utf8');

fs.writeFileSync(path.join(UPLOADS, 'banner_volt.svg'), adSvg(1200, 800, `
  <g id="bvolt">
    <g transform="translate(150,100) scale(0.85)">${tee('#1b1d12', '#000000', '#d6ff3f', 'VOLT')}</g>
    <text x="700" y="360" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="96" fill="#16181c" letter-spacing="2">VOLT</text>
    <rect x="706" y="392" width="140" height="10" fill="#2447ff"/>
    <text x="700" y="452" font-family="Courier New, monospace" font-size="24" fill="#85827a" letter-spacing="6">HEAVYWEIGHT TEES · DROP 02</text>
  </g>`), 'utf8');

fs.writeFileSync(path.join(UPLOADS, 'banner_ember.svg'), adSvg(1200, 800, `
  <g id="bember">
    <g transform="translate(150,100) scale(0.85)">${jacket('#241711', '#ff4d2e', 'EMBER', 'RAIN')}</g>
    <text x="700" y="360" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="96" fill="#16181c" letter-spacing="2">EMBER</text>
    <rect x="706" y="392" width="150" height="10" fill="#e6452c"/>
    <text x="700" y="452" font-family="Courier New, monospace" font-size="24" fill="#85827a" letter-spacing="6">RAIN-PROOF SHELLS</text>
  </g>`), 'utf8');

fs.writeFileSync(path.join(UPLOADS, 'banner_gold.svg'), adSvg(1200, 800, `
  <g id="bgold">
    <path d="M200,640 C400,560 800,560 1000,640 C800,560 400,560 200,640 L200,780 L1000,780 Z" fill="none"/>
    <g transform="translate(150,90) scale(0.85)">${kimono('#171512', gold, 'ONYX SILK · XIX')}</g>
    <text x="700" y="360" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="100" fill="#8a6b3a" letter-spacing="2">The Atelier</text>
    <rect x="706" y="400" width="120" height="2" fill="#b9965c"/>
    <text x="700" y="450" font-family="Courier New, monospace" font-size="24" fill="#85827a" letter-spacing="8">EDITION ONE · GOLD SEALED</text>
  </g>`), 'utf8');

/* ---- products + ads ---- */
store.addProduct({ name: 'DARK MATTER HOODIE', line: 'streetwear', category: 'Hoodies', price: 2499, sizes: ['S', 'M', 'L', 'XL'], stock: 24, description: 'Heavyweight 420gsm brushed fleece. Oversized drop-shoulder fit, double-lined hood, hidden pocket. Pre-shrunk, garment dyed in India.', featured: true, tag: 'NEW', image: '/uploads/hoodie_black.svg' });
store.addProduct({ name: 'STATIC VOLT TEE', line: 'streetwear', category: 'Tees', price: 999, sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 40, description: 'Regular fit 220gsm combed cotton. Thick volt print with a subtle 3D drop shadow. Fade-proof, street-proof.', featured: true, tag: '', image: '/uploads/tee_volt.svg' });
store.addProduct({ name: 'EMBER SHELL JACKET', line: 'streetwear', category: 'Jackets', price: 4999, sizes: ['M', 'L', 'XL'], stock: 12, description: '3-layer bonded shell, taped seams, storm cuffs. Built for Mumbai rain and anything after. Reflective AURE hits.', featured: true, tag: 'LIMITED', image: '/uploads/jacket_ember.svg' });
store.addProduct({ name: 'FIELD CARGO PANTS', line: 'streetwear', category: 'Bottoms', price: 2999, sizes: ['S', 'M', 'L', 'XL'], stock: 18, description: 'Double knee cargos in heavyweight ripstop. 6 pockets, webbing loops, cinched hem — built to move.', featured: false, tag: '', image: '/uploads/cargo.svg' });

store.addProduct({ name: 'ONYX SILK KIMONO', line: 'luxury', category: 'Kimonos', price: 18500, sizes: ['S', 'M', 'L'], stock: 8, description: 'Hand-stitched jacquard silk kimono with tonal AURE monogram. Bateau collar, natural drape, fully lined. Made in limited runs of fifty.', featured: true, tag: 'MAISON', image: '/uploads/kimono_onyx.svg' });
store.addProduct({ name: 'IVORY PIQUÉ POLO', line: 'luxury', category: 'Tees', price: 8500, sizes: ['XS', 'S', 'M', 'L'], stock: 14, description: 'Two-ply mercerised cotton piqué, mother-of-pearl buttons, ribbed collar with hand-finished tips. An understatement you can feel.', featured: true, tag: '', image: '/uploads/polo_ivory.svg' });
store.addProduct({ name: 'NOIR MERINO KNIT', line: 'luxury', category: 'Knitwear', price: 12000, sizes: ['S', 'M', 'L', 'XL'], stock: 10, description: 'Extra-fine 16-gauge merino crewneck. Temperature-regulating, pill-resistant, naturally odour-free. The quiet staple.', featured: false, tag: 'MAISON', image: '/uploads/knit_noir.svg' });
store.addProduct({ name: 'PALLADIUM BELT', line: 'luxury', category: 'Accessories', price: 4200, sizes: ['One Size'], stock: 20, description: 'Full-grain leather belt, brushed palladium buckle with engraved AURE monogram. A detail that stays noticed.', featured: false, tag: 'NEW', image: '/uploads/belt_pd.svg' });

store.addAd({ title: 'THE NOISE COLLECTION', subtitle: 'New streetwear drop — heavyweight fabrics, limited pieces.', image: '/uploads/hero_ads.svg', placement: 'hero', active: true, order: 0 });
store.addAd({ title: 'VOLT TEES', subtitle: 'Heavyweight 220gsm. Streetwear classics.', image: '/uploads/banner_volt.svg', placement: 'banner', active: true, order: 1 });
store.addAd({ title: 'EMBER SHELLS', subtitle: 'Rain-proof jackets. Drop 02.', image: '/uploads/banner_ember.svg', placement: 'banner', active: true, order: 2 });
store.addAd({ title: 'THE ATELIER', subtitle: 'AURE Luxury Maison — Edition I. Gold-sealed pieces.', image: '/uploads/banner_gold.svg', placement: 'banner', active: true, order: 3 });

console.log('Seeded 8 products (4 streetwear, 4 luxury) + 4 ads with garment artwork.');
console.log('Replace placeholder art with real photos in the admin panel → /admin');