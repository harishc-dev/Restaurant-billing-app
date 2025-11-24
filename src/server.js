import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { storage } from './storage.js';
import { loadItems } from './items.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*'
  }
});

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.locals.assetVersion = process.env.ASSET_VERSION || Date.now();

app.use(
  compression({
    level: 6
  })
);
const isProd = process.env.NODE_ENV === 'production';
app.use(
  '/public',
  express.static(path.join(__dirname, '..', 'public'), {
    etag: true,
    maxAge: isProd ? '30d' : 0,
    immutable: isProd
  })
);

app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(express.json({ limit: '64kb' }));

app.locals.assetVersion = process.env.ASSET_VERSION || Date.now();
app.use((req, res, next) => {
  res.locals.assetVersion = app.locals.assetVersion;
  next();
});

const SESSION_SECRET = process.env.SESSION_SECRET || 'innowiz-secret';
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

const CREDENTIALS = [
  { username: 'ADMIN', password: 'pass', role: 'admin' },
  { username: 'BOYS', password: 'pass', role: 'boys' },
  { username: 'GIRLS', password: 'pass', role: 'girls' }
];

const ITEMS_PATH = path.join(__dirname, '..', 'data', 'items.json');
const ITEMS = await loadItems(ITEMS_PATH);
await storage.init(path.join(__dirname, '..', 'data', 'orders.json'));
await storage.initReserved(path.join(__dirname, '..', 'data', 'reserved-tokens.json'));
await storage.initTokenCounters(path.join(__dirname, '..', 'data', 'token-state.json'));
await storage.initAvailability(path.join(__dirname, '..', 'data', 'availability.json'));
await storage.initMessages(path.join(__dirname, '..', 'data', 'messages.json'));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

function getServerFromSession(req) {
  return req.session?.server === 2 ? 2 : 1;
}

function labelForServer(server){
  return Number(server) === 2 ? 'Girls' : 'Boys';
}

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const uName = String(username || '').trim().toUpperCase();
  const uPass = String(password || '');
  const user = CREDENTIALS.find((c) => c.username === uName && c.password === uPass);
  if (!user) return res.status(401).render('login', { error: 'Invalid credentials' });
  req.session.user = { name: user.username, role: user.role };
  if (user.role === 'boys') req.session.server = 1;
  if (user.role === 'girls') req.session.server = 2;
  res.redirect('/');
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/', requireAuth, (req, res) => {
  const role = req.session.user?.role || 'user';
  const serverSel = getServerFromSession(req);
  const serverName = serverSel === 2 ? 'Girls' : 'Boys';
  res.render('menu', { user: req.session.user, role, serverName });
});

app.get('/select-server', requireAuth, (req, res) => {
  const { next = '/' } = req.query;
  const role = req.session.user?.role;
  if (role === 'boys' || role === 'girls') {
    const s = role === 'girls' ? 2 : 1;
    req.session.server = s;
    return res.redirect(next);
  }
  res.render('select-server', { next });
});

app.post('/select-server', requireAuth, (req, res) => {
  const { server, next = '/' } = req.body;
  const s = Number(server) === 2 ? 2 : 1;
  req.session.server = s;
  res.redirect(next);
});

app.get('/billing', requireAuth, (req, res) => {
  const serverSel = getServerFromSession(req);
  const serverName = labelForServer(serverSel);
  const isAdmin = req.session.user?.role === 'admin';
  res.render('billing', { items: ITEMS, server: serverSel, serverName, isAdmin, user: req.session.user });
});

app.get('/kitchen', requireAuth, async (req, res) => {
  const serverSel = getServerFromSession(req);
  const serverName = labelForServer(serverSel);
  const isAdmin = req.session.user?.role === 'admin';
  res.render('kitchen', { server: serverSel, serverName, isAdmin, user: req.session.user });
});

function requireAdmin(req, res, next){
  if (req.session?.user?.role === 'admin') return next();
  res.redirect('/');
}

app.get('/history', requireAuth, requireAdmin, async (req, res) => {
  const { status = 'all', server = 'all' } = req.query;
  const serverFilter = server === '1' ? 1 : server === '2' ? 2 : 'all';
  const orders = await storage.getOrders({ status, server: serverFilter });
  
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  let totalCost = 0;
  completedOrders.forEach(order => {
    order.items.forEach(orderItem => {
      const itemDef = ITEMS.find(i => i.id === orderItem.id);
      if (itemDef) {
        const itemCost = Number(itemDef.cost) || 0;
        totalCost += itemCost * orderItem.qty;
      }
    });
  });
  
  const profit = revenue - totalCost;
  
  const fmtTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };
  res.render('history', {
    orders,
    filters: { status, server },
    revenue,
    totalCost,
    profit,
    fmtTime
  });
});

