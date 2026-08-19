/**
 * admin.js — Lógica y Controladores del Panel de Administración (MERCA TO-DO)
 */

(function () {
    'use strict';

    let currentAdmin = null;
    let cachedStats = null;
    let cachedOrders = [];
    let cachedSalesReport = [];
    let cachedProducts = [];
    let cachedUsers = [];
    let cachedAudit = [];

    // --- Helpers de Moneda y Formato (Pesos Colombianos - COP) ---
    function formatMoney(n) {
        var num = Number(n) || 0;
        var copValue = num >= 10000 ? Math.round(num) : Math.round(num * 4000);
        return '$ ' + copValue.toLocaleString('es-CO');
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('admin-toast');
        const msgSpan = document.getElementById('toast-message');
        const icon = document.getElementById('toast-icon');

        toast.className = 'admin-toast is-show toast-' + type;
        msgSpan.textContent = message;

        if (type === 'success') icon.className = 'fa-solid fa-circle-check';
        else if (type === 'error') icon.className = 'fa-solid fa-circle-exclamation';
        else icon.className = 'fa-solid fa-circle-info';

        setTimeout(() => {
            toast.classList.remove('is-show');
        }, 3500);
    }

    // --- Modales ---
    window.adminCloseModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('is-active');
    };

    window.adminOpenModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('is-active');
    };

    // --- Navegación entre Paneles ---
    window.adminSwitchPanel = function (panelId) {
        const navBtns = document.querySelectorAll('.nav-btn[data-panel]');
        const panels = document.querySelectorAll('.admin-panel');
        const topbarTitle = document.getElementById('topbar-view-title');

        const titleMap = {
            'dashboard': 'Dashboard General',
            'sales-report': 'Reporte de Ventas por Usuario',
            'orders': 'Gestión de Pedidos',
            'stock': 'Control de Stock e Inventario',
            'products': 'Catálogo de Productos',
            'users': 'Gestión de Usuarios y Roles',
            'audit': 'Auditoría del Sistema'
        };

        navBtns.forEach(btn => {
            if (btn.dataset.panel === panelId) btn.classList.add('is-active');
            else btn.classList.remove('is-active');
        });

        panels.forEach(p => {
            if (p.id === 'panel-' + panelId) p.classList.add('is-active');
            else p.classList.remove('is-active');
        });

        if (topbarTitle && titleMap[panelId]) {
            topbarTitle.textContent = titleMap[panelId];
        }
    };

    // --- Inicialización y Autenticación ---
    async function initAdmin() {
        try {
            const user = await mercaCheckSession();
            if (!user || !['adminpro', 'adminjunior'].includes(user.rol)) {
                document.getElementById('access-denied-screen').style.display = 'block';
                document.getElementById('admin-app').style.display = 'none';
                return;
            }

            currentAdmin = user;
            document.getElementById('access-denied-screen').style.display = 'none';
            document.getElementById('admin-app').style.display = 'flex';

            // Configurar perfil en sidebar
            document.getElementById('admin-name').textContent = user.nombre || 'Administrador';
            const initials = (user.nombre || 'AD').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            document.getElementById('admin-avatar').textContent = initials;

            const isPro = user.rol === 'adminpro';
            document.getElementById('badge-sidebar-role').textContent = isPro ? 'ADMIN PRO' : 'ADMIN JR';
            document.getElementById('admin-role-label').innerHTML = isPro ?
                '<i class="fa-solid fa-crown"></i> AdminPro' :
                '<i class="fa-solid fa-shield"></i> Admin Junior';

            const topbarPill = document.getElementById('topbar-role-pill');
            topbarPill.className = 'topbar-badge-role ' + (isPro ? 'role-adminpro' : 'role-adminjunior');
            document.getElementById('topbar-role-text').textContent = isPro ? 'Admin Pro' : 'Admin Junior';

            // Si es Admin Junior, ocultar secciones exclusivas de Admin Pro
            if (!isPro) {
                document.querySelectorAll('.sec-adminpro-only').forEach(el => el.style.display = 'none');
                const btnCreateProd = document.getElementById('btn-open-create-product');
                if (btnCreateProd) btnCreateProd.style.display = 'none';
            }

            setupEvents();
            await loadAllData();

        } catch (err) {
            console.error('Error inicializando panel admin:', err);
            document.getElementById('access-denied-screen').style.display = 'block';
        }
    }

    // --- Carga de Datos desde API ---
    async function loadAllData() {
        await Promise.all([
            fetchDashboardStats(),
            fetchSalesReport(),
            fetchOrders(),
            fetchProducts(),
            currentAdmin.rol === 'adminpro' ? fetchUsers() : Promise.resolve(),
            currentAdmin.rol === 'adminpro' ? fetchAuditLogs() : Promise.resolve(),
        ]);
    }

    // 1. Dashboard Stats
    async function fetchDashboardStats() {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.ok) {
                cachedStats = data.stats;
                renderDashboardStats(data.stats);
            }
        } catch (err) {
            console.error('Error cargando stats:', err);
        }
    }

    function renderDashboardStats(stats) {
        document.getElementById('kpi-sales').textContent = formatMoney(stats.total_ventas);
        document.getElementById('kpi-orders').textContent = stats.total_pedidos;
        document.getElementById('kpi-ticket').textContent = `Ticket prom: ${formatMoney(stats.ticket_promedio)}`;
        document.getElementById('kpi-users').textContent = stats.total_usuarios;
        document.getElementById('kpi-stock').textContent = stats.total_stock + ' unidades';
        document.getElementById('kpi-low-stock').textContent = `${stats.low_stock_count} productos con stock bajo (≤10)`;
    }

    // 2. Reporte de Ventas por Usuario
    async function fetchSalesReport() {
        try {
            const res = await fetch('/api/admin/reports/sales-by-user');
            const data = await res.json();
            if (data.ok) {
                cachedSalesReport = data.report || [];
                renderSalesReport(cachedSalesReport);
            }
        } catch (err) {
            console.error('Error cargando reporte de ventas:', err);
        }
    }

    function renderSalesReport(users) {
        const tbody = document.getElementById('tbody-sales-report');
        const countSpan = document.getElementById('sales-report-count');
        if (countSpan) countSpan.textContent = `${users.length} usuarios registrados`;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No se encontraron usuarios ni registros de venta.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const roleClass = u.rol === 'adminpro' ? 'role-adminpro' : (u.rol === 'adminjunior' ? 'role-adminjunior' : 'role-user');
            const lastDate = u.ultimo_pedido_fecha ? new Date(u.ultimo_pedido_fecha).toLocaleDateString('es-CO') : 'Sin compras';
            return `
                <tr>
                    <td><strong>#${u.id}</strong></td>
                    <td><strong>${escapeHtml(u.nombre)}</strong></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><span class="role-tag ${roleClass}">${escapeHtml(u.rol)}</span></td>
                    <td><span style="font-weight: 700; color: var(--text);">${u.total_pedidos} pedidos</span></td>
                    <td><strong style="color: var(--success); font-size: 0.95rem;">${formatMoney(u.total_gastado)}</strong></td>
                    <td><span style="color: var(--text-muted); font-size: 0.85rem;">${lastDate}</span></td>
                </tr>
            `;
        }).join('');
    }

    // 3. Gestión de Pedidos
    async function fetchOrders() {
        try {
            const res = await fetch('/api/admin/orders');
            const data = await res.json();
            if (data.ok) {
                cachedOrders = data.orders || [];
                renderOrders(cachedOrders);
                renderRecentOrders(cachedOrders.slice(0, 5));
                const badge = document.getElementById('badge-orders-count');
                if (badge) badge.textContent = cachedOrders.length;
            }
        } catch (err) {
            console.error('Error cargando pedidos:', err);
        }
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('tbody-all-orders');
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay pedidos registrados con estos filtros.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const statusClass = 'status-' + o.estado;
            const itemsCount = (o.items || []).reduce((acc, item) => acc + (item.qty || 1), 0);
            return `
                <tr>
                    <td><strong style="color: var(--orange);">${escapeHtml(o.codigo)}</strong></td>
                    <td>
                        <div><strong>${escapeHtml(o.usuario_nombre || 'Cliente')}</strong></div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(o.usuario_email || '')}</div>
                    </td>
                    <td><span style="font-size: 0.85rem;">${escapeHtml(o.fechaLabel || o.fecha)}</span></td>
                    <td><span>${itemsCount} unid. (${(o.items || []).length} prods)</span></td>
                    <td><strong>${formatMoney(o.total)}</strong></td>
                    <td><span class="status-badge ${statusClass}">${escapeHtml(o.estado)}</span></td>
                    <td>
                        <select class="status-select-inline" onchange="adminUpdateOrderStatus(${o.id}, this.value)">
                            <option value="confirmado" ${o.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                            <option value="enviado" ${o.estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                            <option value="entregado" ${o.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                            <option value="cancelado" ${o.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </td>
                    <td>
                        <button type="button" class="action-btn" title="Ver Detalle" onclick="adminViewOrderDetail(${o.id})">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderRecentOrders(orders) {
        const tbody = document.getElementById('tbody-recent-orders');
        if (!tbody) return;
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay pedidos recientes.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><strong style="color: var(--orange);">${escapeHtml(o.codigo)}</strong></td>
                <td>${escapeHtml(o.usuario_nombre || 'Cliente')}</td>
                <td>${escapeHtml(o.fechaLabel || o.fecha)}</td>
                <td><strong>${formatMoney(o.total)}</strong></td>
                <td><span class="status-badge status-${o.estado}">${escapeHtml(o.estado)}</span></td>
                <td>
                    <button type="button" class="action-btn" onclick="adminViewOrderDetail(${o.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.adminUpdateOrderStatus = async function (orderId, newStatus) {
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newStatus })
            });
            const data = await res.json();
            if (data.ok) {
                showToast(`Pedido #${orderId} actualizado a estado '${newStatus}'`);
                await fetchOrders();
                await fetchDashboardStats();
            } else {
                showToast(data.error || 'Error actualizando estado', 'error');
            }
        } catch (err) {
            showToast('Error de conexión con el servidor', 'error');
        }
    };

    window.adminViewOrderDetail = function (orderId) {
        const order = cachedOrders.find(o => o.id === orderId);
        if (!order) return;

        document.getElementById('modal-order-title').textContent = `Pedido ${order.codigo}`;
        const body = document.getElementById('modal-order-body');

        const itemsHtml = (order.items || []).map(it => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-200);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${it.img || 'img/cat-tecnologia-dell-laptop.jpg'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                    <div>
                        <strong style="font-size: 0.9rem;">${escapeHtml(it.nombre)}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${it.qty} unidad(es) &times; ${formatMoney(it.precio)}</div>
                    </div>
                </div>
                <strong>${formatMoney(it.precio * it.qty)}</strong>
            </div>
        `).join('');

        body.innerHTML = `
            <div style="margin-bottom: 16px; background: var(--gray-100); padding: 14px; border-radius: 8px;">
                <p><strong>Cliente:</strong> ${escapeHtml(order.usuario_nombre || 'N/A')} (${escapeHtml(order.usuario_email || 'N/A')})</p>
                <p><strong>Fecha de compra:</strong> ${escapeHtml(order.fechaLabel || order.fecha)}</p>
                <p><strong>Estado logístico:</strong> <span class="status-badge status-${order.estado}">${escapeHtml(order.estado)}</span></p>
            </div>
            <h4 style="font-size: 0.95rem; margin-bottom: 10px; font-weight: 700;">Artículos del Pedido</h4>
            <div style="max-height: 240px; overflow-y: auto; margin-bottom: 16px;">
                ${itemsHtml}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 2px solid var(--gray-200);">
                <span style="font-size: 1.1rem; font-weight: 700;">Total del Pedido:</span>
                <span style="font-size: 1.3rem; font-weight: 800; color: var(--orange);">${formatMoney(order.total)}</span>
            </div>
        `;

        adminOpenModal('modal-order-details');
    };

    // 4. Control de Stock & Productos
    async function fetchProducts() {
        try {
            const res = await fetch('/api/admin/products');
            const data = await res.json();
            if (data.ok) {
                cachedProducts = data.products || [];
                renderStockTable(cachedProducts);
                renderProductsTable(cachedProducts);
            }
        } catch (err) {
            console.error('Error cargando productos:', err);
        }
    }

    function renderStockTable(products) {
        const tbody = document.getElementById('tbody-stock-table');
        if (!tbody) return;
        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay productos registrados en inventario.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const isLow = p.stock <= 10;
            return `
                <tr>
                    <td>
                        <div class="product-cell">
                            <img src="${p.img || 'img/cat-tecnologia-dell-laptop.jpg'}" class="product-cell-img">
                            <div class="product-cell-info">
                                <strong>${escapeHtml(p.nombre)}</strong>
                                <span>${escapeHtml(p.marca || 'MERCA TO-DO')}</span>
                            </div>
                        </div>
                    </td>
                    <td><code>${escapeHtml(p.sku || '')}</code></td>
                    <td><span style="text-transform: capitalize; font-weight: 600;">${escapeHtml(p.categoria)}</span></td>
                    <td><strong>${p.precio_label || formatMoney(p.precio)}</strong></td>
                    <td><strong style="font-size: 1.1rem;">${p.stock}</strong></td>
                    <td>
                        <span class="stock-badge ${isLow ? 'stock-low' : 'stock-ok'}">
                            ${isLow ? '<i class="fa-solid fa-triangle-exclamation"></i> Stock Bajo' : '<i class="fa-solid fa-check"></i> Normal'}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <button type="button" class="action-btn" title="Restar 5" onclick="adminAdjustStock('${p.id}', ${Math.max(0, p.stock - 5)})">-5</button>
                            <button type="button" class="action-btn" title="Sumar 10" onclick="adminAdjustStock('${p.id}', ${p.stock + 10})">+10</button>
                            <button type="button" class="action-btn" title="Modificar exacto" onclick="adminPromptStock('${p.id}', ${p.stock})"><i class="fa-solid fa-pen"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderProductsTable(products) {
        const tbody = document.getElementById('tbody-products-table');
        if (!tbody) return;
        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay productos en el catálogo.</td></tr>';
            return;
        }

        const isPro = currentAdmin && currentAdmin.rol === 'adminpro';

        tbody.innerHTML = products.map(p => `
            <tr>
                <td>
                    <div class="product-cell">
                        <img src="${p.img || 'img/cat-tecnologia-dell-laptop.jpg'}" class="product-cell-img">
                        <div class="product-cell-info">
                            <strong>${escapeHtml(p.nombre)}</strong>
                            <span>${escapeHtml(p.marca || 'MERCA TO-DO')}</span>
                        </div>
                    </div>
                </td>
                <td><code>${escapeHtml(p.sku || '')}</code></td>
                <td><span style="text-transform: capitalize; font-weight: 600;">${escapeHtml(p.categoria)}</span></td>
                <td><span>${escapeHtml(p.subcategoria || 'General')}</span></td>
                <td><strong>${p.precio_label || formatMoney(p.precio)}</strong></td>
                <td><span>${p.stock} uds</span></td>
                <td>
                    ${isPro ? `
                        <div class="table-actions">
                            <button type="button" class="action-btn" title="Editar" onclick="adminEditProduct('${p.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button type="button" class="action-btn btn-delete" title="Eliminar" onclick="adminDeleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">Solo lectura</span>'}
                </td>
            </tr>
        `).join('');
    }

    window.adminAdjustStock = async function (productId, newStock) {
        try {
            const res = await fetch(`/api/admin/products/${productId}/stock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            const data = await res.json();
            if (data.ok) {
                showToast(`Stock actualizado a ${newStock} unidades`);
                await fetchProducts();
                await fetchDashboardStats();
            } else {
                showToast(data.error || 'Error ajustando stock', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };

    window.adminPromptStock = function (productId, currentStock) {
        const val = window.prompt(`Ingresa el nuevo stock para este producto (Actual: ${currentStock}):`, currentStock);
        if (val !== null) {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 0) {
                adminAdjustStock(productId, num);
            } else {
                showToast('Número de stock inválido', 'error');
            }
        }
    };

    window.adminEditProduct = function (productId) {
        const p = cachedProducts.find(x => x.id === productId);
        if (!p) return;

        document.getElementById('modal-product-title').textContent = 'Editar Producto';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-nombre').value = p.nombre || '';
        document.getElementById('prod-categoria').value = p.categoria || 'tecnologia';
        document.getElementById('prod-subcategoria').value = p.subcategoria || '';
        document.getElementById('prod-precio').value = p.precio || '';
        document.getElementById('prod-stock').value = p.stock || 0;
        document.getElementById('prod-sku').value = p.sku || '';
        document.getElementById('prod-marca').value = p.marca || '';
        document.getElementById('prod-img').value = p.img || '';
        document.getElementById('prod-descripcion').value = p.descripcion || '';

        adminOpenModal('modal-product-form');
    };

    window.adminDeleteProduct = async function (productId) {
        if (!window.confirm('¿Estás seguro de eliminar este producto del catálogo? Esta acción quedará registrada en auditoría.')) return;

        try {
            const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.ok) {
                showToast('Producto eliminado exitosamente');
                await fetchProducts();
                await fetchDashboardStats();
            } else {
                showToast(data.error || 'Error eliminando producto', 'error');
            }
        } catch (err) {
            showToast('Error de red', 'error');
        }
    };

    // 5. Gestión de Usuarios y Roles (Solo AdminPro)
    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.ok) {
                cachedUsers = data.users || [];
                renderUsersTable(cachedUsers);
            }
        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    }

    function renderUsersTable(users) {
        const tbody = document.getElementById('tbody-users-table');
        if (!tbody) return;
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No se encontraron usuarios.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const roleClass = u.rol === 'adminpro' ? 'role-adminpro' : (u.rol === 'adminjunior' ? 'role-adminjunior' : 'role-user');
            const isSelf = currentAdmin && currentAdmin.id === u.id;
            return `
                <tr>
                    <td><strong>#${u.id}</strong></td>
                    <td><strong>${escapeHtml(u.nombre)}</strong> ${isSelf ? '<span style="font-size:0.7rem; color: var(--orange); font-weight:700;">(Tú)</span>' : ''}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><span style="font-size: 0.85rem;">${u.created_at || 'N/A'}</span></td>
                    <td><span style="font-weight: 700;">${u.total_pedidos}</span></td>
                    <td><span class="role-tag ${roleClass}">${escapeHtml(u.rol)}</span></td>
                    <td>
                        <select class="filter-select" style="padding: 4px 8px; font-size: 0.8rem;" ${isSelf ? 'disabled title="No puedes cambiar tu propio rol de AdminPro"' : ''} onchange="adminUpdateUserRole(${u.id}, this.value, '${escapeHtml(u.nombre)}')">
                            <option value="user" ${u.rol === 'user' ? 'selected' : ''}>Usuario</option>
                            <option value="adminjunior" ${u.rol === 'adminjunior' ? 'selected' : ''}>Admin Junior</option>
                            <option value="adminpro" ${u.rol === 'adminpro' ? 'selected' : ''}>Admin Pro</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.adminUpdateUserRole = async function (userId, newRole, userName) {
        if (!window.confirm(`¿Confirmas asignar el rol '${newRole}' al usuario ${userName}?`)) {
            await fetchUsers();
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol: newRole })
            });
            const data = await res.json();
            if (data.ok) {
                showToast(`Rol de ${userName} actualizado a '${newRole}'`);
                await fetchUsers();
                await fetchAuditLogs();
            } else {
                showToast(data.error || 'Error cambiando rol', 'error');
                await fetchUsers();
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };

    // 6. Auditoría del Sistema (Solo AdminPro)
    async function fetchAuditLogs(action = '') {
        try {
            const url = action ? `/api/admin/audit?accion=${encodeURIComponent(action)}` : '/api/admin/audit';
            const res = await fetch(url);
            const data = await res.json();
            if (data.ok) {
                cachedAudit = data.logs || [];
                renderAuditTable(cachedAudit);
            }
        } catch (err) {
            console.error('Error cargando auditoría:', err);
        }
    }

    function renderAuditTable(logs) {
        const tbody = document.getElementById('tbody-audit-table');
        if (!tbody) return;
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No hay registros de auditoría disponibles.</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr>
                <td><span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(l.fecha)}</span></td>
                <td><strong>${escapeHtml(l.usuario_nombre || 'Sistema')}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${escapeHtml(l.usuario_email || '')})</span></td>
                <td><code style="background: var(--gray-100); padding: 2px 6px; border-radius: 4px; font-weight: 700; color: var(--dark);">${escapeHtml(l.accion)}</code></td>
                <td><span style="font-size: 0.9rem;">${escapeHtml(l.detalles || '')}</span></td>
                <td><span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(l.ip || '127.0.0.1')}</span></td>
            </tr>
        `).join('');
    }

    // --- Configuración de Eventos UI y Filtros ---
    function setupEvents() {
        // Navegación de sidebar
        document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => {
            btn.addEventListener('click', () => {
                adminSwitchPanel(btn.dataset.panel);
            });
        });

        // Botón Global Refresh
        document.getElementById('btn-global-refresh').addEventListener('click', async () => {
            showToast('Actualizando datos...', 'info');
            await loadAllData();
            showToast('Panel actualizado exitosamente');
        });

        // Botón Cerrar Sesión
        document.getElementById('btn-admin-logout').addEventListener('click', async () => {
            await mercaClearSession();
            window.location.href = 'Login.html';
        });

        // Buscador Reporte de Ventas
        const searchSales = document.getElementById('search-sales-user');
        if (searchSales) {
            searchSales.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                const filtered = cachedSalesReport.filter(u =>
                    (u.nombre && u.nombre.toLowerCase().includes(term)) ||
                    (u.email && u.email.toLowerCase().includes(term))
                );
                renderSalesReport(filtered);
            });
        }

        // Exportar Reporte a CSV
        const btnExportCsv = document.getElementById('btn-export-sales-csv');
        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => {
                if (!cachedSalesReport || cachedSalesReport.length === 0) {
                    showToast('No hay datos para exportar', 'info');
                    return;
                }
                let csv = 'ID,Nombre,Email,Rol,Pedidos,Total_Gastado,Ultima_Compra\n';
                cachedSalesReport.forEach(u => {
                    csv += `"${u.id}","${u.nombre}","${u.email}","${u.rol}",${u.total_pedidos},${u.total_gastado},"${u.ultimo_pedido_fecha || ''}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte_ventas_mercatodo_${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Reporte exportado en formato CSV');
            });
        }

        // Buscador y Filtro de Pedidos
        const searchOrders = document.getElementById('search-orders');
        const filterOrderStatus = document.getElementById('filter-order-status');

        function filterOrdersList() {
            const term = (searchOrders ? searchOrders.value : '').toLowerCase().trim();
            const status = (filterOrderStatus ? filterOrderStatus.value : '').toLowerCase();

            const filtered = cachedOrders.filter(o => {
                const matchTerm = !term || (o.codigo && o.codigo.toLowerCase().includes(term)) || (o.usuario_nombre && o.usuario_nombre.toLowerCase().includes(term));
                const matchStatus = !status || o.estado.toLowerCase() === status;
                return matchTerm && matchStatus;
            });
            renderOrders(filtered);
        }

        if (searchOrders) searchOrders.addEventListener('input', filterOrdersList);
        if (filterOrderStatus) filterOrderStatus.addEventListener('change', filterOrdersList);

        // Buscador y Filtro de Stock
        const searchStock = document.getElementById('search-stock');
        const filterStockCat = document.getElementById('filter-stock-category');

        function filterStockList() {
            const term = (searchStock ? searchStock.value : '').toLowerCase().trim();
            const cat = (filterStockCat ? filterStockCat.value : '').toLowerCase();

            const filtered = cachedProducts.filter(p => {
                const matchTerm = !term || (p.nombre && p.nombre.toLowerCase().includes(term)) || (p.sku && p.sku.toLowerCase().includes(term));
                const matchCat = !cat || (p.categoria && p.categoria.toLowerCase() === cat);
                return matchTerm && matchCat;
            });
            renderStockTable(filtered);
        }

        if (searchStock) searchStock.addEventListener('input', filterStockList);
        if (filterStockCat) filterStockCat.addEventListener('change', filterStockList);

        // Buscador y Filtro de Productos (Catálogo)
        const searchProducts = document.getElementById('search-products');
        const filterProductCat = document.getElementById('filter-product-cat');

        function filterProductsList() {
            const term = (searchProducts ? searchProducts.value : '').toLowerCase().trim();
            const cat = (filterProductCat ? filterProductCat.value : '').toLowerCase();

            const filtered = cachedProducts.filter(p => {
                const matchTerm = !term || (p.nombre && p.nombre.toLowerCase().includes(term)) || (p.sku && p.sku.toLowerCase().includes(term));
                const matchCat = !cat || (p.categoria && p.categoria.toLowerCase() === cat);
                return matchTerm && matchCat;
            });
            renderProductsTable(filtered);
        }

        if (searchProducts) searchProducts.addEventListener('input', filterProductsList);
        if (filterProductCat) filterProductCat.addEventListener('change', filterProductsList);

        // Buscador y Filtro de Usuarios
        const searchUsers = document.getElementById('search-users');
        const filterUserRole = document.getElementById('filter-user-role');

        function filterUsersList() {
            const term = (searchUsers ? searchUsers.value : '').toLowerCase().trim();
            const role = (filterUserRole ? filterUserRole.value : '').toLowerCase();

            const filtered = cachedUsers.filter(u => {
                const matchTerm = !term || (u.nombre && u.nombre.toLowerCase().includes(term)) || (u.email && u.email.toLowerCase().includes(term));
                const matchRole = !role || (u.rol && u.rol.toLowerCase() === role);
                return matchTerm && matchRole;
            });
            renderUsersTable(filtered);
        }

        if (searchUsers) searchUsers.addEventListener('input', filterUsersList);
        if (filterUserRole) filterUserRole.addEventListener('change', filterUsersList);

        // Filtro de Auditoría
        const filterAuditAction = document.getElementById('filter-audit-action');
        if (filterAuditAction) {
            filterAuditAction.addEventListener('change', (e) => {
                fetchAuditLogs(e.target.value);
            });
        }

        // Modal Agregar Producto
        const btnOpenCreateProduct = document.getElementById('btn-open-create-product');
        if (btnOpenCreateProduct) {
            btnOpenCreateProduct.addEventListener('click', () => {
                document.getElementById('form-product').reset();
                document.getElementById('prod-id').value = '';
                document.getElementById('modal-product-title').textContent = 'Agregar Nuevo Producto';
                adminOpenModal('modal-product-form');
            });
        }

        // Formulario Guardar Producto
        const formProduct = document.getElementById('form-product');
        if (formProduct) {
            formProduct.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('prod-id').value;
                const data = {
                    nombre: document.getElementById('prod-nombre').value,
                    categoria: document.getElementById('prod-categoria').value,
                    subcategoria: document.getElementById('prod-subcategoria').value,
                    precio: parseFloat(document.getElementById('prod-precio').value),
                    stock: parseInt(document.getElementById('prod-stock').value, 10),
                    sku: document.getElementById('prod-sku').value,
                    marca: document.getElementById('prod-marca').value,
                    img: document.getElementById('prod-img').value || 'img/cat-tecnologia-dell-laptop.jpg',
                    descripcion: document.getElementById('prod-descripcion').value
                };

                try {
                    let res;
                    if (id) {
                        res = await fetch(`/api/admin/products/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                    } else {
                        res = await fetch('/api/admin/products', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                    }

                    const json = await res.json();
                    if (json.ok) {
                        showToast(id ? 'Producto actualizado' : 'Producto agregado al catálogo');
                        adminCloseModal('modal-product-form');
                        await fetchProducts();
                        await fetchDashboardStats();
                    } else {
                        showToast(json.error || 'Error guardando producto', 'error');
                    }
                } catch (err) {
                    showToast('Error de comunicación', 'error');
                }
            });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Inicializar al cargar
    document.addEventListener('DOMContentLoaded', initAdmin);

})();
