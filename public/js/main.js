/* AURE storefront interactions */

document.addEventListener('DOMContentLoaded', () => {
  initTilt();
  initDropsLink();
  initProductPage();
  initCartPage();
  initCheckout();
  initReveal();
  initParallax();
});

/* ---------------- scroll reveal ---------------- */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const siblings = Array.from(el.parentElement.children).filter((c) => c === el || c.matches('.reveal'));
          const idx = siblings.indexOf(el);
          el.style.transitionDelay = Math.min(idx * 90, 540) + 'ms';
          setTimeout(() => { el.style.transitionDelay = ''; }, 1000);
          el.classList.add('in');
          setTimeout(() => {
            el.classList.remove('reveal');
            el.style.transitionDelay = '';
          }, 1500);
          io.unobserve(el);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------------- subtle scroll parallax ---------------- */
function initParallax() {
  const els = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!els.length || window.matchMedia('(hover: none)').matches) return;
  let ticking = false;
  const apply = () => {
    els.forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax')) || 10;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > window.innerHeight + 80) return;
      const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * (speed / 1200);
      el.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(apply); ticking = true; }
  }, { passive: true });
  apply();
}

/* ---------------- 3D tilt cards ---------------- */
function initTilt() {
  const cards = document.querySelectorAll('.tilt-card');
  if (!cards.length || window.matchMedia('(hover: none)').matches) return;
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        'perspective(900px) rotateX(' + (-py * 4.5).toFixed(2) + 'deg) rotateY(' + (px * 4.5).toFixed(2) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ---------------- Drops nav link (smooth scroll on home) ---------------- */
function initDropsLink() {
  const link = document.querySelector('.nav-drop-link');
  if (!link) return;
  link.addEventListener('click', (e) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      const el = document.getElementById('drops');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#drops';
    }
  });
}

/* ---------------- Product page ---------------- */
function initProductPage() {
  const addBtn = document.getElementById('add-to-cart');
  if (!addBtn) return;

  let size = null;
  const qtyEl = document.getElementById('q-val');
  let qty = 1;

  document.querySelectorAll('.size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      size = b.dataset.size;
    });
  });

  document.getElementById('q-minus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyEl.textContent = qty;
  });
  document.getElementById('q-plus').addEventListener('click', () => {
    qty = Math.min(10, qty + 1);
    qtyEl.textContent = qty;
  });

  addBtn.addEventListener('click', async () => {
    const hasSizeBtns = document.querySelectorAll('.size-btn').length > 0;
    if (hasSizeBtns && !size) {
      pulseSizes();
      return;
    }
    const res = await fetch('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: addBtn.dataset.id, size, qty })
    });
    if (res.ok) {
      const data = await res.json();
      setCartCount(data.count);
      flashButton(addBtn, 'ADDED ✓');
    }
  });
}

function pulseSizes() {
  const wrap = document.querySelector('.p-sizes');
  if (!wrap) return;
  wrap.style.animation = 'none';
  void wrap.offsetHeight;
  wrap.style.animation = 'pulse .5s ease';
  const lbl = wrap.querySelector('.lbl');
  if (lbl) lbl.textContent = 'PICK A SIZE';
  setTimeout(() => { if (lbl) lbl.textContent = 'SIZE'; }, 1400);
}

function flashButton(btn, text) {
  const old = btn.innerHTML;
  btn.innerHTML = text;
  btn.style.background = '#fff';
  setTimeout(() => { btn.innerHTML = old; btn.style.background = ''; }, 900);
}

function setCartCount(n) {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = n;
}

/* ---------------- Cart page ---------------- */
function initCartPage() {
  document.querySelectorAll('.ci-update').forEach((b) => {
    b.addEventListener('click', async () => {
      const qtyEl = b.parentElement.querySelector('.ci-qty');
      const qty = b.dataset.op === 'plus' ? parseInt(qtyEl.textContent, 10) + 1 : parseInt(qtyEl.textContent, 10) - 1;
      if (qty < 1) {
        await post('/cart/remove', { index: +b.dataset.index });
      } else {
        await post('/cart/update', { index: +b.dataset.index, qty });
      }
      location.reload();
    });
  });

  document.querySelectorAll('.ci-remove').forEach((b) => {
    b.addEventListener('click', async () => {
      await post('/cart/remove', { index: +b.dataset.index });
      location.reload();
    });
  });
}

async function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/* ---------------- Checkout + Razorpay ---------------- */
function initCheckout() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('pay-error').textContent = '';

    const data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      pincode: form.pincode.value.trim(),
      notes: form.notes ? form.notes.value.trim() : ''
    };

    if (!data.name || !data.phone || !data.email || !data.address || !data.city || !data.pincode) {
      document.getElementById('pay-error').textContent = 'Please fill in all required fields.';
      return;
    }

    const payBtn = document.getElementById('pay-btn');
    const original = payBtn.innerHTML;
    payBtn.disabled = true;
    payBtn.innerHTML = 'CREATING ORDER…';

    let order;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Checkout failed');
      order = json;
    } catch (err) {
      payBtn.disabled = false;
      payBtn.innerHTML = original;
      document.getElementById('pay-error').textContent = err.message || 'Something went wrong. Try again.';
      return;
    }

    payBtn.disabled = false;
    payBtn.innerHTML = original;

    if (!order.rzpEnabled || typeof Razorpay === 'undefined') {
      /* demo mode — confirm locally */
      await confirmPayment(order.orderId, null, null);
      return;
    }

    const razorpayOptions = {
      key: RZP_KEY,
      amount: order.amount * 100,
      currency: 'INR',
      name: 'AURE',
      description: 'AURE streetwear order',
      order_id: order.razorpayOrderId,
      prefill: { name: data.name, email: data.email, contact: data.phone },
      theme: { color: '#d6ff3f' },
      handler(response) {
        confirmPayment(order.orderId, response.razorpay_payment_id, response.razorpay_signature);
      },
      modal: {
        ondismiss() {
          document.getElementById('pay-error').textContent = 'Payment window closed. Your order is saved as pending.';
        }
      }
    };

    const rzpInst = new Razorpay(razorpayOptions);
    rzpInst.open();
  });
}

async function confirmPayment(orderId, paymentId, signature) {
  const res = await fetch('/api/payment/success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, razorpayPaymentId: paymentId, razorpaySignature: signature })
  });
  const json = await res.json();
  if (res.ok || json.ok) {
    window.location.href = '/order/success/' + orderId;
  } else {
    document.getElementById('pay-error').textContent = json.error || 'Payment verification failed.';
  }
}