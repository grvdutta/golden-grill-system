/**
 * Golden Grill — Admin Dashboard JavaScript
 * Handles: Orders display, Menu management (CRUD), Stats, Revenue Tracking
 */

const API_BASE = 'http://localhost:3000';

// ==========================================
//  AUTHENTICATION CHECK
if (localStorage.getItem('isAdminLoggedIn') !== 'true') {
  window.location.href = 'login.html';
}

function logout() {
  localStorage.removeItem('isAdminLoggedIn');
  window.location.href = 'login.html';
}

// ==========================================
//  UTILITY & DATA HANDLING
// ==========================================

function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

/** Consistently convert timestamp to local date string for grouping/display */
function getLocalDate(isoString) {
  return new Date(isoString).toLocaleDateString();
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, icon = '✅') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast__icon">${icon}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--exit');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/** Normalize status to lowercase for consistent logic */
function normalizeStatus(status) {
  return status ? status.toLowerCase() : 'pending';
}

// ==========================================
//  REVENUE & GROUPING LOGIC
// ==========================================

function groupOrdersByDate(orders) {
  const groups = {};
  
  orders.forEach(order => {
    const date = getLocalDate(order.timestamp);
    if (!groups[date]) {
      groups[date] = { revenue: 0, count: 0 };
    }
    groups[date].count += 1;
    if (normalizeStatus(order.status) === 'completed') {
      groups[date].revenue += parseFloat(order.totalPrice);
    }
  });
  
  return groups;
}

function renderDailySummary(orders) {
  const container = document.getElementById('daily-summary');
  if (!container) return;

  const grouped = groupOrdersByDate(orders);
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  if (sortedDates.length === 0) {
    container.innerHTML = '<div class="panel__empty">No historical data</div>';
    return;
  }

  container.innerHTML = sortedDates.map(date => `
    <div class="summary-row">
      <div class="summary-row__date">${date}</div>
      <div class="summary-row__revenue">${formatPrice(grouped[date].revenue)}</div>
      <div class="summary-row__count">${grouped[date].count} orders</div>
    </div>
  `).join('');
}

// ==========================================
//  STATS BAR
// ==========================================

function renderStats(orders, menuItems) {
  const statsBar = document.getElementById('stats-bar');
  const todayRevenueEl = document.getElementById('stat-revenue-today');
  if (!statsBar) return;

  const totalRevenue = orders.reduce((sum, o) => {
    return normalizeStatus(o.status) === 'completed' ? sum + parseFloat(o.totalPrice) : sum;
  }, 0);
  
  const pendingOrders = orders.filter(o => normalizeStatus(o.status) === 'pending').length;
  
  // Calculate Today's Revenue
  const today = getLocalDate(new Date().toISOString());
  const grouped = groupOrdersByDate(orders);
  const todayRevenue = grouped[today] ? grouped[today].revenue : 0;

  if (todayRevenueEl) {
    todayRevenueEl.textContent = formatPrice(todayRevenue);
  }

  statsBar.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__value">${orders.length}</div>
      <div class="stat-card__label">Total Orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__value">${pendingOrders}</div>
      <div class="stat-card__label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__value">${formatPrice(totalRevenue)}</div>
      <div class="stat-card__label">Total Revenue</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__value">${menuItems.length}</div>
      <div class="stat-card__label">Menu Items</div>
    </div>
  `;
}

// ==========================================
//  ORDERS
// ==========================================

async function loadOrders() {
  const ordersList = document.getElementById('orders-list');
  const dateFilter = document.getElementById('order-date-filter').value;

  try {
    const response = await fetch(`${API_BASE}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    let orders = await response.json();

    // Map and Normalize early
    orders = orders.map(o => ({ ...o, status: normalizeStatus(o.status) }));

    // Global refresh metrics (stats and summary) should use ALL data
    // We'll return the full list and filter only for display
    const allOrders = [...orders];

    // Filter by date if selected
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toLocaleDateString();
      orders = orders.filter(o => getLocalDate(o.timestamp) === filterDate);
    }

    if (orders.length === 0) {
      ordersList.innerHTML = `
        <div class="panel__empty">
          <div class="panel__empty-icon">📭</div>
          <p>${dateFilter ? 'No orders found for this date.' : 'No orders yet.'}</p>
        </div>
      `;
      return allOrders;
    }

    // Sort by newest first
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    ordersList.innerHTML = orders.map((order, i) => {
      const isPending = order.status === 'pending';
      
      return `
      <div class="order-card" style="animation-delay: ${i * 0.05}s">
        <div class="order-card__top">
          <span class="order-card__id">Order #${order.id}</span>
          <span class="order-card__time">${formatTime(order.timestamp)}</span>
        </div>
        <div class="order-card__customer">
          <span class="order-card__customer-name">👤 ${order.customerName}</span>
          <span class="order-card__table-badge">Table ${order.tableNumber}</span>
        </div>
        <div class="order-card__items">
          ${order.items.map(item => `
            <span>${item.quantity}× ${item.name} — ${formatPrice(item.price * item.quantity)}</span>
          `).join('')}
        </div>
        <div class="order-card__bottom">
          <span class="order-card__total">${formatPrice(order.totalPrice)}</span>
          <div class="order-card__actions">
            ${isPending 
              ? `<button class="btn btn--small btn--primary" onclick="updateOrderStatus(${order.id}, 'completed')" style="background: var(--success); border-color: var(--success);">✅ Complete</button>`
              : `<span class="order-card__status order-card__status--completed">${order.status}</span>`
            }
            <button class="btn btn--small btn--outline" onclick="deleteOrder(${order.id})" title="Delete/Dismiss Order">🗑️</button>
          </div>
        </div>
      </div>
    `; }).join('');

    return allOrders;

  } catch (error) {
    console.error('Error loading orders:', error);
    ordersList.innerHTML = `
      <div class="panel__empty">
        <div class="panel__empty-icon">⚠️</div>
        <p>Couldn't load orders. Is the server running?</p>
      </div>
    `;
    return [];
  }
}

// ==========================================
//  ORDER ACTIONS (UPDATE/DELETE)
// ==========================================

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update status');

    showToast(`Order marked as ${status}!`, '🎉');
    // Refresh only after confirmed update
    await refreshAll();
  } catch (error) {
    console.error('Error updating order:', error);
    showToast('Failed to update order', '❌');
  }
}

async function deleteOrder(orderId) {
  if (!confirm(`Delete order? This cannot be undone.`)) return;

  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete order');

    showToast(`Order deleted`, '🗑️');
    await refreshAll();
  } catch (error) {
    console.error('Error deleting order:', error);
    showToast('Failed to delete order', '❌');
  }
}

// ==========================================
//  MENU ITEMS
// ==========================================

async function loadMenuItems() {
  const menuList = document.getElementById('menu-list');

  try {
    const response = await fetch(`${API_BASE}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    const menuItems = await response.json();

    if (menuItems.length === 0) {
      menuList.innerHTML = `
        <div class="panel__empty">
          <div class="panel__empty-icon">🍽️</div>
          <p>No menu items. Add some above!</p>
        </div>
      `;
      return menuItems;
    }

    menuList.innerHTML = menuItems.map((item, i) => `
      <div class="menu-row" style="animation-delay: ${i * 0.03}s">
        <span class="menu-row__emoji">${item.image}</span>
        <div class="menu-row__info">
          <div class="menu-row__name">${item.name}</div>
          <div class="menu-row__meta">${item.category}${item.description ? ' · ' + item.description.substring(0, 40) + '...' : ''}</div>
        </div>
        <span class="menu-row__price">${formatPrice(item.price)}</span>
        <button class="menu-row__delete" onclick="deleteMenuItem(${item.id})" title="Delete item" aria-label="Delete ${item.name}">
          🗑️
        </button>
      </div>
    `).join('');

    return menuItems;

  } catch (error) {
    console.error('Error loading menu:', error);
    menuList.innerHTML = `
      <div class="panel__empty">
        <div class="panel__empty-icon">⚠️</div>
        <p>Couldn't load menu. Is the server running?</p>
      </div>
    `;
    return [];
  }
}

// ==========================================
//  ADD MENU ITEM
// ==========================================

async function addMenuItem() {
  const name = document.getElementById('item-name').value.trim();
  const price = document.getElementById('item-price').value;
  const category = document.getElementById('item-category').value;
  const image = document.getElementById('item-image').value.trim() || '🍽️';
  const description = document.getElementById('item-desc').value.trim();

  if (!name) {
    showToast('Please enter an item name', '⚠️');
    document.getElementById('item-name').focus();
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    showToast('Please enter a valid price', '⚠️');
    document.getElementById('item-price').focus();
    return;
  }

  const saveBtn = document.getElementById('save-item-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`${API_BASE}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price: parseFloat(price), category, image, description })
    });

    if (!response.ok) throw new Error('Failed to add item');

    const result = await response.json();
    showToast(`${result.item.name} added to menu!`, '🎉');

    clearAddForm();
    document.getElementById('add-item-form').style.display = 'none';
    await refreshAll();

  } catch (error) {
    console.error('Error adding item:', error);
    showToast('Failed to add item', '❌');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Item';
  }
}

function clearAddForm() {
  document.getElementById('item-name').value = '';
  document.getElementById('item-price').value = '';
  document.getElementById('item-image').value = '';
  document.getElementById('item-desc').value = '';
}

async function deleteMenuItem(itemId) {
  if (!confirm('Delete this menu item?')) return;

  try {
    const response = await fetch(`${API_BASE}/menu/${itemId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete item');

    showToast('Menu item deleted', '🗑️');
    await refreshAll();

  } catch (error) {
    console.error('Error deleting item:', error);
    showToast('Failed to delete item', '❌');
  }
}

// ==========================================
//  REFRESH ALL DATA
// ==========================================

async function refreshAll() {
  const [orders, menuItems] = await Promise.all([
    loadOrders(),
    loadMenuItems()
  ]);
  renderStats(orders || [], menuItems || []);
  renderDailySummary(orders || []);
}

// ==========================================
//  INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  refreshAll();

  // Date filter listener
  const dateFilter = document.getElementById('order-date-filter');
  if (dateFilter) {
    dateFilter.addEventListener('change', () => {
      loadOrders(); // Just refresh the list part
    });
  }

  // Toggle add-item form
  const toggleBtn = document.getElementById('toggle-add-form-btn');
  const addForm = document.getElementById('add-item-form');
  const cancelBtn = document.getElementById('cancel-add-btn');
  const saveBtn = document.getElementById('save-item-btn');

  if (toggleBtn && addForm) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = addForm.style.display === 'none';
      addForm.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? '✕ Close' : '+ Add Item';
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      addForm.style.display = 'none';
      toggleBtn.textContent = '+ Add Item';
      clearAddForm();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', addMenuItem);
  }

  const refreshBtn = document.getElementById('refresh-orders-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.textContent = '↻ Loading...';
      refreshAll().then(() => {
        refreshBtn.textContent = '↻ Refresh';
        showToast('Data refreshed!', '🔄');
      });
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  setInterval(refreshAll, 30000);
});
