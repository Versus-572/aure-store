/* Integration smoke test — runs against a live server on :3000 */
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const BASE = 'http://localhost:3000';
let cookie = '';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  [' + extra + ']' : '')); }
}

async function req(method, url, { body, headers = {}, form } = {}) {
  const h = { ...headers };
  if (cookie) h.cookie = cookie;
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    if (!h['content-type']) h['content-type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(BASE + url, { method, headers: h, body: payload, redirect: 'manual' });
  const setc = res.headers.get('set-cookie');
  if (setc) cookie = setc.split(';')[0];
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json, location: res.headers.get('location') };
}

(async () => {
  const t0 = performance.now();
  console.log('== STOREFRONT ==');

  let r = await req('GET', '/');
  ok('home renders', r.status === 200 && r.text.includes('AURE'));

  r = await req('GET', '/shop');
  ok('shop renders', r.status === 200 && r.text.includes('DROP'));

  r = await req('GET', '/admin');
  ok('admin redirects when logged out', r.status === 302 && r.location === '/admin/login');

  r = await req('GET', '/product/nope');
  ok('bad product 404', r.status === 404);

  console.log('== CART ==');

  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json')));
  const pid = products[0].id;

  r = await req('POST', '/cart/add', { body: { productId: pid, size: 'M', qty: 2 } });
  ok('add to cart', r.status === 200 && r.json.ok && r.json.count === 2);

  r = await req('GET', '/cart');
  ok('cart page shows item', r.status === 200 && r.text.includes(products[0].name));

  r = await req('GET', '/checkout');
  ok('checkout renders with cart', r.status === 200 && r.text.includes('checkout-form'));

  console.log('== CHECKOUT (demo mode) ==');

  r = await req('POST', '/api/checkout', { body: {} });
  ok('checkout rejects empty fields', r.status === 400);

  r = await req('POST', '/api/checkout', {
    body: { name: 'Smoke Test', email: 't@aure.in', phone: '9999999999', address: '1 Main Rd', city: 'Mumbai', pincode: '400001' }
  });
  ok('checkout creates order', r.status === 200 && r.json.orderId && Number(r.json.amount) > 0, r.text.slice(0, 120));
  const orderId = r.json ? r.json.orderId : null;
  const expectedTotal = Math.round(products[0].price * 2) + (products[0].price * 2 >= 1499 ? 0 : 99);
  ok('amount = price*qty + shipping', Number(r.json.amount) === expectedTotal, 'got ' + r.json.amount + ' want ' + expectedTotal);

  r = await req('POST', '/api/payment/success', { body: { orderId } });
  ok('payment success (demo)', r.status === 200 && r.json.ok);

  r = await req('GET', '/order/success/' + orderId);
  ok('success page renders', r.status === 200 && r.text.includes('LOCKED'));

  r = await req('GET', '/cart');
  ok('cart cleared after order', r.status === 200 && !r.text.includes('ORDER SUMMARY'));

  console.log('== ADMIN ==');

  r = await req('POST', '/admin/login', { body: 'password=wrongpass', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  ok('wrong password rejected', r.status === 401);

  r = await req('POST', '/admin/login', { body: 'password=aureadmin', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  ok('correct password logs in', r.status === 302 && r.location === '/admin');

  r = await req('GET', '/admin');
  ok('dashboard renders', r.status === 200 && r.text.includes('DASHBOARD'));

  r = await req('GET', '/admin/products');
  ok('products page renders', r.status === 200 && r.text.includes('PRODUCTS'));

  r = await req('GET', '/admin/ads');
  ok('ads page renders', r.status === 200 && r.text.includes('ADS'));

  r = await req('GET', '/admin/orders');
  ok('orders page renders', r.status === 200 && r.text.includes('ORDERS'));

  r = await req('GET', '/admin/orders/' + orderId);
  ok('order detail renders', r.status === 200);

  r = await req('POST', '/admin/orders/' + orderId + '/status', { body: 'status=shipped', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  ok('update order status', r.status === 302);

  console.log('== ADMIN FILE UPLOAD ==');

  const png = fs.readFileSync(path.join(__dirname, 'fixture.png'));
  const fd = new FormData();
  fd.append('name', 'TEST UPLOAD TEE');
  fd.append('price', '1299');
  fd.append('category', 'Tees');
  fd.append('stock', '7');
  fd.append('sizes', 'M');
  fd.append('sizes', 'L');
  fd.append('image', new Blob([png], { type: 'image/png' }), 'janedoe.png');

  r = await req('POST', '/admin/products', { form: fd });
  ok('product created with upload', r.status === 302, 'status ' + r.status);

  const afterProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json')));
  const created = afterProducts.find((p) => p.name === 'TEST UPLOAD TEE');
  ok('product persisted', !!created);
  ok('image saved + reference', !!created && /^\/uploads\/.+\.png$/.test(created.image), created && created.image);
  const imgName = created && created.image ? created.image.split('/').pop() : null;
  const imgPath = imgName ? path.join(__dirname, '..', 'public', 'uploads', imgName) : null;
  ok('image file exists on disk', !!imgPath && fs.existsSync(imgPath));
  if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  r = await req('POST', '/admin/products/' + created.id + '/delete', { form: new FormData() });
  ok('product deleted', r.status === 302);
  const still = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json')));
  ok('deletion persisted', !still.find((p) => p.id === created.id));

  r = await req('POST', '/admin/logout', { form: new FormData() });
  ok('logout', r.status === 302);
  r = await req('GET', '/admin');
  ok('admin locked after logout', r.status === 302 && r.location === '/admin/login');

  console.log('');
  console.log((fail ? 'FAILURES: ' + fail : 'ALL GOOD') + ' — ' + pass + ' passed, ' + fail + ' failed in ' + Math.round(performance.now() - t0) + 'ms');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR', e); process.exit(1); });