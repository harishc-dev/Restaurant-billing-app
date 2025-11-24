import fs from 'fs/promises';
import path from 'path';
import { randomInt, randomUUID } from 'crypto';

function ensure6Digit() {
  const n = randomInt(100000, 1000000);
  return String(n);
}

export const storage = {
  filePath: null,
  availabilityFilePath: null,
  reservedTokensFilePath: null,
  tokenCountersFilePath: null,
  messagesFilePath: null,
  orders: [],
  usedTokens: new Set(),
  reservedTokens: new Map(),
  tokenCounters: { B: 0, G: 0 },
  ignoreUsedTokensByPrefix: { B: false, G: false },
  messages: [],
  availability: {},
  _flushTimer: null,
  _flushInFlight: null,
  _availFlushTimer: null,
  _availFlushInFlight: null,

  async init(filePath) {
    this.filePath = filePath;
    try {
      const buf = await fs.readFile(filePath, 'utf-8');
      this.orders = JSON.parse(buf);
      if (!Array.isArray(this.orders)) this.orders = [];
    } catch {
      this.orders = [];
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.writeFile(filePath, '[]');
    }
    this.orders.forEach((o) => this.usedTokens.add(o.token));
  },

  async initReserved(filePath){
    this.reservedTokensFilePath = filePath;
    try{
      const buf = await fs.readFile(filePath,'utf-8');
      const arr = JSON.parse(buf);
      if(Array.isArray(arr)){
        for(const t of arr){
          const tok = String(typeof t === 'string' ? t : t?.token || '');
          if(tok) this.reservedTokens.set(tok, Date.now());
        }
      }
    } catch {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.writeFile(filePath, '[]');
    }
  },

  async initTokenCounters(filePath){
    this.tokenCountersFilePath = filePath;
    try{
      const buf = await fs.readFile(filePath,'utf-8');
      const data = JSON.parse(buf);
      if(data && typeof data === 'object'){
        this.tokenCounters.B = Number(data.B||0) || 0;
        this.tokenCounters.G = Number(data.G||0) || 0;
        const oldIgnore = Boolean(data.ignoreUsed);
        const ignoreB = typeof data.ignoreUsedB === 'boolean' ? data.ignoreUsedB : oldIgnore;
        const ignoreG = typeof data.ignoreUsedG === 'boolean' ? data.ignoreUsedG : oldIgnore;
        this.ignoreUsedTokensByPrefix = { B: !!ignoreB, G: !!ignoreG };
      }
    } catch {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.writeFile(filePath, JSON.stringify({ B:0, G:0, ignoreUsedB:false, ignoreUsedG:false }, null, 2));
    }
  },

  async initAvailability(filePath){
    this.availabilityFilePath = filePath;
    try{
      const buf = await fs.readFile(filePath,'utf-8');
      const data = JSON.parse(buf);
      if (data && typeof data === 'object') this.availability = data;
      else this.availability = {};
    } catch {
      this.availability = {};
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.writeFile(filePath, '{}');
    }
  },

  async initMessages(filePath){
    this.messagesFilePath = filePath;
    try{
      const buf = await fs.readFile(filePath,'utf-8');
      const data = JSON.parse(buf);
      this.messages = Array.isArray(data) ? data : [];
    } catch {
      this.messages = [];
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.writeFile(filePath, '[]');
    }
  },

  async flush() {
    if (this._flushInFlight) return this._flushInFlight;
    if (this._flushTimer) clearTimeout(this._flushTimer);
    this._flushInFlight = new Promise((resolve) => {
      this._flushTimer = setTimeout(async () => {
        try {
          const tmp = `${this.filePath}.tmp`;
          const data = JSON.stringify(this.orders, null, 2);
          await fs.writeFile(tmp, data);
          await fs.rename(tmp, this.filePath);
        } finally {
          this._flushInFlight = null;
          this._flushTimer = null;
          resolve();
        }
      }, 200);
    });
    return this._flushInFlight;
  },

  async flushAvailability(){
    if(!this.availabilityFilePath) return;
    if (this._availFlushInFlight) return this._availFlushInFlight;
    if (this._availFlushTimer) clearTimeout(this._availFlushTimer);
    this._availFlushInFlight = new Promise((resolve) => {
      this._availFlushTimer = setTimeout(async () => {
        try {
          const tmp = `${this.availabilityFilePath}.tmp`;
          const data = JSON.stringify(this.availability, null, 2);
          await fs.writeFile(tmp, data);
          await fs.rename(tmp, this.availabilityFilePath);
        } finally {
          this._availFlushInFlight = null;
          this._availFlushTimer = null;
          resolve();
        }
      }, 200);
    });
    return this._availFlushInFlight;
  },

  async flushReserved(){
    if(!this.reservedTokensFilePath) return;
    const list = Array.from(this.reservedTokens.keys());
    const data = JSON.stringify(list, null, 2);
    try{
      const tmp = `${this.reservedTokensFilePath}.tmp`;
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, this.reservedTokensFilePath);
    } catch{}
  },

  async flushTokenCounters(){
    if(!this.tokenCountersFilePath) return;
    const dataObj = { B: this.tokenCounters.B, G: this.tokenCounters.G, ignoreUsedB: !!this.ignoreUsedTokensByPrefix.B, ignoreUsedG: !!this.ignoreUsedTokensByPrefix.G };
    const data = JSON.stringify(dataObj, null, 2);
    try{
      const tmp = `${this.tokenCountersFilePath}.tmp`;
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, this.tokenCountersFilePath);
    } catch{}
  },

  async flushMessages(){
    if(!this.messagesFilePath) return;
    const data = JSON.stringify(this.messages, null, 2);
    try{
      const tmp = `${this.messagesFilePath}.tmp`;
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, this.messagesFilePath);
    } catch{}
  },

  _prefixForServer(server){
    return Number(server) === 2 ? 'G' : 'B';
  },

  async reserveNextTokenForServer(server){
    const prefix = this._prefixForServer(server);
    for(let i=0;i<1000000;i++){
      const next = (this.tokenCounters[prefix]||0) + 1;
      const candidate = prefix + String(next);
      this.tokenCounters[prefix] = next;
      const usedOk = (this.ignoreUsedTokensByPrefix && this.ignoreUsedTokensByPrefix[prefix]) ? true : !this.usedTokens.has(candidate);
      if(usedOk && !this.reservedTokens.has(candidate)){
        this.reservedTokens.set(candidate, Date.now());
        await this.flushTokenCounters();
        await this.flushReserved();
        return candidate;
      }
    }
    return null;
  },

  async previewToken(){
    for(let i=0;i<1000;i++){
      const t = ensure6Digit();
      if(!this.usedTokens.has(t) && !this.reservedTokens.has(t)) return t;
    }
    for(let base=100000;base<1000000;base++){
      const t = String(base);
      if(!this.usedTokens.has(t) && !this.reservedTokens.has(t)) return t;
    }
    return null;
  },

  async tryReserveSpecific(token){
    const t = String(token||'');
    if(!t) return false;
    if(this.usedTokens.has(t) || this.reservedTokens.has(t)) return false;
    this.reservedTokens.set(t, Date.now());
    await this.flushReserved();
    return true;
  },

  async reserveToken() {
    for (let i = 0; i < 1000; i++) {
      const token = ensure6Digit();
      if (!this.usedTokens.has(token) && !this.reservedTokens.has(token)) {
        this.reservedTokens.set(token, Date.now());
        await this.flushReserved();
        return token;
      }
    }
    for (let base = 100000; base < 1000000; base++) {
      const t = String(base);
      if (!this.usedTokens.has(t) && !this.reservedTokens.has(t)) {
        this.reservedTokens.set(t, Date.now());
        await this.flushReserved();
        return t;
      }
    }
    throw new Error('Unable to reserve unique token');
  },

  async unreserveToken(token){
    return false;
  },

  async createOrder({ token, items, total, server }) {
  this.usedTokens.add(token);
  this.reservedTokens.delete(token);
  await this.flushReserved();

    const order = {
      id: randomUUID(),
      token,
      server: Number(server) === 2 ? 2 : 1,
      items,
      total,
      processing: false,
      ready: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.orders.push(order);
    await this.flush();
    return order;
  },

  async getOrders({ status = 'all', server = 'all' } = {}) {
    let arr = this.orders
      .slice()
      .sort((a, b) => {
        const at = Date.parse(a.completedAt || a.createdAt || 0) || 0;
        const bt = Date.parse(b.completedAt || b.createdAt || 0) || 0;
        return bt - at;
      });
    if (status !== 'all') arr = arr.filter((o) => o.status === status);
    if (server !== 'all') arr = arr.filter((o) => o.server === server);
    return arr;
  },

  async completeOrder(token) {
    const idx = this.orders.findIndex((o) => o.token === String(token));
    if (idx === -1) return null;
    const o = this.orders[idx];
    if (o.status !== 'completed') {
      o.status = 'completed';
      o.completedAt = new Date().toISOString();
      await this.flush();
    }
    return o;
  },

  async setProcessing(token, processing = true) {
    const o = this.orders.find((x) => x.token === String(token));
    if (!o) return null;
    if (processing === 'ready') {
      o.processing = false;
      o.ready = true;
    } else {
      o.processing = Boolean(processing);
      if (!o.processing) o.ready = false;
    }
    await this.flush();
    return o;
  },

  async setReady(token, ready = true){
    const o = this.orders.find((x) => x.token === String(token));
    if(!o) return null;
    o.processing = false;
    o.ready = Boolean(ready);
    await this.flush();
    return o;
  },

  _serverKey(server){
    return String(Number(server) === 2 ? 2 : 1);
  },
  async getUnavailableIds(server){
    const key = this._serverKey(server);
    const map = this.availability[key] || {};
    return Object.keys(map).filter(id => map[id] === false);
  },
  async setUnavailableIds(server, ids){
    const key = this._serverKey(server);
    const obj = {};
    for (const id of ids || []) obj[id] = false;
    this.availability[key] = obj;
    await this.flushAvailability();
    return this.availability[key];
  },
  async toggleAvailability(server, id, available){
    const key = this._serverKey(server);
    const map = this.availability[key] || (this.availability[key] = {});
    if (available) {
      delete map[id];
    } else {
      map[id] = false;
    }
    await this.flushAvailability();
    return map;
  },

  async addMessage({ server, side, text, user }){
    const msg = {
      id: randomUUID(),
      server: Number(server) === 2 ? 2 : 1,
      side: side === 'kitchen' ? 'kitchen' : (side === 'admin' ? 'admin' : 'billing'),
      text: String(text || ''),
      user: user ? String(user) : undefined,
      ts: new Date().toISOString()
    };
    this.messages.push(msg);
    await this.flushMessages();
    return msg;
  },

  async getMessages({ server = 'all' } = {}){
    const s = server === 'all' ? 'all' : (Number(server) === 2 ? 2 : 1);
    return this.messages
      .filter(m => s === 'all' ? true : m.server === s)
      .sort((a,b)=> (Date.parse(a.ts||0)||0) - (Date.parse(b.ts||0)||0));
  },

  async resetTokensOnly(){
    this.reservedTokens.clear();
    await this.flushReserved();
    this.tokenCounters.B = 0; this.tokenCounters.G = 0;
    this.ignoreUsedTokensByPrefix = { B: true, G: true };
    await this.flushTokenCounters();
  },

  async resetTokensForServer(server){
    const prefix = this._prefixForServer(server);
    for(const t of Array.from(this.reservedTokens.keys())){
      if(String(t).startsWith(prefix)) this.reservedTokens.delete(t);
    }
    await this.flushReserved();
    this.tokenCounters[prefix] = 0;
    if(!this.ignoreUsedTokensByPrefix) this.ignoreUsedTokensByPrefix = { B:false, G:false };
    this.ignoreUsedTokensByPrefix[prefix] = true;
    await this.flushTokenCounters();
  },

  async resetAllData(){
    this.orders = [];
    await this.flush();
    this.usedTokens.clear();
    this.availability = {};
    await this.flushAvailability();
    this.messages = [];
    await this.flushMessages();
    this.reservedTokens.clear();
    await this.flushReserved();
    this.tokenCounters.B = 0; this.tokenCounters.G = 0; this.ignoreUsedTokens = false;
    await this.flushTokenCounters();
  }
};
