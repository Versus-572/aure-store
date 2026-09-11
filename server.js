require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const Razorpay = require('razorpay');
const store = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- Razorpay client ---------------- */
const rzpEnabled = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
let rzp = null;
if (rzpEnabled) {
  rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

/* ---------------- Middleware ---------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'aure-dev-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

/* ---------------- Locals ---------------- */
app.use((req, res, next) => {
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + (i.qty || 0), 0);
  res.locals.path = req.path;
  res.locals.rzpKeyId = rzpEnabled ? process.env.RAZORPAY_KEY_ID : null;
  res.locals.rzpEnabled = rzpEnabled;
  next();
});

function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

/* ---------------- Cart helpers ---------------- */
function getCartDetail(cart) {
  if (!cart || !cart.length) return { items: [], subtotal: 0, shipping: 0, total: 0, count: 0 };
  const items = cart
    .map((c) => {
      const p = store.getProduct(c.productId);
      if (!p) return null;
      return {
        product: p,
        size: c.size || 'One Size',
        qty: c.qty,
        lineTotal: p.price * c.qty
      };
    })
    .filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  return { items, subtotal, shipping, total: subtotal + shipping, count: items.reduce((s, i) => s + i.qty, 0) };
}

/* ============================================================
   STOREFRONT ROUTES
============================================================ */

app.get('/', (req, res) => {
  const ads = store.getActiveAds().filter((a) => a.placement === 'hero');
  const banners = store.getActiveAds().filter((a) => a.placement === 'banner');
  const all = store.getProducts();
  const streetwear = all.filter((p) => p.line !== 'luxury');
  const luxury = all.filter((p) => p.line === 'luxury');
  res.render('index', {
    title: 'AURE — Streetwear',
    ads,
    banners,
    featured: store.getFeaturedProducts(),
    fresh: store.getNewProducts(4),
    streetwear: streetwear.slice(0, 4),
    luxury: luxury.slice(0, 4),
    streetwearCount: streetwear.length,
    luxuryCount: luxury.length
  });
});

app.get('/shop', (req, res) => {
  const line = req.query.line || 'all';
  const category = req.query.category || '';
  let products = store.getByLine(line);
  const cats = [...new Set(products.map((p) => p.category))];
  if (category) products = products.filter((p) => p.category === category);
  res.render('shop', {
    title: 'Shop — AURE',
    products,
    cats,
    category,
    line
  });
});

app.get('/product/:id', (req, res) => {
  const product = store.getProduct(req.params.id);
  if (!product) return res.status(404).render('404', { title: 'Not found' });
  res.render('product', { title: product.name + ' — AURE', product });
});

app.post('/cart/add', (req, res) => {
  const { productId, size, qty } = req.body;
  const p = store.getProduct(productId);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  req.session.cart = req.session.cart || [];
  const existing = req.session.cart.find((i) => i.productId === productId && (i.size || '') === (size || ''));
  if (existing) existing.qty = Math.min(existing.qty + (parseInt(qty, 10) || 1), p.stock || 99);
  else req.session.cart.push({ productId, size: size || '', qty: parseInt(qty, 10) || 1 });
  const count = req.session.cart.reduce((s, i) => s + i.qty, 0);
  res.json({ ok: true, count });
});

app.post('/cart/update', (req, res) => {
  const { index, qty } = req.body;
  const cart = req.session.cart || [];
  if (cart[index]) cart[index].qty = Math.max(1, parseInt(qty, 10) || 1);
  req.session.cart = cart;
  res.json({ ok: true, cart: getCartDetail(req.session.cart) });
});

app.post('/cart/remove', (req, res) => {
  const { index } = req.body;
  const cart = req.session.cart || [];
  cart.splice(index, 1);
  req.session.cart = cart;
  res.json({ ok: true, cart: getCartDetail(req.session.cart) });
});

app.get('/cart', (req, res) => {
  res.render('cart', { title: 'Cart — AURE', cart: getCartDetail(req.session.cart) });
});

app.get('/checkout', (req, res) => {
  const cart = getCartDetail(req.session.cart);
  if (!cart.items.length) return res.redirect('/cart');
  res.render('checkout', { title: 'Checkout — AURE', cart });
});

/* Create a Razorpay order for the current cart */
app.post('/api/checkout', async (req, res) => {
  const { name, email, phone, address, city, pincode, notes } = req.body || {};
  if (!name || !email || !phone || !address || !city || !pincode) {
    return res.status(400).json({ error: 'Please fill all billing fields' });
  }
  const cart = getCartDetail(req.session.cart);
  if (!cart.items.length) return res.status(400).json({ error: 'Your cart is empty' });

  let rzpOrderId = null;
  try {
    if (rzp) {
      const rzpOrder = await rzp.orders.create({
        amount: Math.round(cart.total * 100),
        currency: 'INR',
        receipt: 'aure_' + Date.now(),
        notes: { customer: name }
      });
      rzpOrderId = rzpOrder.id;
    }
  } catch (err) {
    console.error('Razorpay order create failed:', err.message);
    return res.status(500).json({ error: 'Payment gateway error, try again' });
  }

  let order;
  try {
    order = store.createOrder({
      name, email, phone, address, city, pincode, notes,
      items: cart.items.map((i) => ({
        product: i.product.name,
        productId: i.product.id,
        size: i.size,
        qty: i.qty,
        price: i.product.price
      })),
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      total: cart.total,
      razorpayOrderId: rzpOrderId,
      paymentMethod: rzp ? 'Razorpay (UPI / Cards / Netbanking)' : 'Demo / COD'
    });
  } catch (err) {
    console.error('Order save failed:', err);
    return res.status(500).json({ error: 'Could not place order' });
  }

  res.json({
    orderId: order.id,
    razorpayOrderId: rzpOrderId,
    amount: cart.total,
    currency: 'INR',
    rzpEnabled
  });
});

/* Confirm payment after Razorpay checkout success (or demo mode) */
app.post('/api/payment/success', (req, res) => {
  const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
  const order = store.getOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (razorpaySignature) {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(order.razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');
    if (expected !== razorpaySignature) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }
  }

  store.bindPaymentToOrder(orderId, razorpayPaymentId || null);
  req.session.cart = [];
  res.json({ ok: true, orderId });
});

app.get('/order/success/:id', (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).render('404', { title: 'Not found' });
  res.render('order-success', { title: 'Order Confirmed — AURE', order, inr });
});

/* ---------------- Misc ---------------- */
app.get('/500', (req, res) => {
  res.status(500).send('Server error');
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error: ' + (err.message || ''));
});

/* ---------------- Auto-seed on first run (Railway / fresh deploy) ---------------- */
if (!store.getProducts().length && !store.getAds().length) {
  console.log('No data found — running seed...');
  const { execSync } = require('child_process');
  try { execSync('node scripts/seed.js', { cwd: __dirname, stdio: 'inherit' }); } catch (e) { console.error('Seed failed:', e.message); }
}

app.listen(PORT, () => {
  console.log('');
  console.log('  ⬤ AURE streetwear store running');
  console.log('  ────────────────────────────────');
  console.log('  Store     →  http://localhost:' + PORT);
  console.log('  Payments  →  ' + (rzpEnabled ? 'RAZORPAY LIVE' : 'DEMO MODE (set RAZORPAY_KEY_ID/SECRET in .env)'));
  console.log('');
});
