const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Error reading ' + file, err);
    return fallback;
  }
}

function writeJson(file, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------- Products ---------------- */

function getProducts() {
  return readJson(PRODUCTS_FILE, []);
}

function getProduct(id) {
  return getProducts().find((p) => p.id === id) || null;
}

function getFeaturedProducts() {
  return getProducts()
    .filter((p) => p.featured)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getNewProducts(limit) {
  return [...getProducts()]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit);
}

function addProduct(data) {
  const products = getProducts();
  const product = {
    id: uid('prod'),
    name: data.name || 'Untitled',
    line: data.line || 'streetwear',
    category: data.category || 'Tees',
    price: Math.round(Number(data.price) || 0),
    sizes: (data.sizes || []).filter(Boolean),
    stock: Math.max(0, parseInt(data.stock, 10) || 0),
    description: data.description || '',
    image: data.image || '',
    featured: data.featured === 'on' || data.featured === true,
    tag: data.tag || '',
    createdAt: new Date().toISOString()
  };
  products.push(product);
  writeJson(PRODUCTS_FILE, products);
  return product;
}

function updateProduct(id, data) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const existing = products[idx];
  products[idx] = {
    ...existing,
    name: data.name || existing.name,
    line: data.line || existing.line,
    category: data.category || existing.category,
    price: Math.round(Number(data.price) || 0),
    sizes: (data.sizes || []).filter(Boolean),
    stock: Math.max(0, parseInt(data.stock, 10) !== undefined && data.stock !== '' ? parseInt(data.stock, 10) : existing.stock),
    description: data.description !== undefined ? data.description : existing.description,
    image: data.image !== undefined ? data.image : existing.image,
    featured: data.featured === 'on' || data.featured === true,
    tag: data.tag || ''
  };
  writeJson(PRODUCTS_FILE, products);
  return products[idx];
}

function getByLine(line) {
  if (!line || line === 'all') return getProducts();
  return getProducts().filter((p) => p.line === line);
}

function deleteProduct(id) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  writeJson(PRODUCTS_FILE, products);
  return true;
}

/* ---------------- Ads ---------------- */

function getAds() {
  return readJson(ADS_FILE, []);
}

function getActiveAds() {
  return getAds().filter((a) => a.active).sort((a, b) => (a.order || 0) - (b.order || 0));
}

function addAd(data) {
  const ads = getAds();
  const ad = {
    id: uid('ad'),
    title: data.title || 'Ad',
    subtitle: data.subtitle || '',
    link: data.link || '',
    image: data.image || '',
    placement: data.placement || 'banner',
    active: data.active === 'on' || data.active === true,
    order: parseInt(data.order, 10) || 0,
    createdAt: new Date().toISOString()
  };
  ads.push(ad);
  writeJson(ADS_FILE, ads);
  return ad;
}

function updateAd(id, data) {
  const ads = getAds();
  const idx = ads.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const existing = ads[idx];
  ads[idx] = {
    ...existing,
    title: data.title || existing.title,
    subtitle: data.subtitle !== undefined ? data.subtitle : existing.subtitle,
    link: data.link !== undefined ? data.link : existing.link,
    image: data.image !== undefined ? data.image : existing.image,
    placement: data.placement !== undefined ? data.placement : existing.placement,
    active: data.active === 'on' || data.active === true,
    order: data.order !== undefined && data.order !== '' ? parseInt(data.order, 10) : existing.order
  };
  writeJson(ADS_FILE, ads);
  return ads[idx];
}

function deleteAd(id) {
  const ads = getAds();
  const idx = ads.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  ads.splice(idx, 1);
  writeJson(ADS_FILE, ads);
  return true;
}

/* ---------------- Orders ---------------- */

function getOrders() {
  return readJson(ORDERS_FILE, []);
}

function getOrder(id) {
  return getOrders().find((o) => o.id === id) || null;
}

function createOrder(data) {
  const orders = getOrders();
  const order = {
    id: uid('ord'),
    customer: {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      pincode: data.pincode || ''
    },
    items: data.items || [],
    subtotal: Math.round(Number(data.subtotal) || 0),
    shipping: Math.round(Number(data.shipping) || 0),
    total: Math.round(Number(data.total) || 0),
    currency: 'INR',
    razorpayOrderId: data.razorpayOrderId || null,
    razorpayPaymentId: data.razorpayPaymentId || null,
    paymentMethod: data.paymentMethod || 'Razorpay',
    status: data.status || 'pending', // pending | paid | shipped | delivered | cancelled
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeJson(ORDERS_FILE, orders);
  return order;
}

function updateOrderStatus(id, status) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx].status = status;
  writeJson(ORDERS_FILE, orders);
  return orders[idx];
}

function bindPaymentToOrder(id, razorpayPaymentId) {
  const order = getOrder(id);
  if (!order) return null;
  order.razorpayPaymentId = razorpayPaymentId;
  order.status = 'paid';
  writeJson(ORDERS_FILE, getOrders());
  return order;
}

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewProducts,
  getByLine,
  addProduct,
  updateProduct,
  deleteProduct,
  getAds,
  getActiveAds,
  addAd,
  updateAd,
  deleteAd,
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  bindPaymentToOrder
};