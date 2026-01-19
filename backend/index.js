const express = require('express');
const app = express();

app.use(express.json());

// Temporary in-memory "database"
let products = [
  { id: 1, name: 'Tomato', price: 5000 },
  { id: 2, name: 'Potato', price: 3000 }
];

// Price change history log
let priceHistory = []; 
// example entry: { productId, productName, oldPrice, newPrice, changedAt }

app.get('/', (req, res) => {
  res.send('Smart Farm API is running');
});

// GET all products
app.get('/products', (req, res) => {
  res.json(products);
});

// POST new product
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

// PUT update product (tracks price changes)
app.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, price } = req.body;

  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // track price change (only if price is a number and actually changed)
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

// NEW: view price change history
app.get('/price-history', (req, res) => {
  res.json(priceHistory);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
