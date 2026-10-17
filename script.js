(function(){
  var order = ['etaHdr','etaC1','etaC2','etaC3','etaMani','etaMW'];
  var delays = [0, 120, 260, 400, 560, 720];
  function reveal(){
    order.forEach(function(id, i){
      var el = document.getElementById(id);
      if(!el) return;
      setTimeout(function(){
        el.classList.remove('wr');
        el.classList.add('rv');
      }, delays[i]);
    });
  }
  var done = false;
  function go(){ if(done) return; done=true; reveal(); }
  var sec = document.getElementById('eta-root');
  // IntersectionObserver — fires as soon as section enters viewport
  if(sec && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(e){
      if(e[0].isIntersecting){ go(); io.disconnect(); }
    },{threshold:0.05});
    io.observe(sec);
  }
  // Scroll fallback
  window.addEventListener('scroll', function(){
    if(done) return;
    var r = sec && sec.getBoundingClientRect();
    if(r && r.top < window.innerHeight * 0.95) go();
  },{passive:true});
  // DOMContentLoaded — fires if section already in view on page load
  document.addEventListener('DOMContentLoaded', function(){
    var r = sec && sec.getBoundingClientRect();
    if(r && r.top < window.innerHeight) go();
  });
  // Hard fallback — always reveal after 500ms no matter what
  setTimeout(go, 500);
})();

/* ══════════════════════════════════ */

/* Bokeh */
(function(){
  const c = document.getElementById('bokehWrap');
  for(let i=0;i<20;i++){
    const d=document.createElement('div');
    d.className='bokeh-dot';
    const s=3+Math.random()*6;
    d.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${8+Math.random()*12}s;animation-delay:${Math.random()*10}s;`;
    c.appendChild(d);
  }
})();

/* Scroll header */
window.addEventListener('scroll',()=>{
  document.getElementById('mainHeader').classList.toggle('elevated',window.scrollY>40);
});

/* Mob nav */
function openMob(){ document.getElementById('mobNav').classList.add('open'); }
function closeMob(){ document.getElementById('mobNav').classList.remove('open'); }

/* Scroll reveal */
const sro=new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); sro.unobserve(e.target); } });
},{threshold:0.1,rootMargin:'0px 0px -50px 0px'});
document.querySelectorAll('.sr').forEach(el=>sro.observe(el));

/* Filter tabs */
document.querySelectorAll('.filter-tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.filter-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
  });
});

/* Flavour chips */
document.querySelectorAll('.fl-chip').forEach(c=>{
  c.addEventListener('click',()=>{
    document.querySelectorAll('.fl-chip').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
  });
});

/* Qty */
function changeQty(d){
  const i=document.getElementById('qtyInput');
  i.value=Math.max(1,Math.min(99,parseInt(i.value)+d));
}

/* Cart state */
let cart=[];
const shopProducts={
  'choco-nova-combo':{name:'Choco Nova Combo',price:999,img:'images/Chocolate_bars_and_treat_jar_2K_20261001105428.jpg'},
  'nova-bar':{name:'Nova Bar',price:99,img:'images/4.png'},
  'nova-classic-jar':{name:'Nova Classic Jar',price:399,img:'images/CHOCOETA_NOVA_Classic_jar_chocol…_202607110616.jpeg'}
};

function cartTotal(){ return cart.reduce((s,i)=>s+i.price*i.qty,0); }

function renderCart(){
  const cnt=cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById('cartCountNav').textContent='('+cnt+')';
  document.getElementById('cartTotalVal').textContent='Rs '+cartTotal().toLocaleString('en-IN');
  const body=document.getElementById('cartBody');
  if(!cart.length){
    body.innerHTML='<div class="cart-empty-msg"><div class="ei">🍫</div><p>Your cart is empty.<br>Add something delicious!</p></div>';
    return;
  }
  body.innerHTML=cart.map((item,idx)=>`
    <div class="c-item">
      <img class="c-item-img" src="${item.img}" alt="${item.name}">
      <div>
        <div class="c-item-name">${item.name}</div>
        <div class="c-item-meta">Qty: ${item.qty} &nbsp;·&nbsp; Rs ${item.price} each</div>
        <span class="c-item-rm" onclick="removeItem(${idx})">Remove</span>
      </div>
      <div class="c-item-price">Rs ${(item.price*item.qty).toLocaleString('en-IN')}</div>
    </div>
  `).join('');
}

function removeItem(idx){ cart.splice(idx,1); renderCart(); toast('Item removed'); }

function addToCart(productId,btn){
  const product=shopProducts[productId];
  if(!product){ toast('This product is not available.'); return; }
  const ex=cart.find(i=>i.productId===productId);
  if(ex){ ex.qty++; } else { cart.push({productId,...product,qty:1}); }
  renderCart();
  toast('Added to cart! 🍫');
  confettiBurst(btn);
  if(btn){ const o=btn.textContent; btn.textContent='✓ Added'; setTimeout(()=>btn.textContent=o,1500); }
}

function addFeatured(){
  const qty=parseInt(document.getElementById('qtyInput').value)||1;
  const product=shopProducts['nova-classic-jar'];
  const ex=cart.find(i=>i.productId==='nova-classic-jar');
  if(ex){ ex.qty+=qty; } else { cart.push({productId:'nova-classic-jar',...product,qty}); }
  renderCart();
  toast(`Added ${qty} to cart! 🍫`);
  confettiBurst(document.querySelector('.feat-acts .btn-fill'));
  openCart();
}

async function proceedToCheckout(){
  if(!cart.length){ toast('Your cart is empty.'); return; }
  await startCheckout(cart.map(({productId,qty})=>({productId,qty})));
}

async function buyFeaturedNow(){
  const qty=Math.max(1,Math.min(99,parseInt(document.getElementById('qtyInput').value)||1));
  await startCheckout([{productId:'nova-classic-jar',qty}]);
}

async function startCheckout(items){
  const button=document.getElementById('cartCheckout');
  const oldText=button?.textContent;
  if(button){button.disabled=true;button.textContent='Connecting to secure checkout…';}
  try{
    const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'Could not start checkout.');
    window.location.assign(result.checkoutUrl);
  }catch(error){
    toast(error.message||'Could not connect to checkout. Please try again.');
    if(button){button.disabled=false;button.textContent=oldText;}
  }
}

function openCart(){
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeCart(){
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow='';
}

/* Toast */
let tt;
function toast(msg){
  const e=document.getElementById('toastEl');
  e.textContent=msg; e.classList.add('show');
  clearTimeout(tt); tt=setTimeout(()=>e.classList.remove('show'),2800);
}

/* Newsletter */
function subscribe(){
  const v=document.getElementById('nlInput').value.trim();
  if(!v||!v.includes('@')){ toast('Please enter a valid email!'); return; }
  toast('Welcome to the Chocoeta family! 🍫');
  document.getElementById('nlInput').value='';
}

/* ══════════════════════════════════ */

/* ══════════════════════════════════════
   1. MAGNETIC CURSOR
══════════════════════════════════════ */
(function(){
  const outer = document.getElementById('mag-cursor-outer');
  const inner = document.getElementById('mag-cursor-inner');
  const label = document.getElementById('mag-cursor-label');
  if(!outer) return;

  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let ox = mx, oy = my;
  let raf;

  // Smooth outer follows with lag
  function animOuter(){
    ox += (mx - ox) * 0.12;
    oy += (my - oy) * 0.12;
    outer.style.transform = `translate(${ox}px, ${oy}px) translate(-50%,-50%)`;
    label.style.left = ox + 'px';
    label.style.top  = oy + 'px';
    raf = requestAnimationFrame(animOuter);
  }
  animOuter();

  // Inner snaps instantly
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    inner.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });

  // Magnetic pull on interactive elements
  const magnetEls = document.querySelectorAll('button, a, .p-card, .eta-card, .tilt-card, .why-card');
  magnetEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('cursor-hover');
      // Set label from data-cursor or element type
      const lbl = el.dataset.cursor || (el.tagName==='A' ? 'Go' : el.classList.contains('p-card') ? 'View' : '');
      label.textContent = lbl;
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover');
      label.textContent = '';
      // Reset any magnetic offset
      el.style.transform = '';
    });
    // Magnetic pull effect
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width/2;
      const cy = r.top  + r.height/2;
      const dx = (e.clientX - cx) * 0.18;
      const dy = (e.clientY - cy) * 0.18;
      if(!el.classList.contains('p-card') && !el.classList.contains('eta-card')){
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    });
  });

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => { outer.style.opacity='0'; inner.style.opacity='0'; });
  document.addEventListener('mouseenter', () => { outer.style.opacity='1'; inner.style.opacity='1'; });
})();

/* ══════════════════════════════════════
   2. 3D TILT ON HOVER — PRODUCT CARDS
══════════════════════════════════════ */
(function(){
  const MAX_TILT = 14; // degrees

  document.querySelectorAll('.tilt-card').forEach(card => {
    // Inject shine layer
    const shine = document.createElement('div');
    shine.className = 'tilt-shine';
    card.style.position = 'relative';
    card.appendChild(shine);

    // Inject depth wrapper around card content
    // (we tilt the card itself, shine tracks mouse)

    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const px = x / r.width;   // 0 → 1
      const py = y / r.height;  // 0 → 1

      const rotX = (py - 0.5) * -MAX_TILT; // tilt X axis
      const rotY = (px - 0.5) *  MAX_TILT; // tilt Y axis

      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04)`;
      card.style.boxShadow = `
        ${-rotY * 1.2}px ${rotX * 1.2}px 40px rgba(0,0,0,0.45),
        0 0 ${30 + Math.abs(rotY)*2}px rgba(200,146,42,${0.1 + Math.abs(rotY)*0.01})
      `;
      card.style.zIndex = '10';
      card.style.transition = 'box-shadow 0.1s, transform 0.1s';

      // Shine follows mouse
      shine.style.setProperty('--shine-x', (px * 100) + '%');
      shine.style.setProperty('--shine-y', (py * 100) + '%');
      shine.style.background = `radial-gradient(circle at ${px*100}% ${py*100}%,
        rgba(255,255,255,0.10) 0%, transparent 60%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.6s';
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      card.style.boxShadow = '';
      card.style.zIndex = '';
      shine.style.background = '';
    });

    // Subtle entry pop
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.2s, box-shadow 0.2s';
    });
  });
})();

/* ══════════════════════════════════════
   3. CONFETTI BURST — ADD TO CART
══════════════════════════════════════ */
function confettiBurst(triggerEl) {
  // Get origin point
  let ox = window.innerWidth / 2, oy = window.innerHeight / 2;
  if (triggerEl) {
    const r = triggerEl.getBoundingClientRect();
    ox = r.left + r.width / 2;
    oy = r.top  + r.height / 2;
  }

  // Ripple on button
  if (triggerEl) {
    triggerEl.style.position = 'relative';
    triggerEl.style.overflow = 'hidden';
    const rpl = document.createElement('span');
    rpl.className = 'cart-ripple';
    const sz = Math.max(triggerEl.offsetWidth, triggerEl.offsetHeight);
    rpl.style.cssText = `width:${sz}px;height:${sz}px;left:${triggerEl.offsetWidth/2 - sz/2}px;top:${triggerEl.offsetHeight/2 - sz/2}px;`;
    triggerEl.appendChild(rpl);
    setTimeout(() => rpl.remove(), 700);
  }

  const COLORS = ['#c8922a','#e8b84b','#f7e8c0','#fdf4e3','#4a2610','#ffffff','#e8b84b'];
  const SHAPES = ['🍫','🍬','✨','🎁','⭐','💛'];
  const COUNT  = 55;
  const EMOJI_COUNT = 14;

  // Geometric confetti pieces
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';

    const angle  = (Math.random() * 360) * (Math.PI / 180);
    const speed  = 120 + Math.random() * 280;
    const cx     = Math.cos(angle) * speed + 'px';
    const cy     = (Math.sin(angle) * speed - 60 - Math.random()*80) + 'px';
    const cr     = (Math.random() * 720 - 360) + 'deg';
    const dur    = 0.7 + Math.random() * 0.7;
    const delay  = Math.random() * 0.15;
    const size   = 5 + Math.random() * 9;
    const isRect = Math.random() > 0.45;
    const color  = COLORS[Math.floor(Math.random() * COLORS.length)];

    el.style.cssText = `
      left:${ox}px; top:${oy}px;
      width:${isRect ? size : size*0.6}px;
      height:${isRect ? size*0.45 : size}px;
      background:${color};
      border-radius:${isRect ? '1px' : '50%'};
      --cx:${cx}; --cy:${cy}; --cr:${cr};
      animation-duration:${dur}s;
      animation-delay:${delay}s;
      opacity:0;
    `;
    // start at opacity 0, animate
    setTimeout(() => { el.style.opacity = '1'; }, delay * 1000);

    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + 0.1) * 1000);
  }

  // Emoji / chocolate pieces burst
  for (let i = 0; i < EMOJI_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'choc-burst-piece';
    el.textContent = SHAPES[Math.floor(Math.random() * SHAPES.length)];

    const angle = (Math.random() * 360) * (Math.PI / 180);
    const speed = 80 + Math.random() * 180;
    const bx    = Math.cos(angle) * speed + 'px';
    const by    = (Math.sin(angle) * speed - 50 - Math.random()*60) + 'px';
    const br    = (Math.random() * 540 - 270) + 'deg';
    const dur   = 0.8 + Math.random() * 0.6;
    const delay = Math.random() * 0.2;

    el.style.cssText = `
      left:${ox}px; top:${oy}px;
      --bx:${bx}; --by:${by}; --br:${br};
      animation-duration:${dur}s;
      animation-delay:${delay}s;
      font-size:${0.9 + Math.random()*0.8}rem;
    `;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + 0.1) * 1000);
  }

  // Gold ring pulse at origin
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:fixed; left:${ox}px; top:${oy}px;
    width:60px; height:60px;
    border:2px solid rgba(200,146,42,0.8);
    border-radius:50%;
    transform:translate(-50%,-50%) scale(0);
    animation:gold-ring-pop 0.55s ease-out forwards;
    pointer-events:none; z-index:99992;
  `;
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 600);
}

// Inject the gold ring keyframe dynamically
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes gold-ring-pop {
  0%   { transform:translate(-50%,-50%) scale(0);  opacity:1; }
  60%  { transform:translate(-50%,-50%) scale(3.5); opacity:0.6; }
  100% { transform:translate(-50%,-50%) scale(5);  opacity:0; }
}`;
document.head.appendChild(styleEl);
