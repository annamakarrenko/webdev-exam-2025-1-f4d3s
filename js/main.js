import { phonesData } from './phones.js';

import {
    showNotification,
    fetchGoods,
    fetchCategories,
    addToCart,
    updateCartCounter,
    fetchProduct
} from './api.js';

let currentPage = 1;
let currentSort = '';
let currentFilters = {};
let totalPages = 1;
let isLoading = false;
let allCategories = [];

document.addEventListener('DOMContentLoaded', async function() {
    updateCartCounter();
    await loadCategories();
    await loadProducts();
    setupEventListeners();
    loadSavedFilters();
});

async function loadCategories() {
    try {
        allCategories = await fetchCategories();
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

function renderCategories() {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;
    
    categoriesList.innerHTML = '';
    
    allCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        categoryItem.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" class="category-checkbox" value="${category}">
                <span class="checkmark"></span>
                ${category.charAt(0).toUpperCase() + category.slice(1)}
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
        productsGrid.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    }
    
    try {
        const data = await fetchAllGoods(
            currentPage,
            12,
            currentSort,
            currentFilters
        );
        
        if (!append) {
            productsGrid.innerHTML = '';
        }
        
        if (data.pagination) {
            totalPages = Math.ceil(data.pagination.total_count / data.pagination.per_page);
            updatePageInfo();
        }
        
        if (data.goods && data.goods.length > 0) {
            data.goods.forEach(product => {
                const productCard = createProductCard(product);
                productsGrid.appendChild(productCard);
            });
            
            updateLoadMoreButton();
        } else {
            if (!append) {
                productsGrid.innerHTML = '<div class="no-products">Товары не найдены</div>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        if (!append) {
            productsGrid.innerHTML = '<div class="error">Ошибка загрузки товаров</div>';
        }
    } finally {
        isLoading = false;
    }
}

async function fetchAllGoods(page = 1, perPage = 12, sortOrder = null, filters = {}) {
    try {
        if (filters.category === 'smartphones' || 
            (filters.query && (
                filters.query.toLowerCase().includes('телефон') ||
                filters.query.toLowerCase().includes('phone') ||
                filters.query.toLowerCase().includes('iphone') ||
                filters.query.toLowerCase().includes('samsung') ||
                filters.query.toLowerCase().includes('xiaomi') ||
                filters.query.toLowerCase().includes('huawei') ||
                filters.query.toLowerCase().includes('google')
            ))) {
            
            let filteredPhones = [...phonesData];
            
            if (filters.query) {
                const query = filters.query.toLowerCase();
                filteredPhones = filteredPhones.filter(phone => 
                    phone.name.toLowerCase().includes(query) ||
                    (phone.brand && phone.brand.toLowerCase().includes(query)) ||
                    phone.main_category.toLowerCase().includes(query) ||
                    phone.sub_category.toLowerCase().includes(query)
                );
            }
            
            if (filters.category === 'smartphones') {
                filteredPhones = filteredPhones.filter(phone => 
                    phone.main_category === 'smartphones'
                );
            }
            
            if (filters.minPrice) {
                filteredPhones = filteredPhones.filter(phone => 
                    (phone.discount_price || phone.actual_price) >= filters.minPrice
                );
            }
            
            if (filters.maxPrice) {
                filteredPhones = filteredPhones.filter(phone => 
                    (phone.discount_price || phone.actual_price) <= filters.maxPrice
                );
            }
            
            if (filters.discountOnly) {
                filteredPhones = filteredPhones.filter(phone => 
                    phone.discount_price && phone.discount_price < phone.actual_price
                );
            }
            
            if (sortOrder) {
                filteredPhones.sort((a, b) => {
                    const priceA = a.discount_price || a.actual_price;
                    const priceB = b.discount_price || b.actual_price;
                    
                    switch(sortOrder) {
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
            
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedPhones = filteredPhones.slice(startIndex, endIndex);
            
            return {
                goods: paginatedPhones,
                pagination: {
                    current_page: page,
                    per_page: perPage,
                    total_count: filteredPhones.length
                }
            };
        }
        
        return await fetchGoods(page, perPage, sortOrder, filters);
        
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
        
        if (filters.category === 'smartphones') {
            return {
                goods: phonesData.slice(0, perPage),
                pagination: {
                    current_page: 1,
                    per_page: perPage,
                    total_count: phonesData.length
                }
            };
        }
        
        return { goods: [], pagination: null };
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
                 onerror="this.src='images/placeholder.jpg'">
        </div>
        <div class="product-info">
            <h3 class="product-title" title="${product.name}">
                ${truncateText(product.name, 50)}
            </h3>
            <div class="product-rating">
                <span class="stars">${generateStars(product.rating || 0)}</span>
                <span class="rating-value">${(product.rating || 0).toFixed(1)}</span>
            </div>
            <div class="product-price">
                ${hasDiscount ? `
                    <span class="old-price">${product.actual_price} ₽</span>
                    <span class="current-price">${product.discount_price} ₽</span>
                    <span class="discount-badge">-${discountPercent}%</span>
                ` : `
                    <span class="current-price">${product.actual_price} ₽</span>
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
    addButton.addEventListener('click', async function() {
        const productId = this.dataset.id;
        
        if (addToCart(productId)) {
            this.textContent = '✓ В корзине';
            this.classList.add('added');
            this.disabled = true;
            
            const productData = {
                id: product.id,
                name: product.name,
                actual_price: product.actual_price,
                discount_price: product.discount_price,
                image_url: product.image_url,
                rating: product.rating
            };
            
            localStorage.setItem(`shopzone_product_${productId}`, JSON.stringify(productData));
            
            updateCartCounter();
        }
    });
    
    return card;
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
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
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
        const performSearch = () => {
            currentPage = 1;
            currentFilters.query = searchInput.value.trim();
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
    document.getElementById('search-input').value = '';
    
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
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
        }
    }
}

export { createProductCard, generateStars, truncateText };