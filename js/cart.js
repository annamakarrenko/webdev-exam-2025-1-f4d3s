import {
    showNotification,
    fetchProduct,
    createOrder,
    getCart,
    removeFromCart,
    clearCart,
    updateCartCounter
} from './api.js';

let cartItems = [];
let goodsTotal = 0;
let deliveryCost = 0;

document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    
    await loadCartItems();
    
    initEventListeners();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deliveryDate = document.getElementById('delivery_date');
    if (deliveryDate) {
        deliveryDate.min = tomorrow.toISOString().split('T')[0];
        deliveryDate.value = tomorrow.toISOString().split('T')[0];
    }
});

async function loadCartItems() {
    const cartContainer = document.getElementById('cart-items-container');
    const cart = getCart();
    
    if (!cartContainer) return;
    
    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <p>Корзина пуста. Перейдите в каталог, чтобы добавить товары.</p>
                <a href="index.html" class="btn btn-primary">В каталог</a>
            </div>
        `;
        updateTotalPrices();
        return;
    }
    
    cartContainer.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    
    cartItems = [];
    for (const productId of cart) {
        const product = await fetchProduct(productId);
        if (product) {
            cartItems.push(product);
        }
    }

    renderCartItems();
    updateTotalPrices();
}

function renderCartItems() {
    const cartContainer = document.getElementById('cart-items-container');
    
    if (!cartContainer || cartItems.length === 0) return;
    
    cartContainer.innerHTML = '';
    
    cartItems.forEach(product => {
        const cartItem = createCartItem(product);
        cartContainer.appendChild(cartItem);
    });
}

function createCartItem(product) {
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.dataset.id = product.id;
    
    const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
    const price = hasDiscount ? product.discount_price : product.actual_price;
    
    item.innerHTML = `
        <div class="cart-item-content">
            <div class="cart-item-image">
                <img src="${product.image_url || 'images/placeholder.jpg'}" 
                     alt="${product.name}"
                     onerror="this.src='images/placeholder.jpg'">
            </div>
            <div class="cart-item-info">
                <h3 class="cart-item-name">${product.name}</h3>
                <div class="cart-item-rating">
                    <span class="stars">${generateStars(product.rating || 0)}</span>
                    <span class="rating-value">${(product.rating || 0).toFixed(1)}</span>
                </div>
                <div class="cart-item-price">
                    ${hasDiscount ? `
                        <span class="old-price">${product.actual_price} ₽</span>
                        <span class="current-price">${product.discount_price} ₽</span>
                        <span class="discount">
                            -${Math.round((1 - product.discount_price / product.actual_price) * 100)}%
                        </span>
                    ` : `
                        <span class="current-price">${product.actual_price} ₽</span>
                    `}
                </div>
            </div>
            <button class="btn-remove-from-cart" data-id="${product.id}">
                <i class="fas fa-trash"></i> Удалить
            </button>
        </div>
    `;
    
    const removeBtn = item.querySelector('.btn-remove-from-cart');
    removeBtn.addEventListener('click', async function() {
        const productId = this.dataset.id;
        removeFromCart(productId);
        
        cartItems = cartItems.filter(item => item.id != productId);
        renderCartItems();
        updateTotalPrices();
    });
    
    return item;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.3 && rating % 1 < 0.8;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function updateTotalPrices() {
    goodsTotal = cartItems.reduce((total, product) => {
        const price = product.discount_price && product.discount_price < product.actual_price 
            ? product.discount_price 
            : product.actual_price;
        return total + price;
    }, 0);
    
    calculateDeliveryCost();
    
    document.getElementById('goods-total').textContent = `${goodsTotal} ₽`;
    document.getElementById('delivery-cost').textContent = `${deliveryCost} ₽`;
    document.getElementById('total-cost').textContent = `${goodsTotal + deliveryCost} ₽`;
}


function calculateDeliveryCost() {
    const deliveryDateInput = document.getElementById('delivery_date');
    const deliveryIntervalSelect = document.getElementById('delivery_interval');
    
    if (!deliveryDateInput || !deliveryIntervalSelect) {
        deliveryCost = 200; 
        return;
    }
    
    const deliveryDate = new Date(deliveryDateInput.value);
    const dayOfWeek = deliveryDate.getDay();
    const interval = deliveryIntervalSelect.value;
    
    let cost = 200;
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        cost += 300;
    }
    
    if (interval === '18:00-22:00' && dayOfWeek >= 1 && dayOfWeek <= 5) {
        cost += 200;
    }
    
    deliveryCost = cost;
}

function initEventListeners() {
    const deliveryDate = document.getElementById('delivery_date');
    const deliveryInterval = document.getElementById('delivery_interval');
    
    if (deliveryDate) {
        deliveryDate.addEventListener('change', updateTotalPrices);
    }
    
    if (deliveryInterval) {
        deliveryInterval.addEventListener('change', updateTotalPrices);
    }
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите сбросить все данные формы?')) {
                document.getElementById('order-form').reset();
                updateTotalPrices();
            }
        });
    }
    
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
}

async function submitOrder(event) {
    event.preventDefault();
    
    if (cartItems.length === 0) {
        showNotification('Добавьте товары в корзину перед оформлением заказа', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const orderData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        subscribe: formData.get('subscribe') ? 1 : 0,
        delivery_address: formData.get('delivery_address'),
        delivery_date: formData.get('delivery_date'),
        delivery_interval: formData.get('delivery_interval'),
        comment: formData.get('comment'),
        good_ids: cartItems.map(item => item.id)
    };
    
    if (orderData.delivery_date) {
        const date = new Date(orderData.delivery_date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        orderData.delivery_date = `${day}.${month}.${year}`;
    }
    
    try {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        
        const result = await createOrder(orderData);
        
        showNotification('Заказ успешно оформлен!', 'success');
        clearCart();
        updateCartCounter();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification(`Ошибка: ${error.message}`, 'error');
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Оформить заказ';
    }
}