(function(){
  const btn = document.getElementById('btn-remove-items');
  const modal = document.getElementById('remove-modal');
  const list = document.getElementById('rm-list');
  const apply = document.getElementById('rm-apply');
  const cancel = document.getElementById('rm-cancel');
  
  const resetBtn = document.getElementById('btn-reset-data');
  const resetModal = document.getElementById('reset-modal');
  const resetCancel = document.getElementById('reset-cancel');
  const resetApply = document.getElementById('reset-apply');
  const resetPwd = document.getElementById('reset-pwd');
  const resetScopeTokens = document.getElementById('reset-scope-tokens');
  let items = [];
  const socket = io({ transports: ['websocket'], upgrade: true, reconnection: true, reconnectionDelay: 300, reconnectionDelayMax: 1500 });

  async function loadItems(){
    const res = await fetch('/api/items');
    if(!res.ok) return [];
    items = await res.json();
    return items;
  }

  function open(){
    modal.classList.remove('hidden');
    renderList();
  }
  function close(){ modal.classList.add('hidden'); }

  function renderList(){
    if(!items || items.length===0){ list.innerHTML = '<div class="text-sm text-slate-500">No items.</div>'; return; }
    list.innerHTML = '';
    items.forEach(it => {
      const row = document.createElement('label');
      row.className = 'modal-row';
      const id = 'rm-'+it.id;
      row.htmlFor = id;
      row.innerHTML = `<div class="font-medium">${it.name}</div><input id="${id}" type="checkbox" />`;
      list.appendChild(row);
    });
  }

  async function applyRemove(){
    const ids = [];
    list.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      if(chk.checked){ ids.push(chk.id.replace(/^rm-/, '')); }
    });
    if(ids.length === 0){ close(); return; }
    const res = await fetch('/admin/items/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    if(res.ok){
      
      items = items.filter(it => !ids.includes(it.id));
      renderList();
      
    } else {
      close();
    }
  }

  if(btn){
    btn.addEventListener('click', async ()=>{ await loadItems(); open(); });
  }
  if(apply) apply.addEventListener('click', applyRemove);
  if(cancel) cancel.addEventListener('click', close);

  
  function openReset(){ resetModal.classList.remove('hidden'); resetPwd.value=''; }
  function closeReset(){ resetModal.classList.add('hidden'); }
  async function applyReset(){
    const scope = resetScopeTokens?.checked ? 'tokens' : 'all';
    const password = String(resetPwd.value||'');
    if(!password){ alert('Enter password'); return; }
    resetApply.disabled = true;
    try{
      const res = await fetch('/admin/reset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ scope, password }) });
      if(!res.ok){ alert('Reset failed'); return; }
      const data = await res.json();
      alert(`Reset ${data.scope} completed`);
      closeReset();
    } finally { resetApply.disabled = false; }
  }
  if(resetBtn) resetBtn.addEventListener('click', openReset);
  if(resetCancel) resetCancel.addEventListener('click', closeReset);
  if(resetApply) resetApply.addEventListener('click', applyReset);

  
  socket.on('items:update', async (payload)=>{
    const listData = Array.isArray(payload?.items) ? payload.items : null;
    if(listData){ items = listData; }
    else {
      const res = await fetch('/api/items', { headers: { 'Cache-Control': 'no-store' } });
      if(res.ok) items = await res.json();
    }
    if(!modal.classList.contains('hidden')) renderList();
  });
})();
