import {
    showNotification,
    createOrder,
    getCart,
    removeFromCart,
    clearCart,
    updateCartCounter,
    calculateDeliveryCost
} from './api.js';

import { phonesData } from './phones.js';

let cartItems = [];
let goodsTotal = 0;

document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    await loadCartItems();
    setupEventListeners();
    setMinDeliveryDate();
});

function getProductData(productId) {
    const storedProduct = localStorage.getItem(`shopzone_product_${productId}`);
    if (storedProduct) {
        return JSON.parse(storedProduct);
    }
    
    const phone = phonesData.find(p => p.id == productId);
    if (phone) {
        return {
            id: phone.id,
            name: phone.name,
            image_url: phone.image_url,
            rating: phone.rating,
            actual_price: phone.actual_price,
            discount_price: phone.discount_price
        };
    }
    
    return null;
}

async function loadCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartContainer = document.getElementById('empty-cart');
    const cart = getCart();
    
    if (!cartItemsContainer || !emptyCartContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.style.display = 'none';
        emptyCartContainer.style.display = 'block';
        updateTotalPrices();
        return;
    }
    
    cartItemsContainer.style.display = 'block';
    emptyCartContainer.style.display = 'none';
    cartItemsContainer.innerHTML = '<div class="loading">Загрузка корзины...</div>';
    
    cartItems = [];
    for (const productId of cart) {
        const product = getProductData(productId);
        if (product) {
            cartItems.push(product);
        }
    }
    
    renderCartItems();
    updateTotalPrices();
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer || cartItems.length === 0) return;
    
    cartItemsContainer.innerHTML = '';
    
    cartItems.forEach(product => {
        const cartItem = createCartItem(product);
        cartItemsContainer.appendChild(cartItem);
    });
}

function createCartItem(product) {
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.dataset.id = product.id;
    
    const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
    const price = hasDiscount ? product.discount_price : product.actual_price;
    const discountPercent = hasDiscount ? 
        Math.round((1 - product.discount_price / product.actual_price) * 100) : 0;
    
    item.innerHTML = `
        <div class="cart-item-image">
            <img src="${product.image_url || 'images/placeholder.jpg'}" 
                 alt="${product.name}"
                 onerror="this.src='images/placeholder.jpg'">
        </div>
        <div class="cart-item-info">
            <h3 class="cart-item-name">${product.name}</h3>
            <div class="product-rating">
                <span class="stars">${generateStars(product.rating || 0)}</span>
                <span class="rating-value">${(product.rating || 0).toFixed(1)}</span>
            </div>
            <div class="cart-item-price">
                ${hasDiscount ? `
                    <span class="old-price">${product.actual_price} ₽</span>
                    <span class="current-price">${product.discount_price} ₽</span>
                    <span class="discount-badge">-${discountPercent}%</span>
                ` : `
                    <span class="current-price">${product.actual_price} ₽</span>
                `}
            </div>
            <div class="cart-item-actions">
                <button class="btn-remove" data-id="${product.id}">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `;
    
    const removeBtn = item.querySelector('.btn-remove');
    removeBtn.addEventListener('click', function() {
        const productId = this.dataset.id;
        removeFromCart(productId);
        
        localStorage.removeItem(`shopzone_product_${productId}`);
        
        cartItems = cartItems.filter(item => item.id != productId);
        renderCartItems();
        updateTotalPrices();
    });
    
    return item;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    
    if (halfStar) {
        stars += '☆';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
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
    
    const deliveryDate = document.getElementById('delivery_date').value;
    const deliveryInterval = document.getElementById('delivery_interval').value;
    const deliveryCost = calculateDeliveryCost(deliveryDate, deliveryInterval);
    
    document.getElementById('products-total').textContent = `${goodsTotal} ₽`;
    document.getElementById('delivery-cost').textContent = `${deliveryCost} ₽`;
    document.getElementById('order-total').textContent = `${goodsTotal + deliveryCost} ₽`;
}

function setMinDeliveryDate() {
    const deliveryDate = document.getElementById('delivery_date');
    if (!deliveryDate) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    deliveryDate.min = minDate;
    deliveryDate.value = minDate;
}

function setupEventListeners() {
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
        resetBtn.addEventListener('click', resetForm);
    }
    
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
}

function resetForm() {
    if (confirm('Вы уверены, что хотите сбросить все данные формы?')) {
        document.getElementById('order-form').reset();
        setMinDeliveryDate();
        updateTotalPrices();
    }
}

async function submitOrder(event) {
    event.preventDefault();
    
    if (cartItems.length === 0) {
        showNotification('Добавьте товары в корзину перед оформлением заказа', 'error');
        return;
    }
    
    const form = event.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
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
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        
        const result = await createOrder(orderData);
        
        cartItems.forEach(item => {
            localStorage.removeItem(`shopzone_product_${item.id}`);
        });
        
        clearCart();
        updateCartCounter();
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Оформить';
    }
}