require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
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

/* ---------------- Uploads ---------------- */
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

/* ---------------- Locals ---------------- */
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || false;
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + (i.qty || 0), 0);
  res.locals.path = req.path;
  res.locals.rzpKeyId = rzpEnabled ? process.env.RAZORPAY_KEY_ID : null;
  res.locals.rzpEnabled = rzpEnabled;
  next();
});

/* ---------------- Admin auth helpers ---------------- */
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

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

/* ============================================================
   ADMIN ROUTES
============================================================ */

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login — AURE', error: null });
});

app.post('/admin/login', (req, res) => {
  const pw = process.env.ADMIN_PASSWORD || 'aureadmin';
  if (req.body.password === pw) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { title: 'Admin Login — AURE', error: 'Incorrect password, try again.' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAdmin, (req, res) => {
  const orders = store.getOrders();
  const products = store.getProducts();
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  res.render('admin/dashboard', {
    title: 'Dashboard — AURE Admin',
    stats: {
      products: products.length,
      orders: orders.length,
      pending,
      revenue: inr(revenue)
    },
    recentOrders: [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    inr
  });
});

/* ------ Products ------ */
app.get('/admin/products', requireAdmin, (req, res) => {
  res.render('admin/products', { title: 'Products — AURE Admin', products: store.getProducts() });
});

app.get('/admin/products/new', requireAdmin, (req, res) => {
  res.render('admin/product-form', { title: 'New Product — AURE Admin', product: null });
});

app.get('/admin/products/:id/edit', requireAdmin, (req, res) => {
  const product = store.getProduct(req.params.id);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', { title: 'Edit Product — AURE Admin', product });
});

app.post('/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  const data = req.body;
  if (req.file) data.image = '/uploads/' + req.file.filename;
  const product = store.addProduct(normalizeProductBody(data));
  res.redirect('/admin/products');
});

app.post('/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const data = req.body;
  if (req.file) data.image = '/uploads/' + req.file.filename;
  if (req.body.removeImage === '1') data.image = '';
  store.updateProduct(req.params.id, normalizeProductBody(data));
  res.redirect('/admin/products');
});

function normalizeProductBody(data) {
  const sizes = Array.isArray(data.sizes) ? data.sizes : [data.sizes].filter(Boolean);
  return {
    name: data.name,
    line: data.line,
    category: data.category,
    price: data.price,
    sizes,
    stock: data.stock,
    description: data.description,
    image: data.image,
    featured: data.featured,
    tag: data.tag
  };
}

function deleteImageIfUnused(image) {
  if (!image || !image.startsWith('/uploads/')) return;
  const used = store
    .getProducts()
    .concat(store.getAds())
    .map((x) => x.image || '')
    .filter(Boolean);
  if (used.includes(image)) return;
  const file = path.join(__dirname, 'public', image.replace(/^\//, ''));
  fs.unlink(file, () => {});
}

app.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  const product = store.getProduct(req.params.id);
  store.deleteProduct(req.params.id);
  if (product) deleteImageIfUnused(product.image);
  res.redirect('/admin/products');
});

/* ------ Ads ------ */
app.get('/admin/ads', requireAdmin, (req, res) => {
  res.render('admin/ads', { title: 'Ads & Banners — AURE Admin', ads: store.getAds() });
});

app.get('/admin/ads/new', requireAdmin, (req, res) => {
  res.render('admin/ad-form', { title: 'New Ad — AURE Admin', ad: null });
});

app.get('/admin/ads/:id/edit', requireAdmin, (req, res) => {
  const ad = store.getAds().find((a) => a.id === req.params.id);
  if (!ad) return res.redirect('/admin/ads');
  res.render('admin/ad-form', { title: 'Edit Ad — AURE Admin', ad });
});

app.post('/admin/ads', requireAdmin, upload.single('image'), (req, res) => {
  const data = req.body;
  if (req.file) data.image = '/uploads/' + req.file.filename;
  store.addAd(data);
  res.redirect('/admin/ads');
});

app.post('/admin/ads/:id', requireAdmin, upload.single('image'), (req, res) => {
  const data = req.body;
  if (req.file) data.image = '/uploads/' + req.file.filename;
  if (req.body.removeImage === '1') data.image = '';
  store.updateAd(req.params.id, data);
  res.redirect('/admin/ads');
});

app.post('/admin/ads/:id/delete', requireAdmin, (req, res) => {
  const ad = store.getAds().find((a) => a.id === req.params.id);
  store.deleteAd(req.params.id);
  if (ad) deleteImageIfUnused(ad.image);
  res.redirect('/admin/ads');
});

/* ------ Orders ------ */
app.get('/admin/orders', requireAdmin, (req, res) => {
  const orders = [...store.getOrders()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const status = req.query.status || '';
  const filtered = status ? orders.filter((o) => o.status === status) : orders;
  res.render('admin/orders', {
    title: 'Orders — AURE Admin',
    orders: filtered,
    status,
    inr
  });
});

app.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.redirect('/admin/orders');
  res.render('admin/order', { title: 'Order ' + order.id + ' — AURE Admin', order, inr });
});

app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  store.updateOrderStatus(req.params.id, req.body.status);
  res.redirect('/admin/orders/' + req.params.id);
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
  console.log('  Admin     →  http://localhost:' + PORT + '/admin');
  console.log('  Payments  →  ' + (rzpEnabled ? 'RAZORPAY LIVE' : 'DEMO MODE (set RAZORPAY_KEY_ID/SECRET in .env)'));
  console.log('');
});