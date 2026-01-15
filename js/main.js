import { phonesData } from './phones.js';

let currentPage = 1;
let currentSort = '';
let currentFilters = {};
let totalPages = 1;
let isLoading = false;
let allCategories = ['apple', 'samsung', 'xiaomi', 'google', 'huawei', 'other'];

document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    loadCategories();
    await loadProducts();
    setupEventListeners();
    loadSavedFilters();
});

function loadCategories() {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;
    
    categoriesList.innerHTML = '';
    
    allCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        let displayName = '';
        if (category === 'apple') displayName = '🍎 Apple';
        else if (category === 'samsung') displayName = '📱 Samsung';
        else if (category === 'xiaomi') displayName = '⚡ Xiaomi';
        else if (category === 'google') displayName = '🔍 Google';
        else if (category === 'huawei') displayName = '✈️ Huawei';
        else if (category === 'other') displayName = '📱 Другие бренды';
        
        categoryItem.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" class="category-checkbox" value="${category}">
                <span class="checkmark"></span>
                ${displayName}
            </label>
        `;
        
        categoriesList.appendChild(categoryItem);
    });
}

async function loadProducts(append = false) {
    if (isLoading) return;
    
    isLoading = true;
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    if (!append) {
        productsGrid.innerHTML = '<div class="loading">Загрузка телефонов...</div>';
    }
    
    try {
        const searchQuery = currentFilters.query ? currentFilters.query.toLowerCase() : '';
        
        let filteredPhones = [...phonesData];
        
        if (searchQuery) {
            filteredPhones = filteredPhones.filter(phone => 
                phone.name.toLowerCase().includes(searchQuery) ||
                phone.brand.toLowerCase().includes(searchQuery) ||
                phone.sub_category.toLowerCase().includes(searchQuery) ||
                (phone.color && phone.color.toLowerCase().includes(searchQuery)) ||
                (phone.os && phone.os.toLowerCase().includes(searchQuery))
            );
        }
        
        if (currentFilters.category) {
            filteredPhones = filteredPhones.filter(phone => 
                phone.sub_category === currentFilters.category
            );
        }
        
        if (currentFilters.minPrice) {
            filteredPhones = filteredPhones.filter(phone => {
                const price = phone.discount_price || phone.actual_price;
                return price >= currentFilters.minPrice;
            });
        }
        
        if (currentFilters.maxPrice) {
            filteredPhones = filteredPhones.filter(phone => {
                const price = phone.discount_price || phone.actual_price;
                return price <= currentFilters.maxPrice;
            });
        }
        
        if (currentFilters.discountOnly) {
            filteredPhones = filteredPhones.filter(phone => 
                phone.discount_price && phone.discount_price < phone.actual_price
            );
        }
        
        if (currentSort) {
            filteredPhones.sort((a, b) => {
                const priceA = a.discount_price || a.actual_price;
                const priceB = b.discount_price || b.actual_price;
                
                switch(currentSort) {
                    case 'rating_desc':
                        return b.rating - a.rating;
                    case 'rating_asc':
                        return a.rating - b.rating;
                    case 'price_desc':
                        return priceB - priceA;
                    case 'price_asc':
                        return priceA - priceB;
                    default:
                        return 0;
                }
            });
        }
        
        const totalCount = filteredPhones.length;
        const perPage = 12;
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedPhones = filteredPhones.slice(startIndex, endIndex);
        
        totalPages = Math.ceil(totalCount / perPage);
        
        if (!append) {
            productsGrid.innerHTML = '';
        }
        
        updatePageInfo();
        
        if (paginatedPhones.length > 0) {
            paginatedPhones.forEach(product => {
                const productCard = createProductCard(product);
                productsGrid.appendChild(productCard);
            });
            
            updateLoadMoreButton();
            
            if (paginatedPhones.length === 0 && !append) {
                productsGrid.innerHTML = '<div class="no-products">Телефоны не найдены</div>';
            }
        } else {
            if (!append) {
                productsGrid.innerHTML = '<div class="no-products">Телефоны не найдены</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки телефонов:', error);
        if (!append) {
            productsGrid.innerHTML = '<div class="error">Ошибка загрузки телефонов</div>';
        }
    } finally {
        isLoading = false;
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
    const discountPercent = hasDiscount ? 
        Math.round((1 - product.discount_price / product.actual_price) * 100) : 0;
    
    const cart = JSON.parse(localStorage.getItem('shopzone_cart') || '[]');
    const inCart = cart.includes(product.id.toString());
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image_url || 'images/placeholder.jpg'}" 
                 alt="${product.name}"
                 onerror="this.onerror=null; this.src='images/placeholder.jpg'">
        </div>
        <div class="product-info">
            <h3 class="product-title" title="${product.name}">
                ${truncateText(product.name, 50)}
            </h3>
            <div class="product-rating">
                <span class="stars">${generateStars(product.rating || 0)}</span>
                <span class="rating-value">${(product.rating || 0).toFixed(1)}</span>
            </div>
            <div class="product-details">
                ${product.storage ? `<span class="detail">${product.storage}</span>` : ''}
                ${product.color ? `<span class="detail">${product.color}</span>` : ''}
                ${product.os ? `<span class="detail">${product.os}</span>` : ''}
            </div>
            <div class="product-price">
                ${hasDiscount ? `
                    <span class="old-price">${formatPrice(product.actual_price)} ₽</span>
                    <span class="current-price">${formatPrice(product.discount_price)} ₽</span>
                    <span class="discount-badge">-${discountPercent}%</span>
                ` : `
                    <span class="current-price">${formatPrice(product.actual_price)} ₽</span>
                `}
            </div>
            <button class="add-to-cart-btn ${inCart ? 'added' : ''}" 
                    data-id="${product.id}"
                    ${inCart ? 'disabled' : ''}>
                ${inCart ? '✓ В корзине' : 'Добавить в корзину'}
            </button>
        </div>
    `;
    
    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', function() {
        const productId = this.dataset.id;
        
        if (addToCart(productId)) {
            this.textContent = '✓ В корзине';
            this.classList.add('added');
            this.disabled = true;
            updateCartCounter();
        }
    });
    
    return card;
}

