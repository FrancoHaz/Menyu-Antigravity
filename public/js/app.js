document.addEventListener('DOMContentLoaded', () => {
    // ID de la hoja de cálculo
    let SPREADSHEET_ID = '18qBF32T7bum4Ko08ztwuQYvdpzp-Q2G54xuYTGTq6rI';
    let GID_CONFIG = '0', GID_CATEGORIAS = '535518884', GID_MENU = '668878274', GID_ALERGENOS = '1303455890';

    // === Overrides via URL params ===
    const __params = new URLSearchParams(location.search);
    if (__params.has('id')) SPREADSHEET_ID = __params.get('id');
    if (__params.has('gid_config')) GID_CONFIG = __params.get('gid_config');
    if (__params.has('gid_categorias')) GID_CATEGORIAS = __params.get('gid_categorias');
    if (__params.has('gid_menu')) GID_MENU = __params.get('gid_menu');
    if (__params.has('gid_alergenos')) GID_ALERGENOS = __params.get('gid_alergenos');
    const __CACHE_BUST = `v=${Date.now()}`; // Use timestamp for cache busting

    let menuData = [], categories = [], config = {}, cart = [];
    let currentLang = 'es', currentCategory = '';
    let allergens = [], allergenMap = {};

    // DOM Elements
    const restaurantName = document.getElementById('restaurant-name');
    const restaurantTagline = document.getElementById('restaurant-tagline');
    const announcement = document.getElementById('announcement');
    const marqueeTrack = document.getElementById('marquee-track');
    const ann1 = document.getElementById('announcement-text-1');
    const ann2 = document.getElementById('announcement-text-2');

    const categorySlider = document.getElementById('category-slider');
    const categorySliderWrapper = document.querySelector('.category-slider-wrapper');
    const menuItemsContainer = document.getElementById('menu-items');
    const orderButton = document.getElementById('order-button');
    const orderCount = document.getElementById('order-count');

    // Side Drawer Elements
    const sideDrawer = document.getElementById('side-drawer');
    const sideDrawerOverlay = document.getElementById('side-drawer-overlay');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerContent = document.getElementById('drawer-content');
    const drawerTotal = document.getElementById('drawer-total');

    const languageToggle = document.querySelector('.language-toggle');

    // Cookie Banner Elements
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieAccept = document.getElementById('cookie-accept');
    const cookieReject = document.getElementById('cookie-reject');

    // --- Data Loading via Netlify Function ---
    async function loadSheetData(gid) {
        // Use the Netlify function as a proxy
        // We pass the GID as a query parameter
        const url = `/.netlify/functions/get-data?gid=${gid}&${__CACHE_BUST}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error fetching sheet GID ${gid}`);
            return await response.text();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function parseCSV(csvText) {
        if (!csvText) return [];
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
        return lines.slice(1).map(line => {
            const values = line.match(/(\".*?\"|[^\",]+)(?=\s*,|\s*$)/g) || [];
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] ? values[index].trim().replace(/\"/g, '') : '';
                return obj;
            }, {});
        });
    }

    function isTruthy(val) {
        if (val === undefined || val === null) return false;
        const s = String(val).trim().toLowerCase();
        return ['sí', 'si', 'true', '1', 'yes', 'y', 'x', 'ok'].includes(s);
    }

    function toNumber(val) {
        if (val === undefined || val === null) return 0;
        const s = String(val).replace(',', '.').replace(/[^\d.]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    function getByLang(baseKey, fallback = '') {
        const valEN = config[`${baseKey}_en`];
        const valES = config[`${baseKey}_es`];
        const valBase = config[baseKey];

        if (currentLang === 'en' && (valEN || '').trim()) {
            return valEN.trim();
        }
        return (valES || valBase || '').trim() || fallback;
    }

    // --- Rendering ---
    function renderConfig() {
        const name = getByLang('nombre_restaurante', 'Mi Restaurante');
        restaurantName.textContent = name;
        restaurantTagline.textContent = getByLang('eslogan', 'Comida deliciosa');
        document.title = name;

        const annText = getByLang('anuncio', '').trim();
        if (annText) {
            announcement.style.display = 'block';
            ann1.textContent = annText;
            ann2.textContent = annText;
            requestAnimationFrame(updateMarqueeDuration);
        } else {
            announcement.style.display = 'none';
        }

        restaurantName.classList.remove('animate-title');
        restaurantTagline.classList.remove('animate-tagline');
        void restaurantName.offsetWidth;
        restaurantName.classList.add('animate-title');
        restaurantTagline.classList.add('animate-tagline');

        // Update Footer Info
        updateFooterInfo();
    }

    function updateFooterInfo() {
        const address = getByLang('direccion', 'Calle Principal 123');
        const phone = getByLang('telefono', '+34 123 456 789');
        const email = getByLang('email', 'info@restaurante.com');
        const hours = getByLang('horario', 'Lun-Dom: 13:00 - 23:00');

        document.getElementById('footer-address').textContent = address;
        document.getElementById('footer-phone').textContent = phone;
        document.getElementById('footer-email').textContent = email;
        document.getElementById('footer-hours').textContent = hours;

        // Social Links
        const igUrl = (config.instagram_url || '').trim();
        const fbUrl = (config.facebook_url || '').trim();
        const socialContainer = document.getElementById('footer-social');

        let socialHtml = '';
        if (igUrl) socialHtml += `<a href="${igUrl}" target="_blank"><i class="fab fa-instagram"></i></a>`;
        if (fbUrl) socialHtml += `<a href="${fbUrl}" target="_blank"><i class="fab fa-facebook"></i></a>`;

        socialContainer.innerHTML = socialHtml;
    }

    function renderCategoryLinks() {
        const linksRoot = document.getElementById('category-links');
        if (!linksRoot) return;
        const items = [];
        const whatsappUrl = (config.ask_to_pedido_url || config.ask_to_pedido || '').trim();
        const igUrl = (config.instagram_url || '').trim();
        const mapsUrl = (config.google_maps_url || config.maps_url || '').trim();
        const reviewUrl = (config.google_review_url || '').trim();

        const addItem = (url, iconClass, label) => {
            if (!url) return;
            items.push(`<a class="category-link-item" href="${url}" target="_blank" rel="noopener"><i class="${iconClass}"></i><span>${label}</span></a>`);
        };

        const t = {
            es: { whatsapp: 'Pedir por WhatsApp', instagram: 'Instagram', maps: 'Cómo llegar', reviews: 'Dejar reseña' },
            en: { whatsapp: 'Order via WhatsApp', instagram: 'Instagram', maps: 'Get directions', reviews: 'Leave a review' }
        }[currentLang] || { whatsapp: 'WhatsApp', instagram: 'Instagram', maps: 'Maps', reviews: 'Reviews' };

        addItem(whatsappUrl, 'fa-brands fa-whatsapp', t.whatsapp);
        addItem(igUrl, 'fa-brands fa-instagram', t.instagram);
        addItem(mapsUrl, 'fa-solid fa-map-location-dot', t.maps);
        addItem(reviewUrl, 'fa-brands fa-google', t.reviews);

        linksRoot.innerHTML = items.join('');
    }

    function updateMarqueeDuration() {
        if (announcement.style.display === 'none') return;
        const trackWidth = marqueeTrack.scrollWidth;
        const container = announcement.querySelector('.announcement-inner');
        const pxPerSec = 100;
        const distance = trackWidth / 2 + 48;
        const duration = Math.max(8, Math.min(40, distance / pxPerSec));
        marqueeTrack.style.animation = `marquee-loop ${duration}s linear infinite`;
    }

    function renderCategories() {
        categorySlider.innerHTML = categories.map(cat => {
            const name = cat[`Nombre_${currentLang}`] || cat.Nombre_es || cat.Nombre_en || '';
            const isActive = cat.ID === currentCategory ? 'active' : '';
            return `<div class=\"category-item ${isActive}\" data-category=\"${cat.ID}\">${name}</div>`;
        }).join('');
    }

    function buildAllergenBadges(idsCsv) {
        if (!idsCsv) return '';
        const ids = String(idsCsv).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (ids.length === 0) return '';
        const MAX_BADGES = 6;
        const visible = ids.slice(0, MAX_BADGES);
        const hiddenCount = ids.length - visible.length;
        const badges = visible.map(id => {
            const meta = allergenMap[id];
            if (!meta) return '';
            const label = (currentLang === 'en' ? (meta.en || meta.es) : (meta.es || meta.en)) || meta.abbr;
            const style = meta.color ? `style=\"background:${meta.color};\"` : '';
            const iconHtml = meta.icon ? `<i class=\"fa-solid ${meta.icon}\"></i>` : '•';
            return `<span class=\"allergen-badge\" aria-label=\"${label}\" data-tip=\"${label}\" ${style}>${iconHtml}</span>`;
        }).join('');
        const more = hiddenCount > 0 ? `<span class=\"badge-more\">+${hiddenCount}</span>` : '';
        return `<div class=\"allergen-row\">${badges}${more}</div>`;
    }

    function renderMenuItems() {
        const cat = __categoriesById[currentCategory] || {};
        const catCollapsible = isTruthy(cat.Desplegable);

        const filteredItems = menuData.filter(item => {
            const rawCat = String(item.Categoria || '').trim();
            let itemCatId = rawCat;
            if (!__categoriesById[itemCatId]) {
                const byName = __categoriesByName[rawCat.toLowerCase()];
                if (byName) itemCatId = String(byName.ID || '').trim();
            }
            const catOk = itemCatId === currentCategory;
            const activeOk = isTruthy(item.Activo);
            return catOk && activeOk;
        });

        if (filteredItems.length === 0) {
            menuItemsContainer.innerHTML = `<p class="empty-cart">No hay platos disponibles.</p>`;
            document.getElementById('category-links').innerHTML = '';
            return;
        }

        menuItemsContainer.innerHTML = filteredItems.map(item => {
            const name = item[`Nombre_${currentLang}`] || item.Nombre_es || item.Nombre_en || '';
            const desc = item[`Descripcion_${currentLang}`] || item.Descripcion_es || item.Descripcion_en || '';
            const isChefRecommendation = (item.Chef || '').trim().toLowerCase() === 'sí';
            const cartItem = cart.find(ci => ci.ID === item.ID);
            const quantity = cartItem ? cartItem.quantity : 0;

            const expandedClass = isChefRecommendation ? 'expanded' : (catCollapsible ? '' : '');
            const nonCollapsibleClass = (!catCollapsible && !isChefRecommendation) ? 'non-collapsible' : '';

            const hasImage = item.Imagen && item.Imagen.trim() !== '';
            const hasDescription = desc && desc.trim() !== '';
            const hasAllergens = item.Alergenos && item.Alergenos.trim() !== '';
            const isCompact = !hasImage && !hasDescription && !hasAllergens && !isChefRecommendation;
            const compactClass = isCompact ? 'compact' : '';

            const descriptionHTML = `<div class="item-description-wrapper"><p class="item-description">${desc}</p></div>`;
            const allergensHTML = buildAllergenBadges(item.Alergenos || '');
            const quantityControlsHTML = `<div class="quantity-controls"><button class="quantity-btn minus-btn" data-id="${item.ID}">-</button><span class="quantity-display">${quantity}</span><button class="quantity-btn plus-btn" data-id="${item.ID}">+</button></div>`;
            const addBtnHTML = `<button class="add-btn" data-id="${item.ID}">+</button>`;
            const chefTag = isChefRecommendation ? `<span class="chef-recommendation-tag"><i class="fas fa-star"></i> Chef</span>` : '';

            return `<div class="menu-item ${expandedClass} ${nonCollapsibleClass} ${compactClass}" data-id="${item.ID}">
                  ${hasImage ? `<div class="item-image"><img src="${item.Imagen}" alt="${name}"></div>` : ''}
                  <div class="item-content">
                    <div class="item-info">
                      <h3>${name}${chefTag}</h3>
                      ${descriptionHTML}
                      ${allergensHTML}
                    </div>
                    <div class="item-right">
                      <span class="item-price">${item.Precio ? item.Precio + ' €' : ''}</span>
                      <div class="item-controls">
                        ${quantity > 0 ? quantityControlsHTML : addBtnHTML}
                      </div>
                    </div>
                  </div>
                </div>`;
        }).join('');

        renderCategoryLinks();
    }

    function updateCartItemUI(itemId) {
        const menuItem = menuItemsContainer.querySelector(`.menu-item[data-id="${itemId}"]`);
        if (!menuItem) return;
        const cartItem = cart.find(ci => ci.ID === itemId);
        const quantity = cartItem ? cartItem.quantity : 0;
        const controlsContainer = menuItem.querySelector('.item-controls');
        if (quantity > 0) {
            controlsContainer.innerHTML = `<div class="quantity-controls"><button class="quantity-btn minus-btn" data-id="${itemId}">-</button><span class="quantity-display">${quantity}</span><button class="quantity-btn plus-btn" data-id="${itemId}">+</button></div>`;
        } else {
            controlsContainer.innerHTML = `<button class="add-btn" data-id="${itemId}">+</button>`;
        }
    }

    function addToCart(itemId) {
        const itemData = menuData.find(item => item.ID === itemId);
        if (!itemData) return;
        const existingItem = cart.find(ci => ci.ID === itemId);
        if (existingItem) existingItem.quantity++;
        else cart.push({ ...itemData, quantity: 1 });
        updateCartUI(itemId);
    }

    function removeFromCart(itemId) {
        const itemIndex = cart.findIndex(item => item.ID === itemId);
        if (itemIndex > -1) {
            cart[itemIndex].quantity > 1 ? cart[itemIndex].quantity-- : cart.splice(itemIndex, 1);
        }
        updateCartUI(itemId);
    }

    function updateCartUI(itemId) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        orderCount.textContent = totalItems;
        orderButton.classList.toggle('visible', totalItems > 0);
        if (itemId) updateCartItemUI(itemId);

        // If drawer is open, update it too
        if (sideDrawer.classList.contains('open')) {
            renderDrawerContent();
        }
    }

    // --- Side Drawer Logic ---
    function openDrawer() {
        renderDrawerContent();
        sideDrawer.classList.add('open');
        sideDrawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeDrawer() {
        sideDrawer.classList.remove('open');
        sideDrawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function renderDrawerContent() {
        drawerTitle.textContent = currentLang === 'en' ? 'Your Order' : 'Tu Pedido';

        if (cart.length === 0) {
            drawerContent.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>${currentLang === 'en' ? 'Your order is empty' : 'Tu pedido está vacío'}</p></div>`;
            drawerTotal.textContent = '0,00 €';
            return;
        }

        const groupedByCategory = {};
        let total = 0;

        cart.forEach(item => {
            const categoryId = item.Categoria;
            if (!groupedByCategory[categoryId]) groupedByCategory[categoryId] = [];
            groupedByCategory[categoryId].push(item);
            total += toNumber(item.Precio) * item.quantity;
        });

        const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
            const catA = categories.find(c => c.ID === a);
            const catB = categories.find(c => c.ID === b);
            return (catA ? parseInt(catA.Orden || 99) : 99) - (catB ? parseInt(catB.Orden || 99) : 99);
        });

        let html = '';
        sortedCategories.forEach(categoryId => {
            const category = categories.find(c => c.ID === categoryId);
            const categoryName = category ? (category[`Nombre_${currentLang}`] || category.Nombre_es) : '';

            html += `<div class="order-category-header">${categoryName}</div>`;

            groupedByCategory[categoryId].forEach(item => {
                const name = item[`Nombre_${currentLang}`] || item.Nombre_es || item.Nombre_en || '';
                const itemTotal = (toNumber(item.Precio) * item.quantity).toFixed(2).replace('.', ',');

                html += `<div class="order-item">
                      <div class="order-item-info">
                        <h4>${name} x${item.quantity}</h4>
                      </div>
                      <div class="order-item-price">${itemTotal} €</div>
                    </div>`;
            });
        });

        drawerContent.innerHTML = html;
        drawerTotal.textContent = total.toFixed(2).replace('.', ',') + ' €';
    }

    // --- Cookie Banner Logic ---
    function initCookieBanner() {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setTimeout(() => {
                cookieBanner.classList.add('show');
            }, 2000);
        }
    }

    function handleCookieConsent(accepted) {
        localStorage.setItem('cookie_consent', accepted ? 'accepted' : 'rejected');
        cookieBanner.classList.remove('show');
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        languageToggle.addEventListener('click', e => {
            const btn = e.target.closest('.language-btn');
            if (btn && !btn.classList.contains('active')) {
                currentLang = btn.dataset.lang;
                languageToggle.querySelector('.active').classList.remove('active');
                btn.classList.add('active');
                renderAll();
            }
        });

        // Cart / Drawer events
        orderButton.addEventListener('click', openDrawer);
        closeDrawerBtn.addEventListener('click', closeDrawer);
        sideDrawerOverlay.addEventListener('click', closeDrawer);

        // Cookie events
        cookieAccept.addEventListener('click', () => handleCookieConsent(true));
        cookieReject.addEventListener('click', () => handleCookieConsent(false));

        setupCategoryListeners();
        setupMenuItemListeners();
        window.addEventListener('resize', () => {
            updateMarqueeDuration();
        });
    }

    function setupCategoryListeners() {
        categorySlider.addEventListener('click', e => {
            const categoryButton = e.target.closest('.category-item');
            if (categoryButton) {
                currentCategory = categoryButton.dataset.category;
                categoryButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                renderCategories();
                renderMenuItems();
            }
        });
        categorySlider.addEventListener('scroll', () => {
            const isAtEnd = categorySlider.scrollWidth - categorySlider.scrollLeft - categorySlider.clientWidth < 1;
            categorySliderWrapper.classList.toggle('scrolled-end', isAtEnd);
        });
    }

    function setupMenuItemListeners() {
        menuItemsContainer.addEventListener('click', e => {
            const controls = e.target.closest('.item-controls');
            const menuItem = e.target.closest('.menu-item');
            if (!menuItem) return;
            const itemId = menuItem.dataset.id;
            const itemData = menuData.find(i => i.ID === itemId);
            const isChefRecommendation = (itemData.Chef || '').trim().toLowerCase() === 'sí';
            const cat = __categoriesById[currentCategory] || {};
            const catCollapsible = isTruthy(cat.Desplegable);

            if (controls) {
                const button = e.target.closest('.add-btn, .plus-btn, .minus-btn');
                if (!button) return;
                if (button.matches('.add-btn, .plus-btn')) {
                    addToCart(itemId);
                    if ((catCollapsible || isChefRecommendation) && !menuItem.classList.contains('expanded')) {
                        menuItem.classList.add('expanded');
                    }
                } else if (button.matches('.minus-btn')) {
                    removeFromCart(itemId);
                    const cartItem = cart.find(ci => ci.ID === itemId);
                    if (!cartItem && !isChefRecommendation && catCollapsible) menuItem.classList.remove('expanded');
                }
                return;
            }

            if (!catCollapsible && !isChefRecommendation) return;
            menuItem.classList.toggle('expanded');
        });
    }

    function wireAllergenBadgeEvents() {
        const root = document;
        const showTip = (badge) => {
            if (!badge) return;
            badge.setAttribute('data-show', '1');
            clearTimeout(badge._tipTimer);
            badge._tipTimer = setTimeout(() => badge.removeAttribute('data-show'), 1300);
        };
        const ensureOpen = (badge) => {
            const card = badge.closest('.menu-item');
            if (!card) return;
            if (!card.classList.contains('expanded')) {
                card.classList.add('expanded');
            }
            card.setAttribute('data-sticky-open', '1');
        };
        const handler = (e) => {
            const target = e.target.closest && e.target.closest('.allergen-badge');
            if (!target) return;
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            if (e.stopPropagation) e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            showTip(target);
            ensureOpen(target);
        };
        ['pointerdown', 'touchstart', 'click'].forEach(evt => {
            root.addEventListener(evt, handler, { capture: true, passive: false });
        });
    }

    function renderAll() {
        renderConfig();
        renderCategories();
        renderMenuItems();
    }

    async function initApp() {
        const [configCSV, categoriesCSV, menuCSV, allergensCSV] = await Promise.all([
            loadSheetData(GID_CONFIG), loadSheetData(GID_CATEGORIAS), loadSheetData(GID_MENU), loadSheetData(GID_ALERGENOS)
        ]);

        config = parseCSV(configCSV).reduce((acc, { Clave, Valor }) => { if (Clave) acc[Clave] = Valor; return acc; }, {});
        categories = parseCSV(categoriesCSV).sort((a, b) => parseInt(a.Orden || 99) - parseInt(b.Orden || 99));
        window.__categoriesById = Object.create(null);
        window.__categoriesByName = Object.create(null);
        categories.forEach(c => {
            if (!c) return;
            const id = String(c.ID || '').trim();
            const nameES = String(c.Nombre_es || '').trim().toLowerCase();
            const nameEN = String(c.Nombre_en || '').trim().toLowerCase();
            if (id) __categoriesById[id] = c;
            if (nameES) __categoriesByName[nameES] = c;
            if (nameEN) __categoriesByName[nameEN] = c;
        });
        menuData = parseCSV(menuCSV);
        allergens = parseCSV(allergensCSV);
        allergenMap = allergens.reduce((acc, row) => {
            if (row.ID) {
                const id = String(row.ID).trim().toUpperCase();
                acc[id] = { id, es: row.Nombre_es || '', en: row.Nombre_en || '', abbr: row.Abrev || id, icon: row.Icono || '', color: row.Color || '' };
            }
            return acc;
        }, {});

        if (categories.length > 0) currentCategory = categories[0].ID;
        setupEventListeners();
        wireAllergenBadgeEvents();
        initCookieBanner();
        renderAll();
    }

    initApp();
});
