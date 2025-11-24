import fs from 'fs/promises';

export async function loadItems(filePath) {
  try {
    const buf = await fs.readFile(filePath, 'utf-8');
    const arr = JSON.parse(buf);
    if (Array.isArray(arr)) return arr.map(normalizeItem);
  } catch {}
  const defaults = [
    { id: 'burger', name: 'Veg Burger', price: 50 },
    { id: 'pizza', name: 'Cheese Pizza Slice', price: 70 },
    { id: 'pasta', name: 'White Sauce Pasta', price: 80 },
    { id: 'fries', name: 'French Fries', price: 40 },
    { id: 'coke', name: 'Coke (200ml)', price: 20 }
  ];
  return defaults;
}

function normalizeItem(it) {
  const id = String(it.id || it.name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const combo = Boolean(it.combo);
  let components = [];
  if (combo && Array.isArray(it.components)) {
    components = it.components
      .map((c) => ({
        id: String(c.id || '').trim().toLowerCase().replace(/\s+/g, '-'),
        qty: Number(c.qty) || 1
      }))
      .filter((c) => c.id && c.qty > 0);
  }
  return {
    id,
    name: String(it.name || '').trim(),
    price: Number(it.price) || 0,
    cost: Number(it.cost) || 0,
    image: typeof it.image === 'string' ? it.image.trim() : undefined,
    combo,
    components
  };
}
