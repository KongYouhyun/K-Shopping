// ========================================
// NEXUS - Futuristic Clothing Shop
// Firebase Integration & UI Logic
// ========================================

// Firebase Configuration (교체 필요)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db;
try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (e) {
    console.log('Firebase not configured - using demo mode');
}

// ========================================
// State Management
// ========================================
const state = {
    products: [],
    cart: [],
    user: null,
    currentCategory: 'all',
    selectedProduct: null,
    selectedSize: 'M',
    selectedQuantity: 1,
    isSignUp: false
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    // Navigation
    menuToggle: document.getElementById('menuToggle'),
    navLinks: document.getElementById('navLinks'),
    cartBtn: document.getElementById('cartBtn'),
    cartCount: document.getElementById('cartCount'),
    userBtn: document.getElementById('userBtn'),
    searchBtn: document.getElementById('searchBtn'),
    
    // Products
    productGrid: document.getElementById('productGrid'),
    loading: document.getElementById('loading'),
    
    // Categories
    categoryCards: document.querySelectorAll('.category-card'),
    
    // View Toggle
    viewBtns: document.querySelectorAll('.view-btn'),
    
    // Cart Sidebar
    cartSidebar: document.getElementById('cartSidebar'),
    closeCart: document.getElementById('closeCart'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    overlay: document.getElementById('overlay'),
    
    // Product Modal
    productModal: document.getElementById('productModal'),
    closeModal: document.getElementById('closeModal'),
    modalImage: document.getElementById('modalImage'),
    modalCategory: document.getElementById('modalCategory'),
    modalTitle: document.getElementById('modalTitle'),
    modalPrice: document.getElementById('modalPrice'),
    modalDescription: document.getElementById('modalDescription'),
    sizeBtns: document.querySelectorAll('.size-btn'),
    qtyMinus: document.getElementById('qtyMinus'),
    qtyPlus: document.getElementById('qtyPlus'),
    qtyValue: document.getElementById('qtyValue'),
    addToCartBtn: document.getElementById('addToCartBtn'),
    
    // Auth Modal
    authModal: document.getElementById('authModal'),
    closeAuth: document.getElementById('closeAuth'),
    googleSignIn: document.getElementById('googleSignIn'),
    authForm: document.getElementById('authForm'),
    authEmail: document.getElementById('authEmail'),
    authPassword: document.getElementById('authPassword'),
    authBtnText: document.getElementById('authBtnText'),
    authSwitchText: document.getElementById('authSwitchText'),
    authSwitchBtn: document.getElementById('authSwitchBtn'),
    
    // Search Modal
    searchModal: document.getElementById('searchModal'),
    closeSearch: document.getElementById('closeSearch'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    
    // Particles
    particles: document.getElementById('particles')
};

// ========================================
// Utility Functions
// ========================================
function formatPrice(price) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(price);
}

function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('active');
    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// Particles Effect
// ========================================
function createParticles() {
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        elements.particles.appendChild(particle);
    }
}

// ========================================
// Navigation
// ========================================
function initNavigation() {
    // Mobile menu toggle
    elements.menuToggle.addEventListener('click', () => {
        elements.menuToggle.classList.toggle('active');
        elements.navLinks.classList.toggle('active');
    });
    
    // Close menu on link click
    elements.navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            elements.menuToggle.classList.remove('active');
            elements.navLinks.classList.remove('active');
        });
    });
}

// ========================================
// Products
// ========================================
async function loadProducts() {
    elements.loading.classList.add('active');
    elements.productGrid.innerHTML = '';
    
    try {
        const response = await fetch('/api/products');
        state.products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('상품을 불러오는데 실패했습니다');
    } finally {
        elements.loading.classList.remove('active');
    }
}

function renderProducts() {
    const filtered = state.currentCategory === 'all'
        ? state.products
        : state.products.filter(p => p.category === state.currentCategory);
    
    elements.productGrid.innerHTML = filtered.map(product => `
        <article class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <button class="quick-add" data-id="${product.id}">QUICK ADD</button>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category.toUpperCase()}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${formatPrice(product.price)}</p>
            </div>
        </article>
    `).join('');
    
    // Add click handlers
    elements.productGrid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('quick-add')) {
                const id = card.dataset.id;
                openProductModal(id);
            }
        });
    });
    
    elements.productGrid.querySelectorAll('.quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            quickAddToCart(id);
        });
    });
}

