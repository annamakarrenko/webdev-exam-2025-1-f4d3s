let allOrders = [];
let allProducts = {};


document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    await loadOrders();
});

async function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '<div class="loading">Загрузка заказов...</div>';
    
    try {
        allOrders = await fetchOrders();
        
        if (allOrders.length === 0) {
            ordersContainer.innerHTML = '<div class="no-orders">У вас пока нет заказов.</div>';
            return;
        }
        
        if (typeof phonesData === 'undefined') {
            ordersContainer.innerHTML = '<div class="error">Ошибка загрузки данных о товарах</div>';
            return;
        }
        
        await loadProductsInfo();
        renderOrders();
        
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        ordersContainer.innerHTML = '<div class="error">Ошибка загрузки заказов</div>';
    }
}

async function loadProductsInfo() {
    const productIds = new Set();
    allOrders.forEach(order => {
        if (order.good_ids) {
            order.good_ids.forEach(id => productIds.add(id));
        }
    });
    
    for (const productId of productIds) {
        if (!allProducts[productId]) {
            const product = phonesData.find(p => p.id == productId);
            if (product) {
                allProducts[productId] = product;
            }
        }
    }
}

function renderOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    const sortedOrders = [...allOrders].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    let html = `
        <div class="orders-table">
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Дата оформления</th>
                        <th>Состав заказа</th>
                        <th>Стоимость</th>
                        <th>Доставка</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sortedOrders.forEach((order, index) => {
        const orderDate = formatDateTime(order.created_at);
        const composition = getOrderComposition(order);
        const total = calculateOrderTotal(order);
        const deliveryInfo = formatDeliveryInfo(order);
        
        html += `
            <tr data-order-id="${order.id}">
                <td>${index + 1}</td>
                <td>${orderDate}</td>
                <td title="${composition}">${truncateText(composition, 50)}</td>
                <td>${formatPrice(total)} ₽</td>
                <td>${deliveryInfo}</td>
                <td>
                    <div class="actions">
                        <button class="action-btn btn-view" onclick="viewOrder(${order.id})" title="Просмотр">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editOrder(${order.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteOrderConfirm(${order.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    ordersContainer.innerHTML = html;
}

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatPrice(price) {
    if (!price) return '0';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getOrderComposition(order) {
    if (!order.good_ids || order.good_ids.length === 0) return 'Нет товаров';
    
    const productNames = order.good_ids
        .map(id => allProducts[id]?.name || `Товар #${id}`)
        .filter(Boolean);
    
    return productNames.join(', ');
}

function calculateOrderTotal(order) {
    if (!order.good_ids || order.good_ids.length === 0) return 0;
    
    return order.good_ids.reduce((total, productId) => {
        const product = allProducts[productId];
        if (!product) return total;
        
        const price = product.discount_price && product.discount_price < product.actual_price
            ? product.discount_price
            : product.actual_price;
        
        return total + (price || 0);
    }, 0);
}

function formatDeliveryInfo(order) {
    if (!order.delivery_date || !order.delivery_interval) return 'Не указано';
    
    return `${order.delivery_date} ${order.delivery_interval}`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

window.viewOrder = async function(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;
    
    const modalContent = document.getElementById('view-modal-content');
    if (!modalContent) return;
    
    const total = calculateOrderTotal(order);
    const composition = getOrderComposition(order);
    
    modalContent.innerHTML = `
        <div class="order-details">
            <div class="detail-item">
                <strong>Дата оформления:</strong>
                <span>${formatDateTime(order.created_at)}</span>
            </div>
            
            <div class="detail-item">
                <strong>Имя:</strong>
                <span>${order.full_name || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Телефон:</strong>
                <span>${order.phone || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Email:</strong>
                <span>${order.email || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Адрес доставки:</strong>
                <span>${order.delivery_address || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Дата доставки:</strong>
                <span>${order.delivery_date || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Время доставки:</strong>
                <span>${order.delivery_interval || 'Не указано'}</span>
            </div>
            
            <div class="detail-item">
                <strong>Состав заказа:</strong>
                <div class="composition-list">${composition}</div>
            </div>
            
            ${order.comment ? `
            <div class="detail-item">
                <strong>Комментарий:</strong>
                <div class="comment">${order.comment}</div>
            </div>
            ` : ''}
            
            <div class="detail-item total">
                <strong>Стоимость:</strong>
                <span class="price">${formatPrice(total)} ₽</span>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-primary" onclick="closeModal('view-modal')">Закрыть</button>
        </div>
    `;
    
    showModal('view-modal');
};

window.editOrder = async function(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;
    
    const modalContent = document.getElementById('edit-modal-content');
    if (!modalContent) return;
    
    const total = calculateOrderTotal(order);
    
    modalContent.innerHTML = `
        <form id="edit-order-form" data-order-id="${order.id}">
            <div class="form-group">
                <label for="edit-full_name">Имя</label>
                <input type="text" id="edit-full_name" name="full_name" 
                       value="${order.full_name || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-phone">Телефон</label>
                <input type="tel" id="edit-phone" name="phone" 
                       value="${order.phone || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-email">Email</label>
                <input type="email" id="edit-email" name="email" 
                       value="${order.email || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-delivery_address">Адрес доставки</label>
                <input type="text" id="edit-delivery_address" name="delivery_address" 
                       value="${order.delivery_address || ''}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-delivery_date">Дата доставки</label>
                <input type="date" id="edit-delivery_date" name="delivery_date" 
                       value="${formatDateForInput(order.delivery_date)}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-delivery_interval">Время доставки</label>
                <select id="edit-delivery_interval" name="delivery_interval" required>
                    <option value="">Выберите время</option>
                    <option value="08:00-12:00" ${order.delivery_interval === '08:00-12:00' ? 'selected' : ''}>08:00 - 12:00</option>
                    <option value="12:00-14:00" ${order.delivery_interval === '12:00-14:00' ? 'selected' : ''}>12:00 - 14:00</option>
                    <option value="14:00-18:00" ${order.delivery_interval === '14:00-18:00' ? 'selected' : ''}>14:00 - 18:00</option>
                    <option value="18:00-22:00" ${order.delivery_interval === '18:00-22:00' ? 'selected' : ''}>18:00 - 22:00</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="edit-comment">Комментарий</label>
                <textarea id="edit-comment" name="comment" rows="4">${order.comment || ''}</textarea>
            </div>
            
            <div class="order-summary">
                <div class="summary-item total">
                    <strong>Стоимость заказа:</strong>
                    <strong class="price">${formatPrice(total)} ₽</strong>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('edit-modal')">Отмена</button>
                <button type="submit" class="btn btn-primary">Сохранить</button>
            </div>
        </form>
    `;
    
    const deliveryDateInput = document.getElementById('edit-delivery_date');
    if (deliveryDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        deliveryDateInput.min = tomorrow.toISOString().split('T')[0];
    }
    
    const form = document.getElementById('edit-order-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateOrderHandler(orderId);
    });
    
    showModal('edit-modal');
};

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    
    if (dateStr.includes('.')) {
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr;
}

async function updateOrderHandler(orderId) {
    const form = document.getElementById('edit-order-form');
    const formData = new FormData(form);
    
    const orderData = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        delivery_address: formData.get('delivery_address'),
        delivery_date: formData.get('delivery_date'),
        delivery_interval: formData.get('delivery_interval'),
        comment: formData.get('comment')
    };
    
    // Форматируем дату для API
    if (orderData.delivery_date) {
        const date = new Date(orderData.delivery_date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        orderData.delivery_date = `${day}.${month}.${year}`;
    }
    
    try {
        const result = await updateOrder(orderId, orderData);
        
        const index = allOrders.findIndex(o => o.id == orderId);
        if (index !== -1) {
            allOrders[index] = { ...allOrders[index], ...result };
        }
        
        renderOrders();
        closeModal('edit-modal');
        
    } catch (error) {
        console.error('Ошибка обновления заказа:', error);
    }
}

window.deleteOrderConfirm = function(orderId) {
    const modalContent = document.getElementById('delete-modal-content');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="delete-confirmation">
            <p>Вы уверены, что хотите удалить этот заказ?</p>
            <p class="warning">Это действие нельзя отменить.</p>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('delete-modal')">Отмена</button>
                <button type="button" class="btn btn-danger" onclick="deleteOrderHandler(${orderId})">Удалить</button>
            </div>
        </div>
    `;
    
    showModal('delete-modal');
};

window.deleteOrderHandler = async function(orderId) {
    try {
        await deleteOrder(orderId);
        
        allOrders = allOrders.filter(o => o.id != orderId);
        renderOrders();
        closeModal('delete-modal');
        
    } catch (error) {
        console.error('Ошибка удаления заказа:', error);
    }
};

window.showModal = function(modalId) {
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
};

window.closeModal = function(modalId) {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
};