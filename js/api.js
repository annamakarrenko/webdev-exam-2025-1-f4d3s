
const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = '6a48b49a-943d-4bd4-868c-94a15212daff'; 

function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notificationArea.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

async function fetchGoods(page = 1, perPage = 10, sortOrder = null, filters = {}) {
    let url = `${API_BASE_URL}/goods?api_key=${API_KEY}&page=${page}&per_page=${perPage}`;
    
    if (sortOrder) {
        url += `&sort_order=${sortOrder}`;
    }
    
    if (filters.category) {
        url += `&main_category=${encodeURIComponent(filters.category)}`;
    }
    
    if (filters.minPrice !== undefined) {
        url += `&min_price=${filters.minPrice}`;
    }
    
    if (filters.maxPrice !== undefined) {
        url += `&max_price=${filters.maxPrice}`;
    }
    
    if (filters.discountOnly) {
        url += '&discount_only=true';
    }
    
    if (filters.query) {
        url += `&query=${encodeURIComponent(filters.query)}`;
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Ошибка авторизации. Проверьте API ключ.', 'error');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data._pagination) {
            return {
                goods: data.goods || [],
                pagination: data._pagination
            };
        }
        
        return {
            goods: data,
            pagination: null
        };
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Ошибка загрузки товаров', 'error');
        return { goods: [], pagination: null };
    }
}

async function fetchOrders() {
    const url = `${API_BASE_URL}/orders?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        showNotification('Ошибка загрузки заказов', 'error');
        return [];
    }
}

async function createOrder(orderData) {
    const url = `${API_BASE_URL}/orders?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка создания заказа');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        throw error;
    }
}

async function updateOrder(orderId, orderData) {
    const url = `${API_BASE_URL}/orders/${orderId}?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка обновления заказа');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка обновления заказа:', error);
        throw error;
    }
}

async function deleteOrder(orderId) {
    const url = `${API_BASE_URL}/orders/${orderId}?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка удаления заказа');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка удаления заказа:', error);
        throw error;
    }
}

async function fetchProduct(productId) {
    const url = `${API_BASE_URL}/goods/${productId}?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        showNotification('Ошибка загрузки товара', 'error');
        return null;
    }
}

async function fetchCategories() {
    try {
        const data = await fetchGoods(1, 100);
        const categories = new Set();
        
        data.goods.forEach(good => {
            if (good.main_category) {
                categories.add(good.main_category);
            }
        });
        
        return Array.from(categories).sort();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        return [];
    }
}

const CART_STORAGE_KEY = 'cart';

function getCart() {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(productId) {
    const cart = getCart();
    
    if (!cart.includes(productId)) {
        cart.push(productId);
        saveCart(cart);
        updateCartCounter();
        showNotification('Товар добавлен в корзину', 'success');
        return true;
    }
    
    return false;
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(id => id !== productId);
    saveCart(cart);
    updateCartCounter();
    showNotification('Товар удален из корзины', 'info');
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCounter();
}

function updateCartCounter() {
    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) {
        const cart = getCart();
        cartCounter.textContent = cart.length;
    }
}

export {
    showNotification,
    fetchGoods,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    fetchProduct,
    fetchCategories,
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    clearCart,
    updateCartCounter
};