app.get('/admin/stats', requireAuth, requireAdmin, (req, res) => {
  res.render('stats', {});
});

app.get('/admin/messages', requireAuth, requireAdmin, async (req, res) => {
  let list = await storage.getMessages({ server: 'all' });
  list = list.sort((a,b)=> (Date.parse(a.ts||0)||0) - (Date.parse(b.ts||0)||0));
  const merged = [];
  for(const m of list){
    if(m.side === 'admin' && merged.length){
      const last = merged[merged.length-1];
      const dt = Math.abs((Date.parse(m.ts||0)||0) - (Date.parse(last.ts||0)||0));
      if(last.side === 'admin' && last.text === m.text && dt < 10000){
        continue;
      }
    }
    merged.push(m);
  }
  res.render('messages-admin', { messages: merged });
});

app.get('/messages', requireAuth, async (req, res) => {
  const role = req.session.user?.role;
  let serverSel = getServerFromSession(req);
  if(role === 'admin') return res.redirect('/admin/messages');
  const list = await storage.getMessages({ server: serverSel });
  res.render('messages-user', { server: serverSel, serverName: labelForServer(serverSel), messages: list });
});

app.get('/admin/messages', requireAuth, requireAdmin, async (req, res) => {
  let list = await storage.getMessages({ server: 'all' });
  list = list.sort((a,b)=> (Date.parse(a.ts||0)||0) - (Date.parse(b.ts||0)||0));
  const merged = [];
  for(const m of list){
    if(m.side === 'admin' && merged.length){
      const last = merged[merged.length-1];
      const dt = Math.abs((Date.parse(m.ts||0)||0) - (Date.parse(last.ts||0)||0));
      if(last.side === 'admin' && last.text === m.text && dt < 10000){
        continue;
      }
    }
    merged.push(m);
  }
  res.render('messages-admin', { messages: merged });
});

app.get('/admin/reset-page', requireAuth, requireAdmin, (req, res) => {
  res.render('reset', { error: null });
});

app.post('/admin/reset', requireAuth, requireAdmin, async (req, res) => {
  try{
    const { scope = 'tokens', password = '', server: serverParam } = req.body || {};
    if(scope === 'all'){
      if(String(password) !== 'pass') return res.status(401).json({ error: 'Invalid password' });
      await storage.resetAllData();
      try{ io.emit('order:reset'); } catch{}
      return res.json({ ok: true, scope: 'all' });
    }
    if(String(password) !== 'pass') return res.status(401).json({ error: 'Invalid password' });
    const sVal = Number(serverParam);
    if(sVal !== 1 && sVal !== 2){
      return res.status(400).json({ error: 'Select Boys (1) or Girls (2) for token reset' });
    }
    await storage.resetTokensForServer(sVal);
    return res.json({ ok: true, scope: 'tokens', server: sVal });
  } catch(e){
    res.status(500).json({ error: 'Failed to reset' });
  }
});

