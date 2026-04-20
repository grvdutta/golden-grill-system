/**
 * Golden Grill — Backend API Server
 * Express server with CORS, serving menu and order endpoints.
 * Data is stored in JSON files for simplicity.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors());                         // Enable CORS for all origins
app.use(express.json());                 // Parse incoming JSON request bodies

// Serve frontend static files
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// Serve admin static files
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// --- Helper: Read a JSON file ---
function readJSON(filename) {
  const filePath = path.join(__dirname, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// --- Helper: Write to a JSON file ---
function writeJSON(filename, data) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ==========================================
//  API ROUTES
// ==========================================

/**
 * GET /menu
 * Returns the full menu from menu.json
 */
app.get('/menu', (req, res) => {
  try {
    const menu = readJSON('menu.json');
    res.json(menu);
  } catch (error) {
    console.error('Error reading menu:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

/**
 * POST /menu
 * Adds a new item to the menu
 * Body: { name, description, price, category, image }
 */
app.post('/menu', (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;

    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const menu = readJSON('menu.json');

    // Generate a new ID (max existing ID + 1)
    const newId = menu.length > 0 ? Math.max(...menu.map(item => item.id)) + 1 : 1;

    const newItem = {
      id: newId,
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      image: image || '🍽️'
    };

    menu.push(newItem);
    writeJSON('menu.json', menu);

    res.status(201).json({ message: 'Menu item added successfully', item: newItem });
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

/**
 * PUT /menu/:id
 * Updates an existing menu item by ID
 */
app.put('/menu/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { name, description, price, category, image } = req.body;

    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    let menu = readJSON('menu.json');
    const index = menu.findIndex(item => item.id === itemId);

    if (index === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update the item while keeping its original ID
    menu[index] = {
      id: itemId,
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      image: image || '🍽️'
    };

    writeJSON('menu.json', menu);

    res.json({ message: 'Menu item updated successfully', item: menu[index] });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

/**
 * DELETE /menu/:id
 * Deletes a menu item by ID
 */
app.delete('/menu/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    let menu = readJSON('menu.json');

    const index = menu.findIndex(item => item.id === itemId);
    if (index === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    menu.splice(index, 1);
    writeJSON('menu.json', menu);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

/**
 * POST /order
 * Creates a new order and saves it to orders.json
 * Body: { customerName, items, totalPrice }
 */
app.post('/order', (req, res) => {
  try {
    const { customerName, tableNumber, items, totalPrice } = req.body;

    // Validate required fields
    if (!customerName || !tableNumber || !items || items.length === 0 || !totalPrice) {
      return res.status(400).json({ error: 'Customer name, table number, items, and total price are required' });
    }

    const orders = readJSON('orders.json');

    // Build the new order object
    const newOrder = {
      id: Date.now(),
      customerName,
      tableNumber,
      items,          // Array of { name, price, quantity }
      totalPrice: parseFloat(totalPrice),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    orders.push(newOrder);
    writeJSON('orders.json', orders);

    res.status(201).json({ message: 'Order placed successfully!', order: newOrder });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

/**
 * GET /orders
 * Returns all orders from orders.json
 */
app.get('/orders', (req, res) => {
  try {
    const orders = readJSON('orders.json');
    res.json(orders);
  } catch (error) {
    console.error('Error reading orders:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

/**
 * PUT /orders/:id
 * Updates an order's status by ID
 * Body: { status }
 */
app.put('/orders/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    let orders = readJSON('orders.json');
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    orders[orderIndex].status = status.toLowerCase();
    writeJSON('orders.json', orders);

    res.json({ message: `Order status updated to ${status.toLowerCase()}`, order: orders[orderIndex] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * DELETE /orders/:id
 * Deletes an order by ID
 */
app.delete('/orders/:id', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    let orders = readJSON('orders.json');

    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    orders.splice(orderIndex, 1);
    writeJSON('orders.json', orders);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

/**
 * POST /login
 * Basic admin authentication (MVP)
 * Body: { username, password }
 */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simple hardcoded check
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// ==========================================
//  START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`\n🔥 Golden Grill server is running at http://localhost:${PORT}`);
  console.log(`🍔 Customer site:  http://localhost:${PORT}/`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin/dashboard.html\n`);
});
