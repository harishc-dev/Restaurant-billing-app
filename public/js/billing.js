(function(){
  const bootEl = document.getElementById('bootstrap');
  const serverNum = Number(bootEl?.dataset?.server) === 2 ? 2 : 1;
  let items = [];
  const $items = document.getElementById('items');
  const $search = null;
  const $bill = document.getElementById('bill-items');
  const $grand = document.getElementById('grand-total');
  const $proceed = document.getElementById('proceed');
  const $confirm = document.getElementById('confirm');
  const $confirmToken = document.getElementById('confirm-token');
  const $confirmList = document.getElementById('confirm-list');
  const $checkout = document.getElementById('checkout');
  const $cancel = document.getElementById('cancel');

  let cart = {};
  let unavailable = new Set();
  const socket = io({ transports: ['websocket'], upgrade: true, reconnection: true, reconnectionDelay: 300, reconnectionDelayMax: 1500 });
  socket.on('connect', ()=>{
    socket.emit('join-server', serverNum);
  });
  socket.on('availability:update', ({ server, unavailable: ids }) => {
    if(Number(server) !== serverNum) return;
    unavailable = new Set(ids || []);
    renderItems(filterItems());
  });

  (async function(){
    try{
      const aRes = await fetch(`/api/availability?server=${serverNum}`);
      if(availRes.ok){
        const ct = availRes.headers.get('content-type')||'';
        if(ct.includes('application/json')){
          const data = await availRes.json().catch(()=>null);
          if(data) unavailable = new Set(data.unavailable || []);
        }
      }
      
      const itemsRes = await fetch('/api/items', { headers: { 'Cache-Control': 'no-store' } });
      if(itemsRes.ok){
        const ct = itemsRes.headers.get('content-type')||'';
        if(ct.includes('application/json')){
          items = await itemsRes.json().catch(()=>items);
        }
      }
      
      renderItems(filterItems());
    } catch {}
  })();

  socket.on('items:update', async (payload)=>{
    try{
      const prevIds = new Set((items||[]).map(i=>i.id));
      const list = Array.isArray(payload?.items) ? payload.items : null;
      if(list){
        items = list;
      } else {
        const res = await fetch('/api/items', { headers: { 'Cache-Control': 'no-store' } });
        if(res.ok){ const ct = res.headers.get('content-type')||''; if(ct.includes('application/json')) items = await res.json().catch(()=>items); }
      }
      const newIds = new Set(items.map(i=>i.id));
      let removedAny = false;
      Object.keys(cart).forEach(id=>{
        if(!newIds.has(id)) { delete cart[id]; removedAny = true; }
      });
      prevIds.forEach(id=>{ if(!newIds.has(id)) unavailable.delete(id); });
      renderItems(filterItems());
      renderBill();
      if(removedAny) try{ showToast('Some items were removed and cleared from your bill'); } catch{}
    } catch{}
  });
  let reservedToken = null;

  function renderItems(list){
    $items.innerHTML = '';
    list.forEach(it => {
      const card = document.createElement('div');
      const isNA = unavailable.has(it.id);
      card.className = 'card';
      const naText = isNA ? '<span class="ml-2 text-red-600 text-xs">Not Available</span>' : '';
      const addBtn = isNA ? '<button disabled class="btn-secondary opacity-50">Add</button>' : '<button class="btn-secondary" data-id="add">Add</button>';
      
      const imgFile = (it.image && typeof it.image === 'string' && it.image.trim()) ? it.image.trim() : `${it.id}.png`;
      const img = `<img class="item-photo" src="/public/img/items/${imgFile}?v=${Date.now()}" alt="${it.name}" onerror="this.style.display='none'"/>`;
  
  const comboBadge = it.combo ? '<span class="ml-2 align-middle" title="Combo">🧩</span>' : '';
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="shrink-0">${img}</div>
          <div class="min-w-0">
            <div class="font-semibold text-lg leading-tight break-words">${it.name}${comboBadge}${naText}</div>
            <div class="text-sm text-slate-600">₹${it.price}</div>
          </div>
        </div>
        <div class="mt-3">${addBtn}</div>`;
      if(!isNA){
        const btn = card.querySelector('button[data-id="add"]');
        btn.addEventListener('click', (e)=>{ e.stopPropagation(); addToCart(it); });
      }
      $items.appendChild(card);
    });
  }

  function filterItems(){
  
  
  const list = (items||[]).slice();
  const dishes = [];
  const combos = [];
  for(const it of list){
    if(it && it.combo) combos.push(it); else dishes.push(it);
  }
  return dishes.concat(combos);
  }

  function addToCart(it){
    const ex = cart[it.id] || { ...it, qty: 0 };
    ex.qty += 1;
    cart[it.id] = ex;
    renderBill();
  }

  function changeQty(id, delta){
    const ex = cart[id];
    if(!ex) return;
    ex.qty += delta;
    if(ex.qty <= 0) delete cart[id];
    renderBill();
  }

  function renderBill(){
    const arr = Object.values(cart);
    $bill.innerHTML = '';
    let total = 0;
    arr.forEach(it => {
      total += it.price * it.qty;
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between';
      row.innerHTML = `
        <div>
          <div class="font-medium">${it.name}</div>
          <div class="text-xs text-slate-500">₹${it.price} each</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-secondary" data-act="dec" data-id="${it.id}">−</button>
          <div class="w-8 text-center font-semibold">${it.qty}</div>
          <button class="btn-secondary" data-act="inc" data-id="${it.id}">+</button>
        </div>`;
      $bill.appendChild(row);
    });
    $grand.textContent = total;

    
    $bill.querySelectorAll('button').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        changeQty(id, act==='inc'?+1:-1);
      });
    });

    $proceed.disabled = arr.length === 0;
  }

  
  async function previewToken(){
    const res = await fetch('/api/preview-token', { method:'POST' });
    if(res.status === 409){ return null; }
    if(!res.ok) throw new Error('preview failed');
    const data = await res.json();
    return data.token;
  }

  function showConfirm(token){
    const arr = Object.values(cart);
      $confirmToken.textContent = token || '—';
    $confirmList.innerHTML = arr.map(it => `${it.name} × ${it.qty} — ₹${it.price * it.qty}`).join('<br/>');
    $confirm.classList.remove('hidden');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function checkout(){
    const arr = Object.values(cart);
      const payload = { token: reservedToken || undefined, items: arr.map(({id,name,price,qty})=>({id,name,price,qty})) };
    const res = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.status === 409){
      
      try{
        reservedToken = await previewToken();
        $confirmToken.textContent = reservedToken || '—';
        showToast('Token refreshed, please confirm');
      } catch{}
      return;
    }
    if(!res.ok){ showToast('Checkout failed'); return; }
    const data = await res.json();
    showToast(`Order Sent! Token ${data.order.token}`);
    
      cart = {}; reservedToken = null; renderBill();
    $confirm.classList.add('hidden');
  }

  

  $proceed.addEventListener('click', async ()=>{
    if(Object.values(cart).length === 0) return;
    $proceed.disabled = true;
    try {
      reservedToken = await previewToken();
      if(!reservedToken){
        showToast('All tokens are used. Please contact admin or clear old orders.');
      } else {
        showConfirm(reservedToken);
      }
    } catch(e){ showToast('Could not get token'); }
    $proceed.disabled = false;
  });

  $cancel.addEventListener('click', ()=>{
    reservedToken = null; 
    $confirm.classList.add('hidden');
  });
  $checkout.addEventListener('click', ()=> checkout());

  
  

  
  renderItems(items);
  renderBill();

  const $btnMessages = document.getElementById('btn-messages');
  const $msgLabel = document.getElementById('msg-label');
  const $msgModal = document.getElementById('messages-modal');
  const $msgList = document.getElementById('messages-list');
  const $msgInput = document.getElementById('msg-input');
  const $msgSend = document.getElementById('msg-send');
  const $msgClose = document.getElementById('msg-close');
  let msgOpen = false;
  let unread = 0;

  function setUnread(n){
    unread = Math.max(0, n|0);
    if($msgLabel){
      $msgLabel.textContent = unread > 0 ? `Messages(${unread})` : 'Messages';
    }
  }
  function openMessages(){ msgOpen = true; setUnread(0); $msgModal?.classList.remove('hidden'); loadMessages(); }
  function closeMessages(){ msgOpen = false; $msgModal?.classList.add('hidden'); }
  async function loadMessages(){
    try{
      const res = await fetch('/api/messages');
      if(!res.ok) return;
      const ct = res.headers.get('content-type')||'';
      if(!ct.includes('application/json')) return;
      let list = await res.json().catch(()=>[]);
      list = Array.isArray(list) ? list.slice().sort((a,b)=> (Date.parse(b.ts||0)||0) - (Date.parse(a.ts||0)||0)) : [];
      renderMessages(list);
      $msgList.scrollTop = 0;
    } catch{}
  }
  function renderMessages(list){
    $msgList.innerHTML = '';
    list.forEach(m=>{
      const row = document.createElement('div');
      row.className = 'flex items-start gap-2';
  const when = new Date(m.ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true});
      row.innerHTML = `<span class="text-xs px-1 rounded bg-slate-100">${m.side}</span><span class="flex-1">${m.text}</span><span class="text-xs text-slate-500">${when}</span>`;
      $msgList.appendChild(row);
    });
  }
  async function sendMessage(){
    const text = String($msgInput.value||'').trim();
    if(!text) return;
    $msgSend.disabled = true;
    try{
      const res = await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, side: 'billing' }) });
      if(res.ok){ $msgInput.value=''; await loadMessages(); }
    } finally { $msgSend.disabled = false; }
  }
  $btnMessages?.addEventListener('click', openMessages);
  $msgClose?.addEventListener('click', closeMessages);
  $msgSend?.addEventListener('click', sendMessage);
  $msgInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });

  const THIS_SIDE = 'billing';
  socket.on('messages:new', (m)=>{
    if(Number(m?.server)!==serverNum) return;
    if(msgOpen){
      loadMessages();
    } else if (m.side !== THIS_SIDE){
      setUnread(unread + 1);
    }
  });
})();
