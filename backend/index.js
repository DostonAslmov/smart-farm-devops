const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// -------------------- In-memory data --------------------
let products = [
  { id: 1, name: 'Tomato', price: 5000 },
  { id: 2, name: 'Potato', price: 3000 }
];

let priceHistory = []; // { productId, productName, oldPrice, newPrice, changedAt }

let orders = []; // { id, customerName, items:[{productId, qty}], total, createdAt }

// -------------------- Notification (mock) --------------------
// We write notifications to a file so we have "evidence" for assignment.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const NOTIF_FILE = path.join(DATA_DIR, 'notifications.log');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function notifyNewOrder(order) {
  ensureDataDir();
  const msg = `[${new Date().toISOString()}] NEW ORDER #${order.id} | Customer=${order.customerName} | Total=${order.total}\n`;
  fs.appendFileSync(NOTIF_FILE, msg, 'utf8');
  console.log(msg.trim());
}

// -------------------- Routes --------------------
app.get('/', (req, res) => res.send('Smart Farm API is running'));

// Products
app.get('/products', (req, res) => res.json(products));

app.post('/products', (req, res) => {
  const { name, price } = req.body;
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name (string) and price (number) are required' });
  }
  const newProduct = {
    id: products.length ? products[products.length - 1].id + 1 : 1,
    name,
    price
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body;

  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (typeof price === 'number' && price !== product.price) {
    priceHistory.push({
      productId: product.id,
      productName: product.name,
      oldPrice: product.price,
      newPrice: price,
      changedAt: new Date().toISOString()
    });
    product.price = price;
  }
  if (name) product.name = name;

  res.json(product);
});

app.get('/price-history', (req, res) => res.json(priceHistory));

// Orders (TASK 2)
app.get('/orders', (req, res) => res.json(orders));

app.post('/orders', (req, res) => {
  const { customerName, items } = req.body;

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName (string) and items (non-empty array) are required' });
  }

  // Calculate total
  let total = 0;
  for (const it of items) {
    const product = products.find(p => p.id === Number(it.productId));
    const qty = Number(it.qty);
    if (!product || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Each item must have valid productId and qty > 0' });
    }
    total += product.price * qty;
  }

  const newOrder = {
    id: orders.length ? orders[orders.length - 1].id + 1 : 1,
    customerName,
    items: items.map(it => ({ productId: Number(it.productId), qty: Number(it.qty) })),
    total,
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  // Notify (mock)
  notifyNewOrder(newOrder);

  res.status(201).json(newOrder);
});

// View notification log (for evidence)
app.get('/notifications', (req, res) => {
  ensureDataDir();
  const content = fs.existsSync(NOTIF_FILE) ? fs.readFileSync(NOTIF_FILE, 'utf8') : '';
  res.type('text/plain').send(content);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
