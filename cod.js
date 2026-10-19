/* Chocoeta Cash-on-Delivery checkout. Load AFTER script.js (it overrides startCheckout). */
const COD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxDJQ3GzxrR14WiRDxabMnHlx6kkbDJfkBproDC2CzKwIlL_qoW7KEsDjrMhnsuijpMGA/exec';
const COD_FREE_SHIPPING_ABOVE = 2499;
const COD_SHIPPING_FEE = 200;   // keep in sync with apps-script.gs (display only; server decides)

(function(){
  const ov = document.createElement('div');
  ov.className = 'cod-ov';
  ov.innerHTML = `
  <div class="cod-box" role="dialog" aria-modal="true">
    <form id="codForm" novalidate>
      <h3>Cash on Delivery</h3>
      <p class="cod-sub">Pay in cash when your chocolates arrive.</p>
      <label for="codName">Full name</label><input id="codName" autocomplete="name" required>
      <label for="codPhone">Phone / WhatsApp</label><input id="codPhone" type="tel" autocomplete="tel" placeholder="03XXXXXXXXX" required>
      <label for="codCity">City</label><input id="codCity" autocomplete="address-level2" value="Karachi" required>
      <label for="codAddr">Full address</label><textarea id="codAddr" autocomplete="street-address" required></textarea>
      <label for="codNotes">Notes (optional)</label><input id="codNotes">
      <label for="codCoupon">Promo code (optional)</label><input id="codCoupon" placeholder="CHOCO10">
      <input class="cod-hp" id="codWebsite" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="cod-sum" id="codSum"></div>
      <div class="cod-err" id="codErr"></div>
      <button class="cod-btn" id="codSubmit" type="submit">Place Order</button>
      <button class="cod-x" id="codCancel" type="button">Back to cart</button>
    </form>
    <div class="cod-done" id="codDone" style="display:none">
      <div class="e">🍫</div><h3>Order received!</h3>
      <p class="cod-sub" id="codDoneMsg"></p>
      <button class="cod-btn" id="codClose" type="button">Continue Shopping</button>
    </div>
  </div>`;
  document.body.appendChild(ov);

  const $ = id => document.getElementById(id);
  let pending = [], orderId = '';

  function lines(){ return pending.map(i => ({...i, p: shopProducts[i.productId]})).filter(i => i.p); }
  function renderSum(){
    const sub = lines().reduce((s,i) => s + i.p.price * i.qty, 0);
    const ship = sub >= COD_FREE_SHIPPING_ABOVE ? 0 : COD_SHIPPING_FEE;
    const rows = lines().map(i => `<div><span>${i.p.name} × ${i.qty}</span><span>Rs ${(i.p.price*i.qty).toLocaleString('en-IN')}</span></div>`).join('');
    $('codSum').innerHTML = rows +
      `<div><span>Delivery</span><span>${ship ? 'Rs ' + ship : 'Free'}</span></div>` +
      `<div class="t"><span>Pay on delivery</span><span>Rs ${(sub+ship).toLocaleString('en-IN')}</span></div>` +
      `<div style="font-size:.7rem;opacity:.6;display:block">Promo discounts are applied when your order is confirmed.</div>`;
  }
  function close(){ ov.classList.remove('open'); document.body.style.overflow = ''; }

  // Overrides the payment-redirect version in script.js
  window.startCheckout = async function(items){
    pending = items;
    orderId = 'CE-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
    $('codForm').style.display = ''; $('codDone').style.display = 'none';
    $('codErr').textContent = ''; $('codSubmit').disabled = false; $('codSubmit').textContent = 'Place Order';
    renderSum();
    if (typeof closeCart === 'function') closeCart();
    ov.classList.add('open'); document.body.style.overflow = 'hidden';
  };

  $('codCancel').onclick = close;
  $('codClose').onclick = close;
  ov.addEventListener('click', e => { if (e.target === ov) close(); });

  $('codForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('codErr'); err.textContent = '';
    if (COD_ENDPOINT.startsWith('PASTE_')) { err.textContent = 'Orders are not set up yet. Please contact us on WhatsApp.'; return; }
    let phone = $('codPhone').value.replace(/[\s-]/g, '');
    if (phone.startsWith('+92')) phone = phone; else if (phone.startsWith('92')) phone = '+' + phone;
    const data = {
      orderId, items: pending.map(({productId, qty}) => ({productId, qty})),
      name: $('codName').value.trim(), phone, city: $('codCity').value.trim(),
      address: $('codAddr').value.trim(), notes: $('codNotes').value.trim(),
      coupon: $('codCoupon').value.trim(), website: $('codWebsite').value
    };
    if (data.name.length < 2) return void (err.textContent = 'Please enter your name.');
    if (!/^(\+92|0)3\d{9}$/.test(data.phone)) return void (err.textContent = 'Enter a valid mobile number, e.g. 03XXXXXXXXX.');
    if (!data.city) return void (err.textContent = 'Please enter your city.');
    if (data.address.length < 10) return void (err.textContent = 'Please enter your full address.');

    const btn = $('codSubmit'); btn.disabled = true; btn.textContent = 'Placing order…';
    try {
      const res = await fetch(COD_ENDPOINT, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(data)});
      const r = await res.json();
      if (!r.ok) throw new Error(r.error || 'Could not place order.');
      // clear the cart only if this order came from the cart (not "Buy Now")
      if (JSON.stringify(cart.map(({productId, qty}) => ({productId, qty}))) === JSON.stringify(data.items)) { cart = []; renderCart(); }
      $('codForm').style.display = 'none'; $('codDone').style.display = '';
      $('codDoneMsg').innerHTML = `Order <strong>${r.orderId || orderId}</strong>. We will confirm by phone/WhatsApp before dispatch.` +
        (r.total ? `<br>Please keep <strong>Rs ${Number(r.total).toLocaleString('en-IN')}</strong> ready in cash.` : '');
    } catch (ex) {
      err.textContent = (ex.message && ex.message !== 'Failed to fetch') ? ex.message : 'Connection problem. Please try again.';
      btn.disabled = false; btn.textContent = 'Place Order';
    }
  });
})();
