  /************************************************************************
   * celebUmore — Single-file demo
   * Features:
   * - products, cart, booking -> creates Orders (CLB###)
   * - simulated Login (Admin / Client) stored in sessionStorage
   * - Admin dashboard: view/manage orders, refunds, uploads, products, feedback
   * - Client dashboard: view own orders, uploads, request refunds, gift generator
   * - Live clock, tracking, refund requests, localStorage persistence
   ************************************************************************/

  /* -------------------------
     Utilities & storage keys
     ------------------------- */
  const KEY_PRODUCTS = 'celebumore_products_v1';
  const KEY_CART = 'celebumore_cart_v1';
  const KEY_ORDERS = 'celebumore_orders_v1';
  const KEY_UPLOADS = 'celebumore_uploads_v1';
  const KEY_FEEDBACK = 'celebumore_feedback_v1';
  const KEY_REFUNDS = 'celebumore_refunds_v1';
  const KEY_SESS = 'celebumore_session_v1';

  function uid(prefix='CLB'){
    const n = Math.floor(Math.random()*900)+100;
    return prefix + n;
  }
  function nowISO(){ return new Date().toISOString(); }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function load(key){ try{ return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
  function formatINR(n){ return '₹' + Number(n).toLocaleString('en-IN'); }
  function escapeHtml(text=''){ return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  /* -------------------------
     Seed default data (only once)
     ------------------------- */
  (function seed(){
    if(!localStorage.getItem(KEY_PRODUCTS)){
      const seedProducts = [
        {id:'p1',title:'Personalized Video Gift',desc:'1–2 min emotional edit',old:799,price:99},
        {id:'p2',title:'Couple Story Edit',desc:'Cinematic couple edit',old:899,price:112},
        {id:'p3',title:'Friendship Surprise',desc:'Fun montage & reveal',old:999,price:125},
        {id:'p4',title:'Custom Collage',desc:'Stylish photo collage',old:499,price:60},
        {id:'p5',title:'Travel Montage',desc:'Travel highlights',old:1299,price:162},
        {id:'p6',title:'Premium Surprise Pack',desc:'Edit + plan + script',old:1599,price:199},
        {id:'p7',title:'Birthday Highlight Reel',desc:'Quick highlight reel',old:699,price:87},
        {id:'p8',title:'Anniversary Film',desc:'Short film-style edit',old:1899,price:237}
      ];
      save(KEY_PRODUCTS, seedProducts);
    }
    // sample feedback
    if(!localStorage.getItem(KEY_FEEDBACK)){
      save(KEY_FEEDBACK, [
        {name:'Asha',rating:5,comment:'Beautiful edit — made my sister cry in a good way!',date:nowISO()},
        {name:'Rohit',rating:4,comment:'Fast and creative. Good communication.',date:nowISO()}
      ]);
    }
    // ensure arrays exist
    if(!localStorage.getItem(KEY_ORDERS)) save(KEY_ORDERS, []);
    if(!localStorage.getItem(KEY_UPLOADS)) save(KEY_UPLOADS, []);
    if(!localStorage.getItem(KEY_REFUNDS)) save(KEY_REFUNDS, []);
    if(!localStorage.getItem(KEY_CART)) save(KEY_CART, []);
  })();

  /* -------------------------
     Live Clock
     ------------------------- */
  function updateClock(){
    const el = document.getElementById('clock');
    const now = new Date();
    const s = now.toLocaleString('en-IN', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    el.textContent = s;
  }
  setInterval(updateClock, 1000);
  updateClock();

  /* -------------------------
     Navigation helpers
     ------------------------- */
  function showSection(id){
    ['sectionStore','sectionUpload','sectionFeedback','sectionTrack'].forEach(s=>{
      const el=document.getElementById(s);
      if(!el) return;
      el.style.display = (s===id) ? (s==='sectionStore' ? 'block' : 'block') : 'none';
    });
  }
  document.getElementById('navStore').addEventListener('click', ()=> { showSection('sectionStore'); });
  document.getElementById('navUpload').addEventListener('click', ()=> { showSection('sectionUpload'); });
  document.getElementById('navFeedback').addEventListener('click', ()=> { showSection('sectionFeedback'); });
  document.getElementById('navTrack').addEventListener('click', ()=> { showSection('sectionTrack'); });
  document.getElementById('navHome').addEventListener('click', ()=> { window.scrollTo({top:0,behavior:'smooth'}); });
  document.getElementById('btnShop').addEventListener('click', ()=> { showSection('sectionStore'); window.scrollTo({top:document.getElementById('sectionStore').offsetTop-20,behavior:'smooth'})});
  document.getElementById('btnUpload').addEventListener('click', ()=> { showSection('sectionUpload'); window.scrollTo({top:document.getElementById('sectionUpload').offsetTop-20,behavior:'smooth'})});
  document.getElementById('btnGenerator').addEventListener('click', ()=> { openLoginModal('client','ideas'); });

  /* -------------------------
     Products & Store rendering
     ------------------------- */
  function renderStore(){
    const grid = document.getElementById('storeGrid');
    const products = load(KEY_PRODUCTS);
    grid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div'); card.className='card product-card';
      card.innerHTML = `
        <div class="product-thumb">${escapeHtml(p.title)}</div>
        <div><div style="font-weight:700">${escapeHtml(p.title)}</div><div class="muted" style="margin-top:6px">${escapeHtml(p.desc)}</div></div>
        <div class="price-row" style="margin-top:8px">
          <div>
            <div class="old-price">${formatINR(p.old)}</div>
            <div class="new-price">${formatINR(p.price)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn viewBtn" data-id="${p.id}">View</button>
            <button class="btn ghost addBtn" data-id="${p.id}">Add to Cart</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    // attach handlers
    grid.querySelectorAll('.addBtn').forEach(b => b.addEventListener('click', (ev)=> addToCart(ev.currentTarget.dataset.id)));
    grid.querySelectorAll('.viewBtn').forEach(b => b.addEventListener('click', (ev)=> openProductModal(ev.currentTarget.dataset.id)));
  }
  renderStore();

  /* -------------------------
     Product modal
     ------------------------- */
  const modalBackdrop = document.getElementById('modalBackdrop');
  const loginView = document.getElementById('loginView');
  const adminView = document.getElementById('adminView');
  const clientView = document.getElementById('clientView');

  function openModal(){
    modalBackdrop.style.display='flex';
    modalBackdrop.setAttribute('aria-hidden','false');
    loginView.style.display='block';
    adminView.style.display='none';
    clientView.style.display='none';
  }
  function closeModal(){ modalBackdrop.style.display='none'; modalBackdrop.setAttribute('aria-hidden','true'); }

  document.getElementById('navLogin').addEventListener('click', ()=> openModal());
  document.getElementById('btnLogin').addEventListener('click', ()=> openModal());
  document.getElementById('closeLogin').addEventListener('click', ()=> closeModal());
  modalBackdrop.addEventListener('click',(e)=>{ if(e.target===modalBackdrop) closeModal(); });

  function openProductModal(id){
    const products = load(KEY_PRODUCTS);
    const p = products.find(x=>x.id===id);
    if(!p) return alert('Product not found');
    loginView.style.display='none';
    adminView.style.display='none';
    clientView.style.display='none';
    // reuse modalInner for product details
    const modalContent = document.getElementById('modalInner');
    // Build product detail view inside modalInner by replacing children
    modalContent.querySelectorAll('*').forEach(n=>n.style.display='none'); // hide all
    // create product container
    const container=document.createElement('div');
    container.className='card';
    container.innerHTML = `
      <button id="closeProd" style="float:right;border:none;background:transparent;font-size:20px;cursor:pointer">&times;</button>
      <h2 style="margin-top:0">${escapeHtml(p.title)}</h2>
      <div class="muted">${escapeHtml(p.desc)}</div>
      <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px"><div style="height:180px;background:#f7f5f6;border-radius:8px;display:grid;place-items:center">${escapeHtml(p.title)} (Preview)</div></div>
        <div style="min-width:200px">
          <div class="old-price">${formatINR(p.old)}</div>
          <div class="new-price">${formatINR(p.price)}</div>
          <p style="margin-top:12px">${escapeHtml(p.desc)}</p>
          <div style="display:flex;gap:8px">
            <button class="btn" id="modalAdd">Add to Cart</button>
            <button class="btn ghost" id="modalBook">Book Now</button>
          </div>
        </div>
      </div>
    `;
    modalContent.appendChild(container);
    modalBackdrop.style.display='flex'; modalBackdrop.setAttribute('aria-hidden','false');

    document.getElementById('closeProd').addEventListener('click', () => {
      container.remove();
      resetModalInner();
    });
    document.getElementById('modalAdd').addEventListener('click', () => {
      addToCart(p.id);
    });
    document.getElementById('modalBook').addEventListener('click', () => {
      addToCart(p.id);
      container.remove();
      resetModalInner();
      openCart();
    });
  }
  function resetModalInner(){
    // show login view default inside modal
    modalBackdrop.style.display='none';
    modalBackdrop.setAttribute('aria-hidden','true');
    document.getElementById('loginView').style.display='block';
    document.getElementById('adminView').style.display='none';
    document.getElementById('clientView').style.display='none';
  }

  /* -------------------------
     Cart (localStorage)
     ------------------------- */
  function getCart(){ return load(KEY_CART); }
  function saveCart(c){ save(KEY_CART, c); renderCart(); updateCartCount(); }
  function addToCart(prodId){
    const cart = getCart();
    const item = cart.find(i=>i.id===prodId);
    if(item) item.qty++;
    else cart.push({id:prodId,qty:1});
    saveCart(cart);
    alert('Added to cart');
  }
  function clearCart(){ saveCart([]); }

  function renderCart(){
    const div = document.getElementById('cartItems');
    div.innerHTML = '';
    const cart = getCart();
    if(cart.length===0){ div.innerHTML='<div class="muted">Cart is empty</div>'; document.getElementById('cartTotal').textContent = formatINR(0); return; }
    let total=0;
    cart.forEach(ci=>{
      const prod = load(KEY_PRODUCTS).find(p=>p.id===ci.id);
      if(!prod) return;
      const line = prod.price * ci.qty;
      total += line;
      const el = document.createElement('div'); el.className='cart-item';
      el.innerHTML = `<div style="flex:1"><div style="font-weight:700">${escapeHtml(prod.title)}</div><div class="muted small">${formatINR(prod.price)} × ${ci.qty} = ${formatINR(line)}</div></div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <div style="display:flex;gap:6px">
            <button class="btn smallBtn" data-id="${ci.id}" data-act="minus">-</button>
            <button class="btn smallBtn" data-id="${ci.id}" data-act="plus">+</button>
          </div>
          <button class="btn ghost" data-id="${ci.id}" data-act="remove">Remove</button>
        </div>`;
      div.appendChild(el);
    });
    document.getElementById('cartTotal').textContent = formatINR(total);
  }

  // event delegations for cart buttons
  document.getElementById('cartDrawer').addEventListener('click',(e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    let cart = getCart();
    if(act==='minus'){ cart = cart.map(i=> i.id===id ? ({...i,qty: i.qty-1}) : i).filter(i=>i.qty>0); saveCart(cart); }
    if(act==='plus'){ cart = cart.map(i=> i.id===id ? ({...i,qty: i.qty+1}) : i); saveCart(cart); }
    if(act==='remove'){ cart = cart.filter(i=>i.id!==id); saveCart(cart); }
  });

  document.getElementById('openCartBtn').addEventListener('click',()=>{
    const d = document.getElementById('cartDrawer');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
    renderCart();
  });
  document.getElementById('clearCart').addEventListener('click', ()=> {
    if(confirm('Clear cart?')) clearCart();
  });
  function updateCartCount(){ const cnt = getCart().reduce((s,i)=>s+i.qty,0); document.getElementById('cartCount').textContent = cnt; }
  updateCartCount();

  // Checkout -> Book Now: creates order(s)
  document.getElementById('checkoutBtn').addEventListener('click', ()=>{
    const cart = getCart();
    if(cart.length===0) return alert('Cart is empty');
    // require client login to create order
    const sess = getSession();
    if(!sess || sess.role !== 'client') {
      // prompt login
      if(confirm('You must be logged in as a Client to book. Open login?')) openModal();
      return;
    }
    // Create an order per cart item or a combined order — we'll create one order with items
    const orderId = uid('CLB');
    const productsList = cart.map(ci => ({ id:ci.id, qty:ci.qty }));
    const prodDetails = productsList.map(pi => {
      const p = load(KEY_PRODUCTS).find(x=>x.id===pi.id);
      return { title: p.title, price: p.price, qty:pi.qty };
    });
    const total = prodDetails.reduce((s,i)=> s + (i.price * i.qty), 0);
    const orders = load(KEY_ORDERS);
    const orderObj = {
      orderId,
      clientName: sess.name,
      clientEmail: sess.email,
      items: prodDetails,
      total,
      status: 'Pending',
      date: nowISO()
    };
    orders.push(orderObj);
    save(KEY_ORDERS, orders);
    clearCart();
    alert(`Booking created! Order ID: ${orderId}\nYou can track it in your dashboard.`);
    renderStore(); renderAdminOrders(); renderClientOrders();
    document.getElementById('cartDrawer').style.display='none';
  });

  /* -------------------------
     Uploads form (client)
     ------------------------- */
  const upFiles = document.getElementById('u_files');
  upFiles.addEventListener('change', ()=>{
    const files = Array.from(upFiles.files);
    const list = files.map(f=> `${f.name} (${Math.round(f.size/1024)}KB)` );
    document.getElementById('u_preview').textContent = list.length ? list.join(', ') : 'No files selected.';
  });
  document.getElementById('u_clear').addEventListener('click', ()=>{
    document.getElementById('uploadForm').reset();
    document.getElementById('u_preview').textContent = 'No files selected.';
  });

  document.getElementById('uploadForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('u_name').value.trim();
    const contact = document.getElementById('u_contact').value.trim();
    const files = Array.from(upFiles.files).map(f=> ({name:f.name, size:f.size}));
    const msg = document.getElementById('u_msg').value.trim();
    if(!name || !contact) return alert('Please enter name and contact');
    const uploads = load(KEY_UPLOADS);
    const uploadObj = { id: uid('UPL'), name, contact, files, msg, date: nowISO() };
    uploads.push(uploadObj);
    save(KEY_UPLOADS, uploads);
    alert('Upload recorded locally. You will see it in Admin uploads and your client dashboard after login.');
    document.getElementById('uploadForm').reset();
    document.getElementById('u_preview').textContent = 'No files selected.';
    renderAdminUploads(); renderClientUploads();
  });

  /* -------------------------
     Feedback / Reviews
     ------------------------- */
  document.getElementById('feedbackForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('fb_name').value.trim();
    const rating = parseInt(document.getElementById('fb_rating').value, 10);
    const comment = document.getElementById('fb_comment').value.trim();
    if(!name || !comment) return alert('Please add name and comment');
    const f = load(KEY_FEEDBACK);
    f.push({ name, rating, comment, date: nowISO() });
    save(KEY_FEEDBACK, f);
    alert('Thanks for your review!');
    document.getElementById('feedbackForm').reset();
    renderReviews();
    renderAdminFeedback();
  });
  document.getElementById('loadReviews').addEventListener('click', ()=> { renderReviews(); });

  function renderReviews(){
    const list = load(KEY_FEEDBACK);
    const container = document.getElementById('reviewsList');
    container.innerHTML = '';
    if(list.length===0){ container.innerHTML = '<div class="muted">No reviews yet.</div>'; return; }
    list.slice().reverse().forEach(r=>{
      const d = document.createElement('div'); d.className='card';
      d.style.marginBottom='8px';
      d.innerHTML = `<div style="display:flex;justify-content:space-between"><div style="font-weight:700">${escapeHtml(r.name)}</div><div class="muted small">${'★'.repeat(r.rating)}</div></div><div class="muted small" style="margin-top:6px">${escapeHtml(r.comment)}</div>`;
      container.appendChild(d);
    });
  }
  renderReviews();

  /* -------------------------
     Orders & Tracking
     ------------------------- */
  function renderAdminOrders(){
    const orders = load(KEY_ORDERS);
    const container = document.getElementById('adminOrders');
    container.innerHTML = '';
    if(orders.length===0) return container.innerHTML='<div class="muted">No orders yet.</div>';
    orders.slice().reverse().forEach(o=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(o.orderId)}</b> — ${escapeHtml(o.clientName)}</div><div class="muted small">${(new Date(o.date)).toLocaleString()}</div></div>
        <div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1"><div class="muted small">Items:</div>${o.items.map(it=>`<div>${escapeHtml(it.title)} × ${it.qty} — ${formatINR(it.price)}</div>`).join('')}</div>
        <div style="min-width:180px">
          <div style="font-weight:700">${formatINR(o.total)}</div>
          <div style="margin-top:8px">
            <select data-order="${o.orderId}" class="statusSelect">
              <option ${o.status==='Pending'?'selected':''}>Pending</option>
              <option ${o.status==='In Progress'?'selected':''}>In Progress</option>
              <option ${o.status==='Completed'?'selected':''}>Completed</option>
              <option ${o.status==='Delivered'?'selected':''}>Delivered</option>
            </select>
            <button class="btn ghost" data-order="${o.orderId}" data-act="view">View</button>
          </div>
        </div></div>`;
      container.appendChild(el);
    });
    // attach change handlers
    container.querySelectorAll('.statusSelect').forEach(sel=>{
      sel.addEventListener('change', (e)=>{
        const id = e.currentTarget.dataset.order;
        const orders = load(KEY_ORDERS);
        const o = orders.find(x=>x.orderId===id);
        if(o){ o.status = e.currentTarget.value; save(KEY_ORDERS, orders); renderAdminOrders(); renderClientOrders(); }
      });
    });
    container.querySelectorAll('button[data-act="view"]').forEach(b=>{
      b.addEventListener('click', (e)=>{
        const id = e.currentTarget.dataset.order;
        const orders = load(KEY_ORDERS);
        const o = orders.find(x=>x.orderId===id);
        if(!o) return;
        alert(`Order ${o.orderId}\nClient: ${o.clientName}\nStatus: ${o.status}\nTotal: ${formatINR(o.total)}`);
      });
    });
  }
  renderAdminOrders();

  function renderClientOrders(){
    const sess = getSession();
    const container = document.getElementById('clientOrders');
    container.innerHTML = '';
    if(!sess) return container.innerHTML = '<div class="muted">Log in as client to view orders.</div>';
    const orders = load(KEY_ORDERS).filter(o=> o.clientEmail === sess.email);
    if(orders.length===0) return container.innerHTML = '<div class="muted">You have no orders.</div>';
    orders.slice().reverse().forEach(o=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(o.orderId)}</b> — ${escapeHtml(o.clientName)}</div><div class="muted small">${(new Date(o.date)).toLocaleString()}</div></div>
        <div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1">${o.items.map(it=>`<div>${escapeHtml(it.title)} × ${it.qty} — ${formatINR(it.price)}</div>`).join('')}</div>
        <div style="min-width:180px">
          <div style="font-weight:700">${formatINR(o.total)}</div>
          <div style="margin-top:8px"><div class="muted small">Status: <b>${escapeHtml(o.status)}</b></div>
            <div style="margin-top:8px">
              <button class="btn ghost" data-order="${o.orderId}" data-act="refund">Request Refund</button>
              <button class="btn" data-order="${o.orderId}" data-act="track">Track</button>
            </div>
          </div>
        </div></div>`;
      container.appendChild(el);
    });
    // handlers for refund & track
    container.querySelectorAll('button[data-act="refund"]').forEach(b=> b.addEventListener('click', (e)=> openRefundRequest(e.currentTarget.dataset.order)));
    container.querySelectorAll('button[data-act="track"]').forEach(b=> b.addEventListener('click',(e)=> showTrackResult(e.currentTarget.dataset.order)));
  }
  renderClientOrders();

  function showTrackResult(orderId){
    const orders = load(KEY_ORDERS);
    const o = orders.find(x=>x.orderId===orderId);
    const el = document.getElementById('trackResult');
    if(!o) return el.innerHTML = `<div class="muted">Order not found</div>`;
    el.innerHTML = `<div class="card"><b>${escapeHtml(o.orderId)}</b> — Status: <b>${escapeHtml(o.status)}</b><div class="muted small" style="margin-top:8px">Estimated delivery: ${o.status==='Pending'?'2 days': o.status==='In Progress'?'1 day': o.status==='Completed'?'Ready for Delivery':'Delivered'}</div></div>`;
  }

  document.getElementById('btnTrack').addEventListener('click', ()=>{
    const id = document.getElementById('trackId').value.trim();
    if(!id) return alert('Enter Order ID');
    showTrackResult(id);
  });

  /* -------------------------
     Refunds
     ------------------------- */
  function openRefundRequest(orderId){
    const reason = prompt('Enter refund reason (short):');
    if(!reason) return;
    const refunds = load(KEY_REFUNDS);
    const req = { id: uid('RFD'), orderId, reason, status:'Pending', date: nowISO() };
    refunds.push(req);
    save(KEY_REFUNDS, refunds);
    alert('Refund request submitted. Admin will review.');
    renderAdminRefunds(); renderClientRefunds();
  }

  function renderAdminRefunds(){
    const list = load(KEY_REFUNDS);
    const container = document.getElementById('adminRefunds');
    container.innerHTML = '';
    if(list.length===0) return container.innerHTML = '<div class="muted">No refund requests.</div>';
    list.slice().reverse().forEach(r=>{
      const e = document.createElement('div'); e.className='card'; e.style.marginBottom='8px';
      const order = load(KEY_ORDERS).find(o=>o.orderId===r.orderId) || {};
      e.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(r.id)}</b> — Order: <b>${escapeHtml(r.orderId)}</b></div><div class="muted small">${(new Date(r.date)).toLocaleString()}</div></div>
        <div style="margin-top:8px"><div class="muted small">Client: ${escapeHtml(order.clientName || '—')}</div><div style="margin-top:6px">${escapeHtml(r.reason)}</div>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn" data-rid="${r.id}" data-act="approve">Approve</button>
          <button class="btn ghost" data-rid="${r.id}" data-act="reject">Reject</button>
        </div></div>`;
      container.appendChild(e);
    });
    container.querySelectorAll('button[data-act]').forEach(b=>{
      b.addEventListener('click', (ev)=>{
        const id = ev.currentTarget.dataset.rid;
        const act = ev.currentTarget.dataset.act;
        const arr = load(KEY_REFUNDS);
        const idx = arr.findIndex(x=>x.id===id);
        if(idx<0) return;
        arr[idx].status = (act==='approve') ? 'Approved' : 'Rejected';
        save(KEY_REFUNDS, arr);
        alert(`Refund ${arr[idx].status}`);
        renderAdminRefunds(); renderClientRefunds();
      });
    });
  }
  renderAdminRefunds();

  function renderClientRefunds(){
    const sess = getSession();
    const container = document.getElementById('clientRefunds');
    if(!sess) return container.innerHTML = '<div class="muted">Login to see refund requests.</div>';
    const refunds = load(KEY_REFUNDS).filter(r=>{
      const order = load(KEY_ORDERS).find(o=>o.orderId===r.orderId);
      return order && order.clientEmail === sess.email;
    });
    container.innerHTML = '';
    if(refunds.length===0) return container.innerHTML = '<div class="muted">No refund requests.</div>';
    refunds.slice().reverse().forEach(r=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(r.id)}</b> — Order: <b>${escapeHtml(r.orderId)}</b></div><div class="muted small">${(new Date(r.date)).toLocaleString()}</div></div>
        <div style="margin-top:8px">${escapeHtml(r.reason)}<div style="margin-top:8px" class="muted small">Status: <b>${escapeHtml(r.status)}</b></div></div>`;
      container.appendChild(el);
    });
  }

  /* -------------------------
     Uploads rendering for admin & client
     ------------------------- */
  function renderAdminUploads(){
    const arr = load(KEY_UPLOADS);
    const container = document.getElementById('adminUploads');
    container.innerHTML = '';
    if(arr.length===0) return container.innerHTML = '<div class="muted">No uploads.</div>';
    arr.slice().reverse().forEach(u=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(u.id)}</b> — ${escapeHtml(u.name)}</div><div class="muted small">${(new Date(u.date)).toLocaleString()}</div></div>
        <div style="margin-top:8px" class="muted small">Files: ${u.files.map(f=>escapeHtml(f.name)).join(', ')}</div>
        <div style="margin-top:8px">${escapeHtml(u.msg || '—')}</div>
        <div style="margin-top:8px"><button class="btn ghost" data-upid="${u.id}" data-act="del">Delete</button></div>`;
      container.appendChild(el);
    });
    container.querySelectorAll('button[data-act="del"]').forEach(b=> b.addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.upid;
      let arr = load(KEY_UPLOADS);
      arr = arr.filter(x=>x.id!==id);
      save(KEY_UPLOADS, arr);
      renderAdminUploads();
      renderClientUploads();
    }));
  }
  renderAdminUploads();

  function renderClientUploads(){
    const sess = getSession();
    const container = document.getElementById('clientUploads');
    container.innerHTML = '';
    if(!sess) return container.innerHTML = '<div class="muted">Login as client to see uploads.</div>';
    const arr = load(KEY_UPLOADS).filter(u => u.contact === sess.email || u.name === sess.name);
    if(arr.length===0) return container.innerHTML = '<div class="muted">You have no uploads.</div>';
    arr.slice().reverse().forEach(u=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(u.id)}</b></div><div class="muted small">${(new Date(u.date)).toLocaleString()}</div></div>
        <div style="margin-top:8px" class="muted small">Files: ${u.files.map(f=>escapeHtml(f.name)).join(', ')}</div>
        <div style="margin-top:8px">${escapeHtml(u.msg || '—')}</div>`;
      container.appendChild(el);
    });
  }

  /* -------------------------
     Admin Products management
     ------------------------- */
  document.getElementById('addProduct').addEventListener('click', ()=>{
    const title = document.getElementById('new_title').value.trim();
    const price = Number(document.getElementById('new_price').value) || 0;
    if(!title || !price) return alert('Enter title and price');
    const arr = load(KEY_PRODUCTS);
    const id = 'p' + (Math.floor(Math.random()*9000)+100);
    arr.push({ id, title, desc: 'Custom product', old: price*4, price });
    save(KEY_PRODUCTS, arr);
    document.getElementById('new_title').value=''; document.getElementById('new_price').value='';
    renderStore(); renderAdminProducts();
  });

  function renderAdminProducts(){
    const arr = load(KEY_PRODUCTS);
    const container = document.getElementById('adminProducts');
    container.innerHTML = '';
    arr.forEach(p=>{
      const e = document.createElement('div'); e.className='card'; e.style.marginBottom='8px';
      e.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(p.title)}</b></div><div><button class="btn" data-id="${p.id}" data-act="edit">Edit</button> <button class="btn ghost" data-id="${p.id}" data-act="del">Delete</button></div></div>
        <div class="muted small" style="margin-top:8px">${escapeHtml(p.desc)} — ${formatINR(p.price)}</div>`;
      container.appendChild(e);
    });
    container.querySelectorAll('button[data-act="del"]').forEach(b=> b.addEventListener('click', (e)=>{
      if(!confirm('Delete product?')) return;
      const id = e.currentTarget.dataset.id;
      let arr = load(KEY_PRODUCTS);
      arr = arr.filter(x=>x.id!==id);
      save(KEY_PRODUCTS, arr);
      renderStore(); renderAdminProducts();
    }));
    // edit not implemented intentionally simple (admin can delete/add)
  }
  renderAdminProducts();

  /* -------------------------
     Feedback for admin
     ------------------------- */
  function renderAdminFeedback(){
    const arr = load(KEY_FEEDBACK);
    const container = document.getElementById('adminFeedback');
    container.innerHTML = '';
    if(arr.length===0) return container.innerHTML = '<div class="muted">No feedback.</div>';
    arr.slice().reverse().forEach(f=>{
      const e = document.createElement('div'); e.className='card'; e.style.marginBottom='8px';
      e.innerHTML = `<div style="display:flex;justify-content:space-between"><div style="font-weight:700">${escapeHtml(f.name)}</div><div class="muted small">${'★'.repeat(f.rating)}</div></div><div class="muted small" style="margin-top:6px">${escapeHtml(f.comment)}</div>`;
      container.appendChild(e);
    });
  }
  renderAdminFeedback();

  /* -------------------------
     Simple Analytics
     ------------------------- */
  function renderAnalytics(){
    const orders = load(KEY_ORDERS);
    const uploads = load(KEY_UPLOADS);
    const feedback = load(KEY_FEEDBACK);
    const totalRevenue = orders.reduce((s,o)=> s + (o.total||0), 0);
    const txt = `Orders: ${orders.length}\nUploads: ${uploads.length}\nFeedback: ${feedback.length}\nRevenue (demo): ${formatINR(totalRevenue)}`;
    document.getElementById('adminAnalytics').textContent = txt;
  }
  renderAnalytics();

  /* -------------------------
     Login & session (frontend)
     ------------------------- */
  function setSession(obj){ sessionStorage.setItem(KEY_SESS, JSON.stringify(obj)); }
  function getSession(){ try{ return JSON.parse(sessionStorage.getItem(KEY_SESS)); } catch { return null; } }
  function clearSession(){ sessionStorage.removeItem(KEY_SESS); }

  // login tabs (choose role)
  document.querySelectorAll('#loginView .tab').forEach(t => t.addEventListener('click', (e)=>{
    document.querySelectorAll('#loginView .tab').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const role = e.currentTarget.dataset.role;
    if(role==='admin') {
      document.getElementById('login_pass').style.display='block';
    } else {
      document.getElementById('login_pass').style.display='none';
    }
  }));

  document.getElementById('loginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('login_name').value.trim();
    const email = document.getElementById('login_email').value.trim();
    const pass = document.getElementById('login_pass').value;
    const role = document.querySelector('#loginView .tab.active').dataset.role; // 'client' or 'admin'
    if(!name || !email) return alert('Enter name and email');
    if(role==='admin'){
      if(pass !== 'admin123') return alert('Invalid admin password (demo). Use admin123');
      setSession({ name, email, role:'admin' });
      showAdminDashboard();
    } else {
      setSession({ name, email, role:'client' });
      showClientDashboard();
    }
  });

  function showAdminDashboard(){
    loginView.style.display='none';
    adminView.style.display='block';
    clientView.style.display='none';
    document.getElementById('adminUser').textContent = getSession().name;
    document.getElementById('adminLogout').addEventListener('click', ()=>{ clearSession(); resetModal(); });
    modalBackdrop.style.display='flex'; modalBackdrop.setAttribute('aria-hidden','false');
    // init admin panels
    renderAdminOrders(); renderAdminRefunds(); renderAdminUploads(); renderAdminProducts(); renderAdminFeedback(); renderAnalytics();
    // admin tab switching
    document.querySelectorAll('#adminView .tab').forEach(t=>{
      t.addEventListener('click',(e)=>{
        document.querySelectorAll('#adminView .tab').forEach(x=>x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const tab = e.currentTarget.dataset.adminTab;
        document.querySelectorAll('#adminPanels .admin-panel').forEach(panel=> panel.style.display = (panel.dataset.panel === tab) ? 'block' : 'none');
      });
    });
  }

  function showClientDashboard(tabDefault='orders'){
    loginView.style.display='none';
    adminView.style.display='none';
    clientView.style.display='block';
    const s = getSession();
    document.getElementById('clientUser').textContent = s.name;
    document.getElementById('clientLogout').addEventListener('click', ()=>{ clearSession(); resetModal(); });
    modalBackdrop.style.display='flex'; modalBackdrop.setAttribute('aria-hidden','false');
    // init client panels
    renderClientOrders(); renderClientUploads(); renderClientRefunds();
    // events for client tabs
    document.querySelectorAll('#clientView .tab').forEach(t=>{
      t.addEventListener('click',(e)=>{
        document.querySelectorAll('#clientView .tab').forEach(x=>x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const tab = e.currentTarget.dataset.clientTab;
        document.querySelectorAll('#clientPanels .client-panel').forEach(panel=> panel.style.display = (panel.dataset.panel === tab) ? 'block' : 'none');
      });
    });
    // show default tab
    document.querySelectorAll('#clientView .tab').forEach(x=> x.classList.remove('active'));
    const def = Array.from(document.querySelectorAll('#clientView .tab')).find(t=>t.dataset.clientTab===tabDefault);
    if(def) def.classList.add('active');
    document.querySelectorAll('#clientPanels .client-panel').forEach(panel=> panel.style.display = (panel.dataset.panel === tabDefault) ? 'block' : 'none');
  }

  function resetModal(){
    closeModal();
    // cleanup modalInner children & show login view again
    document.getElementById('loginView').style.display='block';
    document.getElementById('adminView').style.display='none';
    document.getElementById('clientView').style.display='none';
    modalBackdrop.style.display='none';
    modalBackdrop.setAttribute('aria-hidden','true');
  }

  // if session exists, auto open appropriate dashboard on login click
  document.getElementById('btnLogin').addEventListener('click', ()=>{
    const s = getSession();
    if(!s) openModal();
    else {
      if(s.role === 'admin') showAdminDashboard();
      else showClientDashboard();
    }
  });

  /* -------------------------
     Refund / Client & admin lists renderers
     ------------------------- */
  function renderClientRefunds(){
    const sess = getSession();
    const c = document.getElementById('clientRefunds');
    c.innerHTML = '';
    if(!sess) return c.innerHTML = '<div class="muted">Login to see refund requests.</div>';
    const refunds = load(KEY_REFUNDS).filter(r=>{
      const order = load(KEY_ORDERS).find(o=>o.orderId===r.orderId);
      return order && order.clientEmail === sess.email;
    });
    if(refunds.length===0) return c.innerHTML = '<div class="muted">No refund requests.</div>';
    refunds.slice().reverse().forEach(r=>{
      const el = document.createElement('div'); el.className='card'; el.style.marginBottom='8px';
      el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${escapeHtml(r.id)}</b> — ${escapeHtml(r.orderId)}</div><div class="muted small">${(new Date(r.date)).toLocaleString()}</div></div><div style="margin-top:8px">${escapeHtml(r.reason)}</div><div style="margin-top:8px" class="muted small">Status: <b>${escapeHtml(r.status)}</b></div>`;
      c.appendChild(el);
    });
  }

  /* -------------------------
     Gift Idea Generator
     ------------------------- */
  document.getElementById('gi_go').addEventListener('click', ()=>{
    const who = document.getElementById('gi_person').value;
    const occ = document.getElementById('gi_occas').value;
    const vibe = document.getElementById('gi_vibe').value;
    const suggestions = generateIdeas(who, occ, vibe);
    const out = document.getElementById('gi_result');
    out.innerHTML = suggestions.map(s=>`<div class="card" style="margin-bottom:8px"><b>${escapeHtml(s.title)}</b><div class="muted small" style="margin-top:6px">${escapeHtml(s.desc)}</div></div>`).join('');
  });
  function generateIdeas(who, occ, vibe){
    // simple rule-based suggestions
    const ideas = [];
    if(occ==='birthday'){
      if(vibe==='emotional') ideas.push({title:'Memory Lane Video', desc:'Collect childhood photos + messages + soft music — emotional edit.'});
      if(vibe==='fun') ideas.push({title:'Roast & Toast Reel', desc:'Funny clips + friends messages — fast, upbeat edit.'});
      if(vibe==='aesthetic') ideas.push({title:'Cinematic Birthday Montage', desc:'Stylish transitions, color grade & soulful music.'});
    } else if(occ==='anniversary'){
      ideas.push({title:'Couple Story Film', desc:'Timeline of relationship with voiceovers, captions & music.'});
      ideas.push({title:'Message Montage', desc:'Short clips from friends/family expressing wishes.'});
    } else if(occ==='proposal'){
      ideas.push({title:'Proposal Teaser Video', desc:'Short romantic video to set mood before proposal.'});
    } else if(occ==='farewell'){
      ideas.push({title:'Goodbye Tribute', desc:'Messages from colleagues with highlights & music.'});
    }
    // tweak by who
    if(who==='parent') ideas = ideas.map(i=> ({...i, desc: i.desc + ' — Add family photos and heartfelt messages.'}));
    if(who==='friend') ideas = ideas.map(i=> ({...i, desc: i.desc + ' — Add inside jokes and candid clips.'}));
    return ideas.length ? ideas : [{title:'Custom Gift', desc:'Tell us about the person and we will suggest a perfect idea.'}];
  }

  /* -------------------------
     Track order from client panel
     ------------------------- */
  document.getElementById('clientTrackBtn').addEventListener('click', ()=>{
    const id = document.getElementById('clientTrackInput').value.trim();
    if(!id) return alert('Enter Order ID');
    const orders = load(KEY_ORDERS);
    const o = orders.find(x=>x.orderId===id);
    const out = document.getElementById('clientTrackResult');
    if(!o) return out.innerHTML = '<div class="muted">Order not found.</div>';
    out.innerHTML = `<div class="card"><b>${escapeHtml(o.orderId)}</b><div class="muted small">Status: <b>${escapeHtml(o.status)}</b></div><div class="muted small">Estimated delivery: ${o.status==='Pending'?'2 days': o.status==='In Progress'?'1 day': o.status==='Completed'?'Ready':'Delivered'}</div></div>`;
  });

  /* -------------------------
     Misc: view policy & reviews
     ------------------------- */
  document.getElementById('viewPolicy').addEventListener('click', ()=> {
    alert('Refund Policy (demo): Refund requests accepted within 7 days of delivery for quality issues. Admin reviews and may approve/reject. This demo stores requests locally.');
  });
  document.getElementById('viewReviews').addEventListener('click', ()=> {
    showSection('sectionFeedback');
    window.scrollTo({top:document.getElementById('sectionFeedback').offsetTop-20,behavior:'smooth'});
  });

  /* -------------------------
     Login modal utilities & auto session handling
     ------------------------- */
  function openLoginModal(role='client', openTab=null){
    openModal();
    // set role tab
    const tabs = document.querySelectorAll('#loginView .tab');
    tabs.forEach(t => t.classList.remove('active'));
    const target = Array.from(tabs).find(t=>t.dataset.role===role);
    if(target) target.classList.add('active');
    if(role==='admin') document.getElementById('login_pass').style.display='block';
    else document.getElementById('login_pass').style.display='none';
    if(openTab && role==='client') {
      // after login show client tab
      document.getElementById('loginForm').addEventListener('submit', ()=> showClientDashboard(openTab), {once:true});
    }
  }

  // Check session at load: auto set appropriate dashboards (no modal shown)
  (function checkSessionAtLoad(){
    const sess = getSession();
    if(!sess) return;
    // no auto open to avoid modal showing; we update top nav login text
    document.getElementById('navLogin').textContent = sess.role==='admin' ? 'Admin' : 'Client';
  })();

  /* -------------------------
     admin & client utility: logout & reset
     ------------------------- */
  document.getElementById('adminLogout').addEventListener('click', ()=> { clearSession(); resetModal(); });
  document.getElementById('clientLogout').addEventListener('click', ()=> { clearSession(); resetModal(); });

  /* -------------------------
     Helper functions to re-render things when storage changes
     ------------------------- */
  function renderAll(){
    renderStore(); renderCart(); updateCartCount(); renderReviews(); renderAdminOrders(); renderAdminProducts(); renderAdminRefunds(); renderAdminUploads(); renderClientOrders(); renderClientUploads(); renderClientRefunds(); renderAdminFeedback(); renderAnalytics();
  }
  renderAll();

  // expose some functions for later dev (not necessary)
  window.celeb = { renderAll };

  // Reset modal inner when closed
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') resetModal(); });
