(function(){
  const $grid = document.getElementById('stat-items');
  const $title = document.getElementById('stat-title');
  const $price = document.getElementById('stat-price');
  const $details = document.getElementById('stat-details');
  const ctx = document.getElementById('stat-chart').getContext('2d');
  let items = [];
  const socket = io({ transports: ['websocket'], upgrade: true, reconnection: true, reconnectionDelay: 300, reconnectionDelayMax: 1500 });
  let selectedId = null;

  function drawPie(boys, girls){
    const total = Math.max(1, boys + girls);
    const start = -Math.PI/2;
    const a1 = (boys/total) * Math.PI*2;
    const a2 = (girls/total) * Math.PI*2;
    const cx = 110, cy = 110, r = 90;
    ctx.clearRect(0,0,360,220);
    ctx.beginPath();
    ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+a1); ctx.closePath();
    ctx.fillStyle = '#2563eb'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start+a1,start+a1+a2); ctx.closePath();
    ctx.fillStyle = '#16a34a'; ctx.fill();
    
    const textColor = '#EDEBFF';
    ctx.font = '13px system-ui';
    
    ctx.fillStyle = '#2563eb'; ctx.fillRect(230, 80, 12, 12);
    ctx.fillStyle = textColor; ctx.fillText(`Boys: ${boys}`, 248, 90);
    
    ctx.fillStyle = '#16a34a'; ctx.fillRect(230, 110, 12, 12);
    ctx.fillStyle = textColor; ctx.fillText(`Girls: ${girls}`, 248, 120);
  }

  async function loadItems(){
    const res = await fetch('/api/items');
    if(!res.ok) return;
    items = await res.json();
    $grid.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'main-cta block text-center py-3 font-semibold';
      b.textContent = it.name;
      b.addEventListener('click', ()=> selectItem(it));
      $grid.appendChild(b);
    });
  }

  async function selectItem(it){
    selectedId = it.id;
    $title.textContent = it.name;
    $price.textContent = 'Price ₹'+(it.price||0)+' • Cost ₹'+(it.cost||0);
    const res = await fetch('/api/stats/item/'+encodeURIComponent(it.id));
    if(!res.ok) return;
    const s = await res.json();
    drawPie(s.boysQty||0, s.girlsQty||0);
    const lines = [];
    lines.push('Total sold: '+(s.totalQty||0));
    lines.push('Revenue: ₹'+(s.revenue||0));
    lines.push('Cost: ₹'+(s.costTotal||0));
    lines.push('Profit: ₹'+(s.profit||0));
    $details.innerHTML = lines.join('<br/>');
  }

  loadItems();

  
  socket.on('items:update', async (payload)=>{
    const list = Array.isArray(payload?.items) ? payload.items : null;
    if(list){ items = list; }
    else {
      const res = await fetch('/api/items', { headers: { 'Cache-Control': 'no-store' } });
      if(res.ok) items = await res.json();
    }
    
    if(selectedId && !items.some(i=>i.id===selectedId)){
      selectedId = null;
      $title.textContent = 'Select an item';
      $price.textContent = '';
      $details.innerHTML = '';
      try{ const c = document.getElementById('stat-chart'); c.getContext('2d').clearRect(0,0,c.width,c.height); } catch{}
    }
    
    $grid.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'main-cta block text-center py-3 font-semibold';
      b.textContent = it.name;
      b.addEventListener('click', ()=> selectItem(it));
      $grid.appendChild(b);
    });
  });
})();