// ========================================
// Categories
// ========================================
function initCategories() {
    elements.categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            elements.categoryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.currentCategory = card.dataset.category;
            renderProducts();
        });
    });
}

// ========================================
// View Toggle
// ========================================
function initViewToggle() {
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.view === 'list') {
                elements.productGrid.classList.add('list-view');
            } else {
                elements.productGrid.classList.remove('list-view');
            }
        });
    });
}

// ========================================
// Product Modal
// ========================================
function openProductModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    state.selectedProduct = product;
    state.selectedSize = 'M';
    state.selectedQuantity = 1;
    
    elements.modalImage.src = product.image;
    elements.modalImage.alt = product.name;
    elements.modalCategory.textContent = product.category.toUpperCase();
    elements.modalTitle.textContent = product.name;
    elements.modalPrice.textContent = formatPrice(product.price);
    elements.modalDescription.textContent = product.description || '';
    elements.qtyValue.textContent = '1';
    
    // Reset size selection
    elements.sizeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === 'M') btn.classList.add('active');
    });
    
    elements.productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    elements.productModal.classList.remove('active');
    document.body.style.overflow = '';
    state.selectedProduct = null;
}

function initProductModal() {
    elements.closeModal.addEventListener('click', closeProductModal);
    
    elements.productModal.addEventListener('click', (e) => {
        if (e.target === elements.productModal) {
            closeProductModal();
        }
    });
    
    // Size selection
    elements.sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedSize = btn.textContent;
        });
    });
    
    // Quantity controls
    elements.qtyMinus.addEventListener('click', () => {
        if (state.selectedQuantity > 1) {
            state.selectedQuantity--;
            elements.qtyValue.textContent = state.selectedQuantity;
        }
    });
    
    elements.qtyPlus.addEventListener('click', () => {
        if (state.selectedQuantity < 10) {
            state.selectedQuantity++;
            elements.qtyValue.textContent = state.selectedQuantity;
        }
    });
    
    // Add to cart
    elements.addToCartBtn.addEventListener('click', () => {
        if (state.selectedProduct) {
            addToCart(
                state.selectedProduct.id,
                state.selectedSize,
                state.selectedQuantity
            );
            closeProductModal();
        }
    });
}

// ========================================
// Cart
// ========================================
function quickAddToCart(productId) {
    addToCart(productId, 'M', 1);
}

function addToCart(productId, size, quantity) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const existingIndex = state.cart.findIndex(
        item => item.productId === productId && item.size === size
    );
    
    if (existingIndex > -1) {
        state.cart[existingIndex].quantity += quantity;
    } else {
        state.cart.push({
            productId,
            size,
            quantity,
            product
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    showToast('장바구니에 추가되었습니다');
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.productId !== productId);
    updateCartUI();
    saveCartToStorage();
}

function updateCartUI() {
    // Update cart count
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartCount.textContent = totalItems;
    
    // Update cart items
    if (state.cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="cart-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <p>장바구니가 비어있습니다</p>
            </div>
        `;
    } else {
        elements.cartItems.innerHTML = state.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.product.image}" alt="${item.product.name}">
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${item.product.name}</h4>
                    <p class="cart-item-details">Size: ${item.size} | Qty: ${item.quantity}</p>
                    <p class="cart-item-price">${formatPrice(item.product.price * item.quantity)}</p>
                    <button class="cart-item-remove" data-id="${item.productId}">Remove</button>
                </div>
            </div>
        `).join('');
        
        // Add remove handlers
        elements.cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromCart(btn.dataset.id);
            });
        });
    }
    
    // Update total
    const total = state.cart.reduce(
        (sum, item) => sum + (item.product.price * item.quantity), 0
    );
    elements.cartTotal.textContent = formatPrice(total);
}

