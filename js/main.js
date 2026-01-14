import {
    showNotification,
    fetchGoods,
    fetchCategories,
    addToCart,
    updateCartCounter
} from './api.js';

let currentPage = 1;
let currentSortOrder = '';
let currentFilters = {};
let totalPages = 1;
let isLoading = false;
let allCategories = [];

document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    await loadCategories(); 
    await loadGoods();
    initEventListeners();
    loadSavedFilters();
});

async function loadCategories() {
    allCategories = await fetchCategories();
    renderCategories();
}

function renderCategories() {
    const categoriesList = document.getElementById('categories-list');
    
    if (!categoriesList || allCategories.length === 0) return;
    
    categoriesList.innerHTML = '';
    
    allCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        categoryItem.innerHTML = `
            <label class="checkbox">
                <input type="checkbox" value="${category}" class="category-checkbox">
                ${category}
            </label>
        `;
        
        categoriesList.appendChild(categoryItem);
    });
}

async function loadGoods(append = false) {
    if (isLoading) return;
    
    isLoading = true;
    const catalog = document.getElementById('catalog');
    
    if (!catalog) return;
    
    if (!append) {
        catalog.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    }
    
    try {
        const data = await fetchGoods(
            currentPage, 
            10, 
            currentSortOrder || null,
            currentFilters
        );
        
        if (!append) {
            catalog.innerHTML = '';
        }
        
        if (data.pagination) {
            totalPages = Math.ceil(data.pagination.total_count / data.pagination.per_page);
            updateLoadMoreButton();
        }
        
        if (data.goods && data.goods.length > 0) {
            data.goods.forEach(product => {
                const productCard = createProductCard(product);
                catalog.appendChild(productCard);
            });
        } else {
            if (!append) {
                catalog.innerHTML = '<div class="no-products">Товары не найдены</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        if (!append) {
            catalog.innerHTML = '<div class="error">Ошибка загрузки товаров</div>';
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
    
    const stars = generateStars(product.rating || 0);
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image_url || 'images/placeholder.jpg'}" 
                 alt="${product.name}" 
                 loading="lazy"
                 onerror="this.src='images/placeholder.jpg'">
        </div>
        <div class="product-info">
            <h3 class="product-name" title="${product.name}">
                ${product.name.length > 50 ? product.name.substring(0, 50) + '...' : product.name}
            </h3>
            <div class="product-rating" title="Рейтинг: ${product.rating || 0}">
                ${stars}
                <span class="rating-value">${(product.rating || 0).toFixed(1)}</span>
            </div>
            <div class="product-price">
                ${hasDiscount ? `
                    <span class="old-price">${product.actual_price} ₽</span>
                    <span class="new-price">${product.discount_price} ₽</span>
                    <span class="discount">-${discountPercent}%</span>
                ` : `
                    <span class="current-price">${product.actual_price} ₽</span>
                `}
            </div>
            <button class="btn-add-to-cart" data-id="${product.id}">
                Добавить в корзину
            </button>
        </div>
    `;
    
    const addButton = card.querySelector('.btn-add-to-cart');
    addButton.addEventListener('click', function() {
        const productId = this.dataset.id;
        if (addToCart(productId)) {
            this.textContent = 'Добавлено';
            this.disabled = true;
            this.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                this.textContent = 'Добавить в корзину';
                this.disabled = false;
                this.style.backgroundColor = '';
            }, 2000);
        }
    });
    
    return card;
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

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more');
    
    if (!loadMoreBtn) return;
    
    if (currentPage >= totalPages) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

function initEventListeners() {
    const sortSelect = document.getElementById('sort-order');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentPage = 1;
            currentSortOrder = this.value;
            saveFilters();
            loadGoods();
        });
    }
    
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && currentPage < totalPages) {
                currentPage++;
                loadGoods(true);
            }
        });
    }
    
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            currentPage = 1;
            currentFilters.query = searchInput.value.trim();
            saveFilters();
            loadGoods();
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
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
    
    const priceFrom = document.getElementById('price-from');
    const priceTo = document.getElementById('price-to');
    
    if (priceFrom.value) {
        currentFilters.minPrice = parseInt(priceFrom.value);
    }
    
    if (priceTo.value) {
        currentFilters.maxPrice = parseInt(priceTo.value);
    }
    
    const discountOnly = document.getElementById('discount-only');
    if (discountOnly.checked) {
        currentFilters.discountOnly = true;
    }
    
    saveFilters();
    loadGoods();
}

function saveFilters() {
    const filtersToSave = {
        sortOrder: currentSortOrder,
        filters: currentFilters,
        page: currentPage
    };
    
    localStorage.setItem('filters', JSON.stringify(filtersToSave));
}

function loadSavedFilters() {
    const saved = localStorage.getItem('filters');
    
    if (saved) {
        try {
            const { sortOrder, filters, page } = JSON.parse(saved);
            
            if (sortOrder) {
                currentSortOrder = sortOrder;
                const sortSelect = document.getElementById('sort-order');
                if (sortSelect) {
                    sortSelect.value = sortOrder;
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
                
                if (filters.minPrice !== undefined) {
                    const priceFrom = document.getElementById('price-from');
                    if (priceFrom) {
                        priceFrom.value = filters.minPrice;
                    }
                }
                
                if (filters.maxPrice !== undefined) {
                    const priceTo = document.getElementById('price-to');
                    if (priceTo) {
                        priceTo.value = filters.maxPrice;
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
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
        }
    }
}