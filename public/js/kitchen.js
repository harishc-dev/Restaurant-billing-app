(function(){
  const bootEl = document.getElementById('bootstrap');
  const serverNum = Number(bootEl?.dataset?.server) === 2 ? 2 : 1;
  const $orders = document.getElementById('orders');
  const btnMark = document.getElementById('btn-mark-unavail');
  const modal = document.getElementById('avail-modal');
  const $list = document.getElementById('avail-list');
  const $apply = document.getElementById('avail-apply');
  const $cancel = document.getElementById('avail-cancel');

  const socket = io({ transports: ['websocket'], upgrade: true, reconnection: true, reconnectionDelay: 300, reconnectionDelayMax: 1500 });
  socket.on('connect', ()=>{
    socket.emit('join-server', serverNum);
    const el = document.getElementById('conn-state');
    if (el) el.textContent = `Connected • ${serverNum===2?'Girls':'Boys'}`;
    fetchPending();
    
    loadAvailability();
  });
  socket.on('disconnect', ()=>{
    const el = document.getElementById('conn-state');
    if (el) el.textContent = 'Disconnected';
  });

  let orderMap = new Map(); 
  let items = [];
  let unavailable = new Set(); 

  function createOrderCard(o){
    const card = document.createElement('div');
    const readyClass = o.ready ? ' ready-card' : '';
    card.className = 'card order-card' + readyClass;
    card.dataset.token = o.token;
    const processingClass = o.ready ? 'btn-warning disabled' : (o.processing ? 'btn-primary' : 'btn-secondary');
    const processingLabel = o.ready ? 'Ready' : 'Processing';
    const processingDisabled = o.ready ? 'disabled' : '';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm">Token: <span class="font-bold">${o.token}</span></div>
          <div class="text-xs text-slate-500">Total ₹${o.total}</div>
        </div>
        <div class="flex gap-2">
          <button class="${processingClass}" ${processingDisabled} data-act="processing" data-token="${o.token}">${processingLabel}</button>
          <button class="btn-accent" data-act="complete" data-token="${o.token}">Completed</button>
        </div>
      </div>
      <div class="mt-2 text-sm">
        ${o.items.map(it => `<div class=\"flex justify-between\"><div>${it.name} × ${it.qty}</div><div>₹${it.price * it.qty}</div></div>`).join('')}
      </div>`;
    return card;
  }

  function render(){
    
    const arr = Array.from(orderMap.values()).sort((a,b)=>{
      const at = Date.parse(a.createdAt || 0) || 0;
      const bt = Date.parse(b.createdAt || 0) || 0;
      return at - bt;
    });

    
    const existingEls = Array.from($orders.querySelectorAll('.order-card'));
    const existingTokens = new Set(existingEls.map(el => el.dataset.token).filter(Boolean));
    const tokensInArr = new Set(arr.map(o => o.token));

    
    existingEls.forEach(el => { if(!tokensInArr.has(el.dataset.token)) el.remove(); });

    
    if(arr.length === 0){
      $orders.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'text-sm text-slate-500';
      d.textContent = 'No pending orders.';
      $orders.appendChild(d);
      return;
    }

    
    arr.forEach(o => {
      const sel = `.order-card[data-token="${o.token}"]`;
      const existing = $orders.querySelector(sel);
      if(existing){
        
        if(o.ready){
          existing.classList.add('ready-card');
        } else {
          existing.classList.remove('ready-card');
        }
        
        const btnProc = existing.querySelector('button[data-act="processing"]');
        if(btnProc){
          const processingClass = o.ready ? 'btn-warning disabled' : (o.processing ? 'btn-primary' : 'btn-secondary');
          btnProc.className = processingClass;
          btnProc.textContent = o.ready ? 'Ready' : 'Processing';
          if(o.ready){ btnProc.setAttribute('disabled','disabled'); } else { btnProc.removeAttribute('disabled'); }
        }
        return; 
      }
      
      const card = createOrderCard(o);
      $orders.appendChild(card);
    });

    
  }

  
  $orders.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if(!btn) return;
    const act = btn.getAttribute('data-act');
    const token = btn.getAttribute('data-token');
    if(!token) return;
    if(act === 'processing') {
      
      if(btn.disabled) return;
      btn.disabled = true;
      setProcessing(token).finally(()=>{ btn.disabled = false; });
    }
    else if(act === 'complete') {
      
      if(btn.disabled) return;
      btn.disabled = true;
      complete(token).catch(()=>{ btn.disabled = false; });
    }
  });

  async function fetchPending(){
    const res = await fetch(`/api/orders?status=pending&server=${serverNum}`);
    if(!res.ok) return;
    const ct = res.headers.get('content-type')||'';
    if(!ct.includes('application/json')) return;
    const data = await res.json().catch(()=>null);
    if(!data) return;
    orderMap = new Map(data.map(o => [o.token, o]));
    render();
  }

  async function loadItems(){
    const res = await fetch('/api/items');
    if(!res.ok) return [];
    const ct = res.headers.get('content-type')||'';
    if(!ct.includes('application/json')) return [];
    items = await res.json().catch(()=>[]);
    return items;
  }

  async function loadAvailability(){
    const res = await fetch(`/api/availability?server=${serverNum}`);
    if(!res.ok) return;
    const ct = res.headers.get('content-type')||'';
    if(!ct.includes('application/json')) return;
    const data = await res.json().catch(()=>null);
    if(!data) return;
    unavailable = new Set(data.unavailable || []);
  }

  function openModal(){
    modal.classList.remove('hidden');
    renderAvailList();
  }

  function closeModal(){
    modal.classList.add('hidden');
  }

  function renderAvailList(){
    if(!items || items.length === 0){
      $list.innerHTML = '<div class="text-sm text-slate-500">Loading…</div>';
      return;
    }
    $list.innerHTML = '';
    items.forEach(it => {
      const row = document.createElement('label');
      row.className = 'modal-row';
      const id = `chk-${it.id}`;
      row.htmlFor = id;
      const checked = unavailable.has(it.id);
      row.innerHTML = `<div class=\"font-medium\">${it.name}</div>
        <input id=\"${id}\" type=\"checkbox\" ${checked?'checked':''} />`;
      $list.appendChild(row);
    });
  }

  async function saveAvailability(){
    
    const ids = [];
    $list.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      
      const id = chk.id.replace(/^chk-/, '');
      if (chk.checked) ids.push(id);
    });
    const res = await fetch('/api/availability', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ server: serverNum, unavailable: ids }) });
    if(!res.ok){ showToast('Failed to save'); return; }
    showToast('Availability updated');
    closeModal();
  }

  async function complete(token){
    const res = await fetch(`/api/orders/${encodeURIComponent(token)}/complete`, { method: 'POST', headers: { 'Cache-Control': 'no-store' } });
    if(!res.ok){ showToast('Failed to complete'); throw new Error('complete failed'); }
    showToast(`Order ${token} Completed!`);
    orderMap.delete(token);
    render();
  }

  async function setProcessing(token){
    const o = orderMap.get(token);
    const next = (!o || (!o.processing && !o.ready)) ? 'processing' : (o.processing && !o.ready ? 'ready' : 'noop');
    if(next === 'noop') return;
    const body = next === 'processing' ? { processing: true } : { processing: 'ready' };
    const res = await fetch(`/api/orders/${encodeURIComponent(token)}/processing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if(!res.ok){ showToast('Failed to update'); return; }
    if(next === 'processing'){ showToast(`Order ${token} marked Processing`); }
    if(next === 'ready'){ showToast(`Order ${token} is Ready`); }
  }

  socket.on('order:new', (order) => {
    if(order.server !== serverNum) return;
    orderMap.set(order.token, order);
    render();
    showToast(`New Order ${order.token}`);
  });
  socket.on('availability:update', ({ server, unavailable: ids }) => {
    if(Number(server) !== serverNum) return;
    unavailable = new Set(ids || []);
    
    if(!modal.classList.contains('hidden')) renderAvailList();
  });
  socket.on('order:stage', ({ token, processing, ready }) => {
    const o = orderMap.get(token);
    if(o){ o.processing = !!processing; o.ready = !!ready; render(); }
  });
  socket.on('order:completed', ({ token }) => {
    orderMap.delete(token);
    render();
  });
  socket.on('order:reset', ()=>{ orderMap = new Map(); render(); showToast('Orders cleared'); });

  
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
      row.innerHTML = `<span class=\"text-xs px-1 rounded bg-slate-100\">${m.side}</span><span class=\"flex-1\">${m.text}</span><span class=\"text-xs text-slate-500\">${when}</span>`;
      $msgList.appendChild(row);
    });
  }
  async function sendMessage(){
    const text = String($msgInput.value||'').trim();
    if(!text) return;
    $msgSend.disabled = true;
    try{
      const res = await fetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, side: 'kitchen' }) });
      if(res.ok){ $msgInput.value=''; await loadMessages(); }
    } finally { $msgSend.disabled = false; }
  }
  $btnMessages?.addEventListener('click', openMessages);
  $msgClose?.addEventListener('click', closeMessages);
  $msgSend?.addEventListener('click', sendMessage);
  $msgInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendMessage(); });

  const THIS_SIDE = 'kitchen';
  socket.on('messages:new', (m)=>{
    if(Number(m?.server)!==serverNum) return;
    if(msgOpen){
      loadMessages();
    } else if (m.side !== THIS_SIDE){
      setUnread(unread + 1);
    }
  });

  
  socket.on('items:update', async (payload)=>{
    try{
      const prevIds = new Set((items||[]).map(i=>i.id));
      const list = Array.isArray(payload?.items) ? payload.items : null;
      if(list){ items = list; }
      else {
        const res = await fetch('/api/items', { headers: { 'Cache-Control': 'no-store' } });
        if(res.ok){ const ct = res.headers.get('content-type')||''; if(ct.includes('application/json')){ items = await res.json().catch(()=>items); } }
      }
      const newIds = new Set(items.map(i=>i.id));
      
      prevIds.forEach(id=>{ if(!newIds.has(id)) unavailable.delete(id); });
      if(!modal.classList.contains('hidden')) renderAvailList();
    } catch{}
  });

  fetchPending();
  
  setInterval(fetchPending, 5000);

  
  if(btnMark){
    btnMark.addEventListener('click', async ()=>{
      if(items.length === 0) await loadItems();
      await loadAvailability();
      openModal();
    });
  }
  if($apply) $apply.addEventListener('click', saveAvailability);
  if($cancel) $cancel.addEventListener('click', closeModal);
})();