app.get('/api/stats/item/:id', requireAuth, requireAdmin, async (req, res) => {
  try{
    const id = String(req.params.id || '').trim();
    const item = (ITEMS || []).find(i => i.id === id);
    if(!item) return res.status(404).json({ error: 'Not found' });
    const orders = await storage.getOrders({ status: 'completed', server: 'all' });
    let boys = 0, girls = 0, total = 0;
    for(const o of orders){
      const it = (o.items||[]).find(x => String(x.id) === id);
      if(!it) continue;
      total += Number(it.qty)||0;
      if(o.server === 2) girls += Number(it.qty)||0; else boys += Number(it.qty)||0;
    }
    const price = Number(item.price)||0;
    const cost = Number(item.cost||0);
    const revenue = total * price;
    const costTotal = total * cost;
    const profit = revenue - costTotal;
    res.json({ id, name: item.name, price, cost, totalQty: total, boysQty: boys, girlsQty: girls, revenue, costTotal, profit });
  } catch(e){
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/items', requireAuth, async (req, res) => {
  try {
    const current = await loadItems(ITEMS_PATH);
    if (Array.isArray(current)) {
      ITEMS.splice(0, ITEMS.length, ...current);
    }
    res.set('Cache-Control', 'no-store');
    res.json(ITEMS);
  } catch (e) {
    res.set('Cache-Control', 'no-store');
    res.json(ITEMS);
  }
});

app.get('/api/availability', requireAuth, async (req, res) => {
  try{
    let serverSel = req.query.server ? Number(req.query.server) : getServerFromSession(req);
    if (req.session.user?.role !== 'admin') serverSel = getServerFromSession(req);
    const unavailable = await storage.getUnavailableIds(serverSel);
    res.json({ server: serverSel, unavailable });
  } catch (e){
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

app.post('/api/availability', requireAuth, async (req, res) => {
  try{
    let serverSel = req.body.server ? Number(req.body.server) : getServerFromSession(req);
    if (req.session.user?.role !== 'admin') serverSel = getServerFromSession(req);
    const list = Array.isArray(req.body.unavailable) ? req.body.unavailable.map(x=>String(x)) : [];
    await storage.setUnavailableIds(serverSel, list);
    const payload = { server: serverSel, unavailable: list };
    const room = `server:${serverSel}`;
    io.to(room).emit('availability:update', payload);
    res.json({ ok: true, ...payload });
  } catch (e){
    res.status(500).json({ error: 'Failed to set availability' });
  }
});

app.get('/api/messages', requireAuth, async (req, res) => {
  try{
    const role = req.session.user?.role;
    let serverSel = getServerFromSession(req);
    if(role === 'admin'){
      const q = req.query.server;
      serverSel = q === 'all' ? 'all' : (q === '2' ? 2 : q === '1' ? 1 : getServerFromSession(req));
    }
    const list = await storage.getMessages({ server: serverSel });
    res.json(list);
  } catch(e){ res.status(500).json({ error: 'Failed to load messages' }); }
});

app.post('/api/messages', requireAuth, async (req, res) => {
  try{
    const role = req.session.user?.role;
    const requestedBroadcast = !!req.body?.broadcast || String(req.body?.server||'') === 'all';
    const text = String(req.body?.text || '').trim();
    let side = String(req.body?.side || 'billing');
    if(!text) return res.status(400).json({ error: 'Empty text' });

    if(role === 'admin' && requestedBroadcast){
      side = 'admin';
      const m1 = await storage.addMessage({ server: 1, side, text, user: req.session.user?.name });
      const m2 = await storage.addMessage({ server: 2, side, text, user: req.session.user?.name });
      io.to('server:1').emit('messages:new', m1);
      io.to('server:2').emit('messages:new', m2);
      return res.json({ ok: true, msgs: [m1, m2] });
    }

    const serverSel = getServerFromSession(req);
    const msg = await storage.addMessage({ server: serverSel, side, text, user: req.session.user?.name });
    io.to(`server:${serverSel}`).emit('messages:new', msg);
    res.json({ ok: true, msg });
  } catch(e){ res.status(500).json({ error: 'Failed to send message' }); }
});

app.post('/api/reserve-token', requireAuth, async (req, res) => {
  try {
    const token = await storage.reserveToken();
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reserve token' });
  }
});

app.post('/api/unreserve-token', requireAuth, async (req, res) => {
  try{
    const token = String(req.body?.token || '');
    if(!token) return res.status(400).json({ error: 'No token' });
    await storage.unreserveToken(token);
    res.json({ ok: true });
  } catch(e){
    res.status(500).json({ error: 'Failed to unreserve token' });
  }
});

app.post('/api/preview-token', requireAuth, async (req, res) => {
  try{
    const serverSel = getServerFromSession(req);
    const key = String(serverSel);
    const hold = (req.session.previewToken || {});
    if(hold[key]){
      return res.json({ token: hold[key] });
    }
    const token = await storage.reserveNextTokenForServer(serverSel);
    if(!token) return res.status(409).json({ error: 'ALL_TOKENS_USED' });
    req.session.previewToken = { ...hold, [key]: token };
    res.json({ token });
  } catch(e){
    res.status(500).json({ error: 'Failed to preview token' });
  }
});

app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const serverSel = getServerFromSession(req);
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    let token = String(req.body.token || '').trim();
    const key = String(serverSel);
    const sessionToken = req.session.previewToken?.[key];
    if(!token && sessionToken){
      token = sessionToken;
    }
    if (token) {
      if(sessionToken && sessionToken === token){
        if(!storage.reservedTokens.has(token) && !storage.usedTokens.has(token)){
          const ok = await storage.tryReserveSpecific(token);
          if(!ok) return res.status(409).json({ error: 'Token already taken, please retry' });
        }
      } else {
        const ok = await storage.tryReserveSpecific(token);
        if(!ok) return res.status(409).json({ error: 'Token already taken, please retry' });
      }
    } else {
      token = await storage.reserveNextTokenForServer(serverSel);
      if(!token) return res.status(409).json({ error: 'ALL_TOKENS_USED' });
    }
    const normalized = items
      .map((it) => ({
        id: String(it.id || it.name || '').trim(),
        name: String(it.name || '').trim(),
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 0
      }))
      .filter((it) => it.qty > 0 && it.name && it.price >= 0);
    if (normalized.length === 0) return res.status(400).json({ error: 'No items' });
    const total = normalized.reduce((s, it) => s + it.price * it.qty, 0);

    const expandMap = new Map();
    const byId = new Map((ITEMS || []).map((d) => [String(d.id), d]));
    for (const it of normalized) {
      const def = byId.get(String(it.id));
      const isCombo = def && def.combo && Array.isArray(def.components) && def.components.length > 0;
      if (isCombo) {
        for (const comp of def.components) {
          const base = byId.get(String(comp.id));
          if (!base) continue;
          const qty = (Number(comp.qty) || 1) * (Number(it.qty) || 0);
          if (qty <= 0) continue;
          const key = base.id;
          const prev = expandMap.get(key) || { id: base.id, name: base.name, price: Number(base.price) || 0, qty: 0 };
          prev.qty += qty;
          expandMap.set(key, prev);
        }
      } else {
        const base = def || it;
        const key = String(base.id || it.id);
        const prev = expandMap.get(key) || { id: key, name: base.name || it.name, price: Number(base.price || it.price) || 0, qty: 0 };
        prev.qty += Number(it.qty) || 0;
        expandMap.set(key, prev);
      }
    }
    const expandedItems = Array.from(expandMap.values()).filter((x) => x.qty > 0);

    const order = await storage.createOrder({ token, items: expandedItems, total, server: serverSel });

  if(req.session.previewToken){
    delete req.session.previewToken[key];
  }

  const room = `server:${serverSel}`;
  console.log(`[checkout] Emitting order:new token=${order.token} server=${serverSel} room=${room}`);
  io.to(room).emit('order:new', order);

    res.json({ ok: true, order });
  } catch (e) {
    res.status(500).json({ error: 'Checkout failed' });
  }
});

app.get('/api/orders', requireAuth, async (req, res) => {
  const { status = 'pending', server = 'all' } = req.query;
  let serverFilter = server === '1' ? 1 : server === '2' ? 2 : 'all';
  if (req.session.user?.role !== 'admin') serverFilter = getServerFromSession(req);
  const orders = await storage.getOrders({ status, server: serverFilter });
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json(orders);
});

app.post('/api/orders/:token/complete', requireAuth, async (req, res) => {
  try {
    const token = String(req.params.token);
    const updated = await storage.completeOrder(token);
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    io.to(`server:${updated.server}`).emit('order:completed', { token: updated.token });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete' });
  }
});

app.post('/api/orders/:token/processing', requireAuth, async (req, res) => {
  try {
    const token = String(req.params.token);
    const bodyVal = req.body?.processing;
    const processing = (typeof bodyVal === 'boolean' || bodyVal === 'ready') ? bodyVal : true;
    const updated = await storage.setProcessing(token, processing);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    io.to(`server:${updated.server}`).emit('order:stage', { token: updated.token, processing: updated.processing, ready: updated.ready });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to set processing' });
  }
});

app.get('/api/export.csv', requireAuth, async (req, res) => {
  try {
    const { status = 'all', server = 'all' } = req.query;
    const serverFilter = server === '1' ? 1 : server === '2' ? 2 : 'all';
    const orders = await storage.getOrders({ status, server: serverFilter });
    const lines = [];
    lines.push(['token','time','item','qty','unit_price','line_total','order_total','server','status'].join(','));
    const timeOf = (o) => new Date(o.completedAt || o.createdAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true});
    for (const o of orders) {
      for (const it of o.items) {
        const row = [
          o.token,
          timeOf(o),
          csvEscape(it.name),
          it.qty,
          it.price,
          (it.price * it.qty),
          o.total,
          o.server,
          o.status
        ];
        lines.push(row.join(','));
      }
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).send('Failed to export CSV');
  }
});

function csvEscape(val){
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

io.on('connection', (socket) => {
  console.log('[socket] client connected', socket.id);
  socket.on('join-server', (serverNum) => {
    const room = `server:${Number(serverNum) === 2 ? 2 : 1}`;
    socket.join(room);
    console.log('[socket] joined room', room, 'socket', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] client disconnected', socket.id, reason);
  });
});

const PORT = process.env.PORT || 3000;

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on('connection', (socket) => {
  socket.setNoDelay(true);
});

server.listen(PORT, () => {
  console.log(`Nexus Of Delights server listening on port ${PORT}`);
});
