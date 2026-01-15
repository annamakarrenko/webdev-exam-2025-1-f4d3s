const API_KEY = '6a48b49a-943d-4bd4-868c-94a15212daff';
const API_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';
let allDishes = [];
let allOrders = [];

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    modal.style.display = 'block';
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    modal.style.display = 'none';
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadDishes() {
    try {
        const response = await fetch(`${API_URL}/dishes?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки блюд');
        allDishes = await response.json();
        return allDishes;
    } catch (error) {
        showNotification('Ошибка загрузки блюд', 'error');
        return [];
    }
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка загрузки заказов');
        allOrders = await response.json();
        return allOrders;
    } catch (error) {
        showNotification('Ошибка загрузки заказов', 'error');
        return [];
    }
}

function getDishName(dishId) {
    const dish = allDishes.find(d => d.id == dishId);
    return dish ? dish.name : 'Неизвестное блюдо';
}

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function formatDeliveryTime(order) {
    if (order.delivery_type === 'by_time' && order.delivery_time) {
        const time = order.delivery_time;
        return time.substring(0, 5);
    }
    
    return 'Как можно скорее';
}

function getOrderComposition(order) {
    const parts = [];
    if (order.soup_id) parts.push(getDishName(order.soup_id));
    if (order.main_course_id) parts.push(getDishName(order.main_course_id));
    if (order.salad_id) parts.push(getDishName(order.salad_id));
    if (order.drink_id) parts.push(getDishName(order.drink_id));
    if (order.dessert_id) parts.push(getDishName(order.dessert_id));
    return parts.join(', ');
}

function calculateOrderTotal(order) {
    let total = 0;
    
    if (order.soup_id) {
        const soupDish = allDishes.find(d => d.id == order.soup_id);
        total += soupDish?.price || 0;
    }
    
    if (order.main_course_id) {
        const mainDish = allDishes.find(d => d.id == order.main_course_id);
        total += mainDish?.price || 0;
    }
    
    if (order.salad_id) {
        const saladDish = allDishes.find(d => d.id == order.salad_id);
        total += saladDish?.price || 0;
    }
    
    if (order.drink_id) {
        const drinkDish = allDishes.find(d => d.id == order.drink_id);
        total += drinkDish?.price || 0;
    }
    
    if (order.dessert_id) {
        const dessertDish = allDishes.find(d => d.id == order.dessert_id);
        total += dessertDish?.price || 0;
    }
    
    return total;
}

function renderOrdersTable() {
    const container = document.getElementById('orders-list');
    
    if (allOrders.length === 0) {
        container.innerHTML = '<p>У вас пока нет заказов.</p>';
        return;
    }
    
    const sortedOrders = [...allOrders].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    let html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>№</th>
                    <th>Дата оформления</th>
                    <th>Состав заказа</th>
                    <th>Стоимость</th>
                    <th>Время доставки</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedOrders.forEach((order, index) => {
        const total = calculateOrderTotal(order);
        const composition = getOrderComposition(order);
        const deliveryTime = formatDeliveryTime(order);
        const orderDate = formatDateTime(order.created_at);
        
        html += `
            <tr data-order-id="${order.id}">
                <td class="order-number">${index + 1}</td>
                <td class="order-date">${orderDate}</td>
                <td class="order-composition">${composition}</td>
                <td class="order-price">${total} руб.</td>
                <td class="order-delivery-time"><div>${deliveryTime}</div></td>
                <td class="actions-cell">
                    <button class="action-icon-btn view-icon" 
                        onclick="viewOrder(${order.id})" 
                        title="Подробнее">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="action-icon-btn edit-icon" 
                        onclick="editOrder(${order.id})" 
                        title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="action-icon-btn delete-icon" 
                        onclick="confirmDelete(${order.id})" 
                        title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function updateOrder(orderId, formData) {
    const updateData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        delivery_address: formData.get('delivery_address'),
        delivery_type: formData.get('delivery_type')
    };
    
    const comment = formData.get('comment');
    if (comment) updateData.comment = comment;
    
    if (updateData.delivery_type === 'by_time') {
        const deliveryTime = formData.get('delivery_time');
        if (!deliveryTime) {
            showNotification('Укажите время доставки', 'error');
            return;
        }
        updateData.delivery_time = deliveryTime;
    }
    
    try {
        const url = `${API_URL}/orders/${orderId}?api_key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка обновления заказа');
        }
        
        const updatedOrder = await response.json();
        
        const index = allOrders.findIndex(o => o.id == orderId);
        if (index !== -1) {
            allOrders[index] = updatedOrder;
        }
        
        showNotification('Заказ успешно изменён');
        hideModal('edit-modal');
        renderOrdersTable();
        
    } catch (error) {
        const errorMessage = 'Ошибка при обновлении заказа: ' + error.message;
        showNotification(errorMessage, 'error');
    }
}

async function deleteOrder(orderId) {
    try {
        const url = `${API_URL}/orders/${orderId}?api_key=${API_KEY}`;
        const response = await fetch(url, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка удаления заказа');
        }
        
        allOrders = allOrders.filter(o => o.id != orderId);
        
        showNotification('Заказ успешно удалён');
        hideModal('delete-modal');
        renderOrdersTable();
        
    } catch (error) {
        const errorMessage = 'Ошибка при удалении заказа: ' + error.message;
        showNotification(errorMessage, 'error');
    }
}

function viewOrder(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;
    
    const total = calculateOrderTotal(order);
    const orderDate = formatDateTime(order.created_at);
    const deliveryTime = formatDeliveryTime(order);
    
    let html = `
        <h3>Просмотр заказа</h3>
        <div class="info-divider"></div>
        
        <div class="order-info-section">
            <div class="info-row">
                <div class="info-label">Дата оформления:</div>
                <div class="info-value">${orderDate}</div>
            </div>
        </div>
        
        <div class="section-title">Доставка</div>
        <div class="order-info-section">
            <div class="info-row">
                <div class="info-label">Имя получателя:</div>
                <div class="info-value">${order.full_name}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Адрес доставки:</div>
                <div class="info-value">${order.delivery_address}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Время доставки:</div>
                <div class="info-value">${deliveryTime}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Телефон:</div>
                <div class="info-value">${order.phone}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${order.email}</div>
            </div>
        </div>
    `;
    
    if (order.comment) {
        html += `
            <div class="divider"></div>
            
            <div class="section-title">Комментарий</div>
            <div class="order-info-section">
                <div class="comment-text">${order.comment}</div>
            </div>
        `;
    }
    
    html += `
        <div class="divider"></div>
        
        <div class="section-title">Состав заказа</div>
        <div class="order-info-section">
    `;
    
    if (order.soup_id) {
        const dishName = getDishName(order.soup_id);
        const soupDish = allDishes.find(d => d.id == order.soup_id);
        const dishPrice = soupDish?.price || 0;
        
        html += `
            <div class="info-row">
                <div class="info-label">Суп:</div>
                <div class="info-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.main_course_id) {
        const dishName = getDishName(order.main_course_id);
        const mainDish = allDishes.find(d => d.id == order.main_course_id);
        const dishPrice = mainDish?.price || 0;
        
        html += `
            <div class="info-row">
                <div class="info-label">Основное блюдо:</div>
                <div class="info-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.salad_id) {
        const dishName = getDishName(order.salad_id);
        const saladDish = allDishes.find(d => d.id == order.salad_id);
        const dishPrice = saladDish?.price || 0;
        
        html += `
            <div class="info-row">
                <div class="info-label">Салат:</div>
                <div class="info-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.drink_id) {
        const dishName = getDishName(order.drink_id);
        const drinkDish = allDishes.find(d => d.id == order.drink_id);
        const dishPrice = drinkDish?.price || 0;
        
        html += `
            <div class="info-row">
                <div class="info-label">Напиток:</div>
                <div class="info-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.dessert_id) {
        const dishName = getDishName(order.dessert_id);
        const dessertDish = allDishes.find(d => d.id == order.dessert_id);
        const dishPrice = dessertDish?.price || 0;
        
        html += `
            <div class="info-row">
                <div class="info-label">Десерт:</div>
                <div class="info-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    html += `
        </div>

        <div class="info-row">
            <div class="section-title">Стоимость: ${total} руб.</div>
        </div>
        <div class="info-divider"></div>
        <div class="modal-buttons-right">
            <button class="action-btn ok-btn" onclick="hideModal('view-modal')">ОК</button>
        </div>
    `;
    
    document.getElementById('view-modal-content').innerHTML = html;
    
    const modal = document.getElementById('view-modal');
    modal.style.overflowY = 'visible';
    modal.style.maxHeight = 'none';
    
    showModal('view-modal');
}

function editOrder(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;
    
    const isByTime = order.delivery_type === 'by_time';
    const totalPrice = calculateOrderTotal(order);
    const orderDate = formatDateTime(order.created_at);
    
    const nowChecked = order.delivery_type === 'now' ? 'checked' : '';
    const byTimeChecked = order.delivery_type === 'by_time' ? 'checked' : '';
    
    let html = `
        <h3>Редактирование заказа</h3>
        <div class="info-divider"></div>
        
        <div class="order-info-section">
            <div class="info-row">
                <div class="info-label">Дата оформления:</div>
                <div class="info-value">${orderDate}</div>
            </div>
        </div>
        
        <form id="edit-order-form" class="edit-form">
            <input type="hidden" name="id" value="${order.id}">
            
            <div class="section-title">Доставка</div>
            <div class="edit-form-section">
                <div class="edit-row">
                    <div class="edit-label">Имя получателя:</div>
                    <div class="edit-input">
                        <input type="text" name="full_name" value="${order.full_name}" required>
                    </div>
                </div>
                
                <div class="edit-row">
                    <div class="edit-label">Адрес доставки:</div>
                    <div class="edit-input">
                        <input type="text" name="delivery_address" value="${order.delivery_address}" required>
                    </div>
                </div>
                
                <div class="edit-row">
                    <div class="edit-label">Тип доставки:</div>
                    <div class="edit-input">
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" name="delivery_type" value="now" ${nowChecked}>
                                Как можно скорее
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="delivery_type" value="by_time" ${byTimeChecked}>
                                Ко времени
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="edit-row" id="delivery-time-row" style="${isByTime ? '' : 'display: none;'}">
                    <div class="edit-label">Время доставки:</div>
                    <div class="edit-input">
                        <input type="time" name="delivery_time" value="${order.delivery_time || ''}" min="07:00" max="23:00" step="300">
                        <small>Доступное время с 7:00 до 23:00</small>
                    </div>
                </div>
                
                <div class="edit-row">
                    <div class="edit-label">Телефон:</div>
                    <div class="edit-input">
                        <input type="tel" name="phone" value="${order.phone}" required>
                    </div>
                </div>
                
                <div class="edit-row">
                    <div class="edit-label">Email:</div>
                    <div class="edit-input">
                        <input type="email" name="email" value="${order.email}" required>
                    </div>
                </div>
            </div>

            <div class="section-title">Комментарий</div>
            <div class="edit-form-section">
                <div class="edit-row">
                    <div class="edit-input">
                        <textarea name="comment">${order.comment || ''}</textarea>
                    </div>
                </div>
            </div>
            
            <div class="section-title">Состав заказа</div>
    `;

    if (order.soup_id) {
        const dishName = getDishName(order.soup_id);
        const soupDish = allDishes.find(d => d.id == order.soup_id);
        const dishPrice = soupDish?.price || 0;
        
        html += `
            <div class="order-summary-row">
                <div class="order-summary-label">Суп:</div>
                <div class="order-summary-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.main_course_id) {
        const dishName = getDishName(order.main_course_id);
        const mainDish = allDishes.find(d => d.id == order.main_course_id);
        const dishPrice = mainDish?.price || 0;
        
        html += `
            <div class="order-summary-row">
                <div class="order-summary-label">Основное блюдо:</div>
                <div class="order-summary-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.salad_id) {
        const dishName = getDishName(order.salad_id);
        const saladDish = allDishes.find(d => d.id == order.salad_id);
        const dishPrice = saladDish?.price || 0;
        
        html += `
            <div class="order-summary-row">
                <div class="order-summary-label">Салат:</div>
                <div class="order-summary-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.drink_id) {
        const dishName = getDishName(order.drink_id);
        const drinkDish = allDishes.find(d => d.id == order.drink_id);
        const dishPrice = drinkDish?.price || 0;
        
        html += `
            <div class="order-summary-row">
                <div class="order-summary-label">Напиток:</div>
                <div class="order-summary-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }
    
    if (order.dessert_id) {
        const dishName = getDishName(order.dessert_id);
        const dessertDish = allDishes.find(d => d.id == order.dessert_id);
        const dishPrice = dessertDish?.price || 0;
        
        html += `
            <div class="order-summary-row">
                <div class="order-summary-label">Десерт:</div>
                <div class="order-summary-value">${dishName} (${dishPrice} руб.)</div>
            </div>
        `;
    }

    html += `
                <div class="order-summary-row order-total-row">
                    <div class="order-summary-label">Стоимость:</div>
                    <div class="order-summary-value">${totalPrice} руб.</div>
                </div>
            
            <div class="info-divider"></div>
            
            <div class="modal-buttons-right">
                <button type="button" class="action-btn cancel-btn" onclick="hideModal('edit-modal')">Отмена</button>
                <button type="submit" class="action-btn save-btn">Сохранить</button>
            </div>
        </form>
    `;
    
    document.getElementById('edit-modal-content').innerHTML = html;
    
    const deliveryTypeRadios = document.querySelectorAll('input[name="delivery_type"]');
    deliveryTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const deliveryTimeRow = document.getElementById('delivery-time-row');
            if (this.value === 'by_time') {
                deliveryTimeRow.style.display = 'flex';
            } else {
                deliveryTimeRow.style.display = 'none';
            }
        });
    });
    
    const form = document.getElementById('edit-order-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateOrder(orderId, new FormData(form));
    });
    
    showModal('edit-modal');
}

function confirmDelete(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;
    
    const orderDate = formatDateTime(order.created_at);
    
    let html = `
        <h3>Удаление заказа</h3>
        <div class="info-divider"></div>
        
        <div class="order-info-section">
            <div class="info-row">
                <div class="info-label">Дата оформления:</div>
                <div class="info-value">${orderDate}</div>
            </div>
        </div>
        
        <p style="margin: 20px 0; font-size: 16px;">Вы уверены, что хотите удалить этот заказ?</p>
        
        <div class="info-divider"></div>
        <div class="modal-buttons-split">
            <button type="button" class="action-btn no-btn" onclick="hideModal('delete-modal')">Нет</button>
            <button type="button" class="action-btn yes-btn" onclick="deleteOrder(${order.id})">Да</button>
        </div>
    `;
    
    document.getElementById('delete-modal-content').innerHTML = html;
    showModal('delete-modal');
}

function initModalListeners() {
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    const overlay = document.getElementById('modal-overlay');
    overlay.addEventListener('click', function() {
        document.querySelectorAll('.modal').forEach(modal => {
            hideModal(modal.id);
        });
    });
}

async function initOrdersPage() {
    await loadDishes();
    await loadOrders();
    renderOrdersTable();
    initModalListeners();
}

document.addEventListener('DOMContentLoaded', initOrdersPage);