function openCart() {
    elements.cartSidebar.classList.add('active');
    elements.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    elements.cartSidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function saveCartToStorage() {
    localStorage.setItem('nexus_cart', JSON.stringify(state.cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('nexus_cart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
            updateCartUI();
        } catch (e) {
            console.error('Error loading cart:', e);
        }
    }
}

function initCart() {
    elements.cartBtn.addEventListener('click', openCart);
    elements.closeCart.addEventListener('click', closeCart);
    elements.overlay.addEventListener('click', closeCart);
    
    elements.checkoutBtn.addEventListener('click', () => {
        if (state.cart.length === 0) {
            showToast('장바구니가 비어있습니다');
            return;
        }
        
        if (!state.user) {
            closeCart();
            openAuthModal();
            showToast('결제를 위해 로그인해주세요');
            return;
        }
        
        // Proceed to checkout
        showToast('결제 페이지로 이동합니다');
    });
    
    loadCartFromStorage();
}

// ========================================
// Authentication
// ========================================
function openAuthModal() {
    elements.authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    elements.authModal.classList.remove('active');
    document.body.style.overflow = '';
    elements.authForm.reset();
}

function toggleAuthMode() {
    state.isSignUp = !state.isSignUp;
    elements.authBtnText.textContent = state.isSignUp ? 'SIGN UP' : 'SIGN IN';
    elements.authSwitchText.textContent = state.isSignUp 
        ? 'Already have an account?' 
        : "Don't have an account?";
    elements.authSwitchBtn.textContent = state.isSignUp ? 'Sign In' : 'Sign Up';
}

async function handleEmailAuth(e) {
    e.preventDefault();
    
    const email = elements.authEmail.value;
    const password = elements.authPassword.value;
    
    if (!auth) {
        showToast('Firebase가 설정되지 않았습니다');
        return;
    }
    
    try {
        if (state.isSignUp) {
            await auth.createUserWithEmailAndPassword(email, password);
            showToast('회원가입이 완료되었습니다');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('로그인되었습니다');
        }
        closeAuthModal();
    } catch (error) {
        showToast(error.message);
    }
}

async function handleGoogleAuth() {
    if (!auth) {
        showToast('Firebase가 설정되지 않았습니다');
        return;
    }
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        showToast('로그인되었습니다');
        closeAuthModal();
    } catch (error) {
        showToast(error.message);
    }
}

function handleAuthStateChange(user) {
    state.user = user;
    
    if (user) {
        elements.userBtn.style.color = 'var(--accent-cyan)';
    } else {
        elements.userBtn.style.color = '';
    }
}

function initAuth() {
    elements.userBtn.addEventListener('click', () => {
        if (state.user) {
            // Show user menu or sign out
            if (auth) auth.signOut();
            showToast('로그아웃되었습니다');
        } else {
            openAuthModal();
        }
    });
    
    elements.closeAuth.addEventListener('click', closeAuthModal);
    
    elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            closeAuthModal();
        }
    });
    
    elements.authSwitchBtn.addEventListener('click', toggleAuthMode);
    elements.authForm.addEventListener('submit', handleEmailAuth);
    elements.googleSignIn.addEventListener('click', handleGoogleAuth);
    
    // Listen for auth state changes
    if (auth) {
        auth.onAuthStateChanged(handleAuthStateChange);
    }
}

// ========================================
// Search
// ========================================
function openSearch() {
    elements.searchModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    elements.searchInput.focus();
}

function closeSearch() {
    elements.searchModal.classList.remove('active');
    document.body.style.overflow = '';
    elements.searchInput.value = '';
    elements.searchResults.innerHTML = '';
}

function searchProducts(query) {
    if (!query.trim()) {
        elements.searchResults.innerHTML = '';
        return;
    }
    
    const results = state.products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">
                검색 결과가 없습니다
            </p>
        `;
        return;
    }
    
    elements.searchResults.innerHTML = results.map(product => `
        <div class="search-result-item" data-id="${product.id}">
            <div class="search-result-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="search-result-info">
                <h4 class="search-result-name">${product.name}</h4>
                <p class="search-result-price">${formatPrice(product.price)}</p>
            </div>
        </div>
    `).join('');
    
    elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            closeSearch();
            openProductModal(item.dataset.id);
        });
    });
}

function initSearch() {
    elements.searchBtn.addEventListener('click', openSearch);
    elements.closeSearch.addEventListener('click', closeSearch);
    
    elements.searchModal.addEventListener('click', (e) => {
        if (e.target === elements.searchModal) {
            closeSearch();
        }
    });
    
    elements.searchInput.addEventListener('input', debounce((e) => {
        searchProducts(e.target.value);
    }, 300));
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSearch();
            closeProductModal();
            closeCart();
            closeAuthModal();
        }
    });
}

// ========================================
// Initialize App
// ========================================
function init() {
    createParticles();
    initNavigation();
    initCategories();
    initViewToggle();
    initProductModal();
    initCart();
    initAuth();
    initSearch();
    loadProducts();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
