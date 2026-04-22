/**
 * Golden Grill — Frontend JavaScript
 * Handles: Navbar, Menu loading, Cart (localStorage), Order placement
 * 
 * All data is stored in localStorage under the key "goldenGrillCart"
 * Cart format: [{ id, name, price, image, quantity }]
 */

const API_BASE = 'https://golden-grill-system.onrender.com';

// ==========================================
//  UTILITY FUNCTIONS
// ==========================================

/** Get cart from localStorage */
function getCart() {
  const cart = localStorage.getItem('goldenGrillCart');
  return cart ? JSON.parse(cart) : [];
}

/** Save cart to localStorage */
function saveCart(cart) {
  localStorage.setItem('goldenGrillCart', JSON.stringify(cart));
  updateCartBadge();
}

/** Update the cart badge count on every page */
function updateCartBadge() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = totalItems;
    // Pulse animation on change
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 300);
  }
}

/** Show a toast notification */
function showToast(message, icon = '✅') {
  // Remove any existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast__icon">${icon}</span> ${message}`;
  document.body.appendChild(toast);

  // Auto-dismiss after 2.5 seconds
  setTimeout(() => {
    toast.classList.add('toast--exit');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/** Format price to $X.XX */
function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

// ==========================================
//  NAVBAR
// ==========================================

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  // Scroll effect — add 'scrolled' class
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Mobile hamburger toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });

    // Close menu when a link is clicked
    links.querySelectorAll('.navbar__link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }
}

// ==========================================
//  MENU PAGE
// ==========================================

/** Fetch menu from API and render cards */
async function initMenuPage() {
  const menuGrid = document.getElementById('menu-grid');
  const filterBar = document.getElementById('filter-bar');

  if (!menuGrid) return; // Not on menu page

  try {
    const response = await fetch(`${API_BASE}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    const menuItems = await response.json();

    // Clear skeleton loaders
    menuGrid.innerHTML = '';

    // Render all items
    renderMenuItems(menuItems, menuGrid);

    // Set up filter chips
    if (filterBar) {
      filterBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        // Update active state
        filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const category = chip.dataset.category;
        const filtered = category === 'All'
          ? menuItems
          : menuItems.filter(item => item.category === category);

        menuGrid.innerHTML = '';
        renderMenuItems(filtered, menuGrid);
      });
    }

    // Handle hash-based category navigation (from homepage links)
    if (window.location.hash) {
      const category = window.location.hash.replace('#', '');
      const chip = filterBar?.querySelector(`[data-category="${category}"]`);
      if (chip) chip.click();
    }

  } catch (error) {
    console.error('Error loading menu:', error);
    menuGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <p style="font-size: 1.2rem; color: var(--text-muted);">
          😔 Couldn't load the menu. Make sure the server is running!
        </p>
        <button class="btn btn--outline" style="margin-top: 20px;" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `;
  }
}

/** Render menu item cards into a container */
function renderMenuItems(items, container) {
  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <span class="menu-item-card__emoji">${item.image}</span>
      <h3 class="menu-item-card__name">${item.name}</h3>
      <p class="menu-item-card__desc">${item.description}</p>
      <div class="menu-item-card__footer">
        <span class="menu-item-card__price">${formatPrice(item.price)}</span>
        <button class="menu-item-card__add-btn" data-id="${item.id}">
          + Add to Cart
        </button>
      </div>
    `;

    // Add to cart click handler
    const addBtn = card.querySelector('.menu-item-card__add-btn');
    addBtn.addEventListener('click', () => {
      addToCart(item);

      // Visual feedback
      addBtn.textContent = '✓ Added!';
      addBtn.classList.add('added');
      setTimeout(() => {
        addBtn.textContent = '+ Add to Cart';
        addBtn.classList.remove('added');
      }, 1200);
    });

    container.appendChild(card);
  });
}

// ==========================================
//  CART MANAGEMENT
// ==========================================

/** Add an item to the cart */
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(cartItem => cartItem.id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1
    });
  }

  saveCart(cart);
  showToast(`${item.name} added to cart!`, '🛒');
}

/** Update item quantity in cart */
function updateQuantity(itemId, change) {
  const cart = getCart();
  const item = cart.find(i => i.id === itemId);

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    // Remove item from cart
    const index = cart.indexOf(item);
    cart.splice(index, 1);
  }

  saveCart(cart);
  renderCartPage(); // Re-render
}

/** Remove item from cart entirely */
function removeFromCart(itemId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== itemId);
  saveCart(cart);
  renderCartPage();
  showToast('Item removed', '🗑️');
}

// ==========================================
//  CART PAGE RENDERING
// ==========================================

function renderCartPage() {
  const cartContent = document.getElementById('cart-content');
  if (!cartContent) return; // Not on cart page

  const cart = getCart();

  if (cart.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p class="cart-empty__text">Your cart is empty</p>
        <a href="menu.html" class="btn btn--primary">Browse Menu 🍽️</a>
      </div>
    `;
    return;
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  cartContent.innerHTML = `
    <!-- Cart Items List -->
    <div class="cart-items">
      ${cart.map(item => `
        <div class="cart-item">
          <span class="cart-item__emoji">${item.image}</span>
          <div class="cart-item__info">
            <div class="cart-item__name">${item.name}</div>
            <div class="cart-item__price">${formatPrice(item.price)} each</div>
          </div>
          <div class="cart-item__qty">
            <button onclick="updateQuantity(${item.id}, -1)" aria-label="Decrease quantity">−</button>
            <span class="cart-item__qty-value">${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, 1)" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-item__total">${formatPrice(item.price * item.quantity)}</span>
          <button class="cart-item__remove" onclick="removeFromCart(${item.id})" aria-label="Remove item">✕</button>
        </div>
      `).join('')}
    </div>

    <!-- Cart Summary -->
    <div class="cart-summary">
      <div class="cart-summary__row">
        <span>Subtotal</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      <div class="cart-summary__row">
        <span>Tax (8%)</span>
        <span>${formatPrice(tax)}</span>
      </div>
      <div class="cart-summary__row cart-summary__row--total">
        <span>Total</span>
        <span>${formatPrice(total)}</span>
      </div>

      <!-- Order Form -->
      <div class="order-form">
        <div class="order-form__row">
          <div class="order-form__group">
            <label class="order-form__label" for="customer-name">Your Name</label>
            <input 
              type="text" 
              id="customer-name" 
              class="order-form__input" 
              placeholder="Enter your name"
              autocomplete="name"
            >
          </div>
          <div class="order-form__group">
            <label class="order-form__label" for="table-number">Table No.</label>
            <input 
              type="number" 
              id="table-number" 
              class="order-form__input" 
              placeholder="00"
              min="1"
              max="50"
            >
          </div>
        </div>
        <button class="btn btn--primary" id="place-order-btn" style="width: 100%; justify-content: center; font-size: 1.05rem; padding: 16px;">
          🔥 Place Order — ${formatPrice(total)}
        </button>
      </div>
    </div>
  `;

  // Attach order handler
  const placeOrderBtn = document.getElementById('place-order-btn');
  placeOrderBtn.addEventListener('click', placeOrder);
}

// ==========================================
//  PLACE ORDER
// ==========================================

async function placeOrder() {
  const nameInput = document.getElementById('customer-name');
  const tableInput = document.getElementById('table-number');

  const customerName = nameInput?.value.trim();
  const tableNumber = tableInput?.value.trim();

  let hasError = false;

  if (!customerName) {
    nameInput.classList.add('input-error');
    hasError = true;
  }

  if (!tableNumber) {
    tableInput.classList.add('input-error');
    hasError = true;
  }

  if (hasError) {
    showToast('Please fill in your name and table number!', '⚠️');
    setTimeout(() => {
      nameInput.classList.remove('input-error');
      tableInput.classList.remove('input-error');
    }, 2000);
    return;
  }

  const cart = getCart();
  if (cart.length === 0) return;

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = totalPrice * 0.08;

  const orderData = {
    customerName,
    tableNumber,
    items: cart.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })),
    totalPrice: (totalPrice + tax).toFixed(2)
  };

  // Disable button during request
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Placing order...';

  try {
    const response = await fetch(`${API_BASE}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) throw new Error('Order failed');

    const result = await response.json();

    // Clear the cart
    localStorage.removeItem('goldenGrillCart');
    updateCartBadge();

    // Show success overlay
    showOrderSuccess(result.order);

  } catch (error) {
    console.error('Order error:', error);
    showToast('Order failed. Is the server running?', '❌');
    btn.disabled = false;
    btn.textContent = '🔥 Place Order';
  }
}

/** Show the success overlay after order is placed */
function showOrderSuccess(order) {
  const overlay = document.createElement('div');
  overlay.className = 'order-success';
  overlay.innerHTML = `
    <div class="order-success__card">
      <div class="order-success__icon">🎉</div>
      <h2 class="order-success__title">Order Placed!</h2>
      <p class="order-success__text">
        Thanks, <strong>${order.customerName}</strong>! Your order #${order.id} for <strong>Table ${order.tableNumber}</strong> is being prepared.<br>
        Total: <strong style="color: var(--gold);">${formatPrice(order.totalPrice)}</strong>
      </p>
      <a href="index.html" class="btn btn--primary">Back to Home 🏠</a>
    </div>
  `;

  // Click outside to dismiss
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      renderCartPage();
    }
  });

  document.body.appendChild(overlay);
}

// ==========================================
//  HOMEPAGE — ANIMATIONS
// ==========================================

function initHomepageAnimations() {
  // Only run on homepage (has .hero element)
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Intersection Observer for scroll-triggered animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Observe category cards and feature items
  document.querySelectorAll('.category-card, .feature-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
  });
}

// Inject dynamic helper styles
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    .pulse {
      animation: badge-pulse 0.3s ease-out;
    }
    @keyframes badge-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
})();

// ==========================================
//  INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateCartBadge();
  initMenuPage();
  renderCartPage();
  initHomepageAnimations();
});