function formatPrice(price) {
    if (!price) return '0';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        const totalProducts = phonesData.length;
        pageInfo.textContent = `Страница ${currentPage} из ${totalPages} (Всего товаров: ${totalProducts})`;
    }
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more');
    if (!loadMoreBtn) return;
    
    if (currentPage >= totalPages) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'flex';
    }
}

function setupEventListeners() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentPage = 1;
            currentSort = this.value;
            saveFilters();
            loadProducts();
        });
    }
    
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && currentPage < totalPages) {
                currentPage++;
                loadProducts(true);
            }
        });
    }
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput && searchBtn) {
        searchInput.placeholder = "Поиск телефонов (apple, samsung, xiaomi...)";
        
        const performSearch = () => {
            currentPage = 1;
            const query = searchInput.value.trim();
            if (query) {
                currentFilters.query = query;
            } else {
                delete currentFilters.query;
            }
            saveFilters();
            loadProducts();
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

function applyFilters() {
    currentPage = 1;
    currentFilters = {};
    
    const selectedCategories = [];
    document.querySelectorAll('.category-checkbox:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });
    
    if (selectedCategories.length > 0) {
        currentFilters.category = selectedCategories[0];
    }
    
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    
    if (priceMin.value) {
        currentFilters.minPrice = parseInt(priceMin.value);
    }
    
    if (priceMax.value) {
        currentFilters.maxPrice = parseInt(priceMax.value);
    }
    
    const discountOnly = document.getElementById('discount-only');
    if (discountOnly.checked) {
        currentFilters.discountOnly = true;
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
        currentFilters.query = searchInput.value.trim();
    }
    
    saveFilters();
    loadProducts();
}

function resetFilters() {
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('discount-only').checked = false;
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    currentPage = 1;
    currentFilters = {};
    currentSort = '';
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.value = '';
    }
    
    localStorage.removeItem('shopzone_filters');
    loadProducts();
}

function saveFilters() {
    const filtersToSave = {
        sort: currentSort,
        filters: currentFilters,
        page: currentPage
    };
    
    localStorage.setItem('shopzone_filters', JSON.stringify(filtersToSave));
}

function loadSavedFilters() {
    const saved = localStorage.getItem('shopzone_filters');
    
    if (saved) {
        try {
            const { sort, filters, page } = JSON.parse(saved);
            
            if (sort) {
                currentSort = sort;
                const sortSelect = document.getElementById('sort-select');
                if (sortSelect) {
                    sortSelect.value = sort;
                }
            }
            
            if (filters) {
                currentFilters = filters;
                
                if (filters.category) {
                    const categoryCheckbox = document.querySelector(`.category-checkbox[value="${filters.category}"]`);
                    if (categoryCheckbox) {
                        categoryCheckbox.checked = true;
                    }
                }
                
                if (filters.minPrice) {
                    const priceMin = document.getElementById('price-min');
                    if (priceMin) {
                        priceMin.value = filters.minPrice;
                    }
                }
                
                if (filters.maxPrice) {
                    const priceMax = document.getElementById('price-max');
                    if (priceMax) {
                        priceMax.value = filters.maxPrice;
                    }
                }
                
                if (filters.discountOnly) {
                    const discountOnly = document.getElementById('discount-only');
                    if (discountOnly) {
                        discountOnly.checked = true;
                    }
                }
                
                if (filters.query) {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.value = filters.query;
                    }
                }
            }
            
            if (page) {
                currentPage = page;
            }
            
            loadProducts();
            
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
        }
    }
}

const style = document.createElement('style');
style.textContent = `
    .no-products, .error {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 3px 15px rgba(0,0,0,0.1);
        color: #666;
        font-size: 18px;
    }
    
    .error {
        color: #ef476f;
    }
    
    .product-details {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 15px;
    }
    
    .product-details .detail {
        background: #f0f0f0;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #666;
    }
`;
document.head.appendChild(style);