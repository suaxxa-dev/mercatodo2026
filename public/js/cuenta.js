(function () {
    'use strict';

    var MERCA_PROFILE_KEY = 'mercaTodoProfileDemo';

    var profileWrap,
        profileTrigger,
        profileMenu,
        cartWrap,
        cartTrigger,
        cartPanel,
        trigger,
        panel,
        input;

    var SEARCH_DB = [];
    var DEMO_ORDERS = [];

    function mercaEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function mercaMoney(n) {
        var num = Number(n) || 0;
        var copValue = num >= 1000 ? Math.round(num) : Math.round(num * 4000);
        return '$ ' + copValue.toLocaleString('es-CO');
    }

    function buildSearchDb() {
        SEARCH_DB = [];
        if (typeof PRODUCTOS_FICHA === 'undefined') return;
        Object.keys(PRODUCTOS_FICHA).forEach(function (id) {
            var d = PRODUCTOS_FICHA[id];
            SEARCH_DB.push({
                nombre: d.titulo,
                precio: d.precioLabel,
                img: d.imagenes[0],
                sku: 'SKU-' + id.replace(/-/g, '').slice(0, 12).toUpperCase(),
                cat: d.breadcrumb[0],
                id: id,
            });
        });
    }

    function mercaRefreshCartUI() {
        var badge = document.getElementById('cart-badge-count');
        var body = document.getElementById('cart-panel-body');
        var session = mercaGetSession();
        var totalQty = session ? mercaCartTotalQty() : 0;
        if (badge) {
            badge.textContent = totalQty > 99 ? '99+' : String(totalQty);
            badge.classList.toggle('cart-badge--empty', totalQty === 0);
        }
        if (!body) return;
        if (!session) {
            body.innerHTML =
                '<p class="cart-msg">Inicia sesión para añadir productos y ver tu carrito por cuenta.</p>' +
                '<a href="Login.html" class="cart-login-link">Iniciar sesión</a>';
            return;
        }
        var cart = mercaGetCart();
        if (cart.length === 0) {
            body.innerHTML =
                '<p class="cart-empty">Tu carrito está vacío.</p>' +
                '<p class="cart-hint">Añade productos desde el catálogo.</p>';
            return;
        }
        var lines = cart
            .map(function (item) {
                var q = item.qty || 1;
                var lineTotal = item.precioNum * q;
                var id = mercaEsc(item.id);
                return (
                    '<div class="cart-line">' +
                    '<div class="cart-line-img"><img src="' +
                    mercaEsc(item.img) +
                    '" alt=""></div>' +
                    '<div class="cart-line-main">' +
                    '<p class="cart-line-name">' +
                    mercaEsc(item.nombre) +
                    '</p>' +
                    '<p class="cart-line-meta">' +
                    mercaEsc(item.precioLabel) +
                    ' c/u</p>' +
                    '<div class="cart-line-actions">' +
                    '<div class="cart-qty">' +
                    '<button type="button" class="cart-qty-btn" data-cart-minus="' +
                    id +
                    '" aria-label="Quitar una unidad">−</button>' +
                    '<span class="cart-qty-num">' +
                    q +
                    '</span>' +
                    '<button type="button" class="cart-qty-btn" data-cart-plus="' +
                    id +
                    '" aria-label="Añadir una unidad">+</button>' +
                    '</div>' +
                    '<button type="button" class="cart-remove" data-cart-remove="' +
                    id +
                    '" aria-label="Eliminar producto"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div>' +
                    '<div class="cart-line-total">' +
                    mercaMoney(lineTotal) +
                    '</div></div>'
                );
            })
            .join('');
        body.innerHTML =
            '<div class="cart-lines">' +
            lines +
            '</div>' +
            '<div class="cart-footer">' +
            '<span>Subtotal</span>' +
            '<strong>' +
            mercaMoney(mercaCartSubtotalNum()) +
            '</strong>' +
            '</div>' +
            mercaCartProceedHtml();
    }

    function mercaRenderProfileMenu() {
        var body = document.getElementById('profile-menu-body');
        var session = mercaGetSession();
        if (!session) {
            body.innerHTML =
                '<p class="profile-dropdown-hint">Accede para comprar y ver tus pedidos</p>' +
                '<a href="Login.html" class="profile-dropdown-login" role="menuitem">Iniciar sesión</a>' +
                '<a href="ayuda.html" class="profile-dropdown-help profile-dropdown-help--guest" role="menuitem">Centro de información y ayuda</a>';
            mercaRefreshCartUI();
            return;
        }
        var esc = mercaEsc;
        var safeName = esc(session.nombre);
        var safeEmail = esc(session.email);
        var initials = session.nombre
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (w) {
                return w[0];
            })
            .join('')
            .toUpperCase();
        body.innerHTML =
            '<div class="profile-dropdown-user">' +
            '<div class="profile-dropdown-avatar" aria-hidden="true">' +
            initials +
            '</div>' +
            '<div class="profile-dropdown-identity">' +
            '<p class="profile-dropdown-greeting">Hola, <strong>' +
            safeName +
            '</strong></p>' +
            '<p class="profile-dropdown-email">' +
            safeEmail +
            '</p></div></div>' +
            (typeof mercaGetAdminLinkHtml === 'function' ? mercaGetAdminLinkHtml(session) : '') +
            '<a href="cuenta.html" class="profile-dropdown-account" role="menuitem">Mi cuenta</a>' +
            '<p class="profile-dropdown-hint profile-dropdown-hint--logged">Tu sesión está activa en esta pestaña.</p>' +
            '<a href="ayuda.html" class="profile-dropdown-help" role="menuitem">Centro de información y ayuda</a>' +
            '<button type="button" class="profile-dropdown-logout" id="profile-logout" role="menuitem">Cerrar sesión</button>';
        document.getElementById('profile-logout').addEventListener('click', function () {
            mercaClearSession();
            window.location.href = 'Mainpage.html';
        });
        mercaRefreshCartUI();
    }

    function initNav() {
        profileWrap = document.querySelector('.profile-dropdown-wrap');
        profileTrigger = document.getElementById('profile-trigger');
        profileMenu = document.getElementById('profile-menu');
        cartWrap = document.querySelector('.cart-dropdown-wrap');
        cartTrigger = document.getElementById('cart-trigger');
        cartPanel = document.getElementById('cart-panel');
        trigger = document.getElementById('search-trigger');
        panel = document.getElementById('search-panel');
        input = document.getElementById('main-search');

        mercaRenderProfileMenu();

        cartPanel.addEventListener('click', async function (e) {
            var rm = e.target.closest('[data-cart-remove]');
            if (rm) {
                e.stopPropagation();
                await mercaRemoveCartLine(rm.getAttribute('data-cart-remove'));
                mercaRefreshCartUI();
                return;
            }
            var minus = e.target.closest('[data-cart-minus]');
            var plus = e.target.closest('[data-cart-plus]');
            var id = minus ? minus.getAttribute('data-cart-minus') : plus ? plus.getAttribute('data-cart-plus') : null;
            if (!id) return;
            e.stopPropagation();
            var cart = mercaGetCart();
            var item = cart.find(function (x) {
                return x.id === id;
            });
            if (!item) return;
            var q = item.qty || 1;
            if (minus) q -= 1;
            else q += 1;
            await mercaSetCartLineQty(id, q);
            mercaRefreshCartUI();
        });

        cartTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = cartPanel.classList.toggle('is-open');
            cartWrap.classList.toggle('menu-open', open);
            cartTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                panel.classList.remove('active');
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
                mercaRefreshCartUI();
            }
        };

        trigger.onclick = function (e) {
            e.stopPropagation();
            panel.classList.toggle('active');
            if (panel.classList.contains('active')) {
                input.focus();
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        profileTrigger.onclick = function (e) {
            e.stopPropagation();
            var open = profileMenu.classList.toggle('is-open');
            profileWrap.classList.toggle('menu-open', open);
            profileTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                panel.classList.remove('active');
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };

        // Motor de búsqueda nativo (search-ui.js)
        MercaSearch.init({
            inputId:       'main-search',
            containerId:   'results-container',
            skuDisplayId:  'sku-display',
            catsDisplayId: 'cats-display',
            sectionsClass: '.search-section',
        });

        document.onclick = function (e) {
            if (!panel.contains(e.target) && e.target !== trigger) panel.classList.remove('active');
            if (!profileWrap.contains(e.target)) {
                profileMenu.classList.remove('is-open');
                profileWrap.classList.remove('menu-open');
                profileTrigger.setAttribute('aria-expanded', 'false');
            }
            if (!cartWrap.contains(e.target)) {
                cartPanel.classList.remove('is-open');
                cartWrap.classList.remove('menu-open');
                cartTrigger.setAttribute('aria-expanded', 'false');
            }
        };
    }

    function stepperHtml(estado) {
        var e = (estado || '').toLowerCase();
        var s1 = 'cuenta-step is-done';
        var s2 = 'cuenta-step';
        var s3 = 'cuenta-step';
        var s4 = 'cuenta-step';
        var i3 = 'fa-truck-fast';
        var i4 = 'fa-house-chimney';
        if (e === 'entregado') {
            s2 = 'cuenta-step is-done';
            s3 = 'cuenta-step is-done';
            s4 = 'cuenta-step is-done';
            i3 = 'fa-circle-check';
            i4 = 'fa-circle-check';
        } else if (e === 'enviado') {
            s2 = 'cuenta-step is-done';
            s3 = 'cuenta-step is-current';
        } else if (e === 'procesando') {
            s2 = 'cuenta-step is-current';
        } else {
            s1 = 'cuenta-step is-done';
        }
        return (
            '<div class="cuenta-stepper">' +
            '<div class="' +
            s1 +
            '"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>Confirmado</div>' +
            '<div class="' +
            s2 +
            '"><i class="fa-solid ' +
            (s2.indexOf('is-done') >= 0 ? 'fa-circle-check' : 'fa-circle') +
            '" aria-hidden="true"></i>Procesando</div>' +
            '<div class="' +
            s3 +
            '"><i class="fa-solid ' +
            i3 +
            '" aria-hidden="true"></i>Enviado</div>' +
            '<div class="' +
            s4 +
            '"><i class="fa-solid ' +
            i4 +
            '" aria-hidden="true"></i>Entregado</div>' +
            '</div>'
        );
    }

    function renderUltimoPedido() {
        var el = document.getElementById('cuenta-ultimo-pedido');
        if (!el) return;
        if (!DEMO_ORDERS || DEMO_ORDERS.length === 0) {
            el.innerHTML = '<p style="color:#64748b; padding:15px;">No tienes pedidos recientes.</p>';
            return;
        }
        var o = DEMO_ORDERS[0];
        el.innerHTML =
            '<div class="cuenta-order-card-head">' +
            '<div>' +
            '<h3><i class="fa-solid fa-box" aria-hidden="true"></i> Último pedido</h3>' +
            '<p class="cuenta-order-meta">ID del pedido: <strong>#' +
            mercaEsc(o.codigo) +
            '</strong><br>Fecha: <strong>' +
            mercaEsc(o.fechaLabel || o.fecha || '') +
            '</strong><br>Total: <strong>' +
            mercaMoney(o.total) +
            '</strong></p></div>' +
            '<button type="button" class="btn-cuenta-orange" data-go-pedido>Ver detalle</button></div>' +
            stepperHtml(o.estado);
    }

    function badgeClass(estado) {
        var e = (estado || '').toLowerCase();
        if (e === 'entregado') return 'cuenta-badge cuenta-badge--entregado';
        if (e === 'enviado') return 'cuenta-badge cuenta-badge--enviado';
        if (e === 'procesando') return 'cuenta-badge cuenta-badge--procesando';
        return 'cuenta-badge cuenta-badge--confirmado';
    }

    function badgeLabel(estado) {
        var e = (estado || '').toLowerCase();
        if (e === 'entregado') return 'Entregado';
        if (e === 'enviado') return 'Enviado';
        if (e === 'procesando') return 'Procesando';
        return 'Confirmado';
    }

    function filterOrders() {
        var estEl = document.getElementById('filtro-estado');
        var fechaEl = document.getElementById('filtro-fecha');
        var codEl = document.getElementById('filtro-codigo');

        var est = estEl ? estEl.value : 'todos';
        var fecha = fechaEl ? fechaEl.value : 'todos';
        var cod = codEl ? (codEl.value || '').trim().toUpperCase() : '';

        return DEMO_ORDERS.filter(function (o, idx) {
            if (est !== 'todos' && o.estado !== est) return false;
            if (fecha === 'mes' && idx > 0) return false;
            if (cod && o.codigo && o.codigo.toUpperCase().indexOf(cod) === -1) return false;
            return true;
        });
    }

    function renderPedidos() {
        var list = document.getElementById('pedidos-list');
        if (!list) return;
        var rows = filterOrders();
        if (rows.length === 0) {
            list.innerHTML = '<p style="color:#64748b; padding:20px;">No hay pedidos que coincidan con los filtros.</p>';
            return;
        }
        list.innerHTML = rows
            .map(function (o, i) {
                var itemsHtml = (o.items || [])
                    .map(function (it) {
                        return (
                            '<div class="cuenta-pedido-item">' +
                            '<img src="' +
                            mercaEsc(it.img || 'img/cat-tecnologia-dell-laptop.jpg') +
                            '" alt="">' +
                            '<span>' +
                            mercaEsc(it.nombre) +
                            '</span></div>'
                        );
                    })
                    .join('');
                return (
                    '<article class="cuenta-pedido-card">' +
                    '<div class="cuenta-pedido-top">' +
                    '<div><h3>Pedido ' +
                    (i + 1) +
                    ' #' +
                    mercaEsc(o.codigo) +
                    '</h3>' +
                    '<p>Fecha: <strong>' +
                    mercaEsc(o.fechaLabel || o.fecha || '') +
                    '</strong> · Total: <strong>' +
                    mercaMoney(o.total) +
                    '</strong></p></div>' +
                    '<span class="' +
                    badgeClass(o.estado) +
                    '">' +
                    badgeLabel(o.estado) +
                    '</span></div>' +
                    '<div class="cuenta-pedido-items">' +
                    itemsHtml +
                    '</div>' +
                    '<div class="cuenta-pedido-actions">' +
                    '<button type="button" class="btn-cuenta-outline" data-demo="rastreo">Rastrear pedido</button>' +
                    '<button type="button" class="btn-cuenta-outline" data-demo="factura">Ver factura</button>' +
                    '</div></article>'
                );
            })
            .join('');
    }

    function showPanel(panelId, pushHash) {
        document.querySelectorAll('.cuenta-nav-btn[data-panel]').forEach(function (b) {
            var on = b.getAttribute('data-panel') === panelId;
            b.classList.toggle('is-active', on);
            if (on) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });
        document.querySelectorAll('.cuenta-panel').forEach(function (p) {
            p.classList.toggle('is-visible', p.id === 'panel-' + panelId);
        });

        if (panelId === 'direcciones') loadDirecciones();
        if (panelId === 'pedidos') renderPedidos();
        if (panelId === 'datos') loadProfileForm();

        if (pushHash !== false) {
            if (history.replaceState) history.replaceState(null, '', '#' + panelId);
            else window.location.hash = panelId;
        }
    }

    function loadProfileForm() {
        var s = mercaGetSession();
        if (!s) return;
        var nomEl = document.getElementById('dato-nombre');
        var emailEl = document.getElementById('dato-email');
        if (nomEl) nomEl.value = s.nombre || '';
        if (emailEl) emailEl.value = s.email || '';

        // Cargar datos extra desde la API
        fetch('/api/profile').then(function (res) { return res.json(); }).then(function (profile) {
            if (profile) {
                var telEl = document.getElementById('dato-tel');
                var nacEl = document.getElementById('dato-nac');
                if (telEl && profile.telefono) telEl.value = profile.telefono;
                if (nacEl && profile.nacimiento) nacEl.value = profile.nacimiento;
            }
        }).catch(function () {});
    }

    async function saveProfileForm() {
        var telEl = document.getElementById('dato-tel');
        var nacEl = document.getElementById('dato-nac');
        var nomEl = document.getElementById('dato-nombre');

        var tel = telEl ? telEl.value.trim() : '';
        var nac = nacEl ? nacEl.value : '';
        var nom = nomEl ? nomEl.value.trim() : '';

        try {
            var res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nom, telefono: tel, nacimiento: nac }),
            });
            var data = await res.json();
            if (data.ok && data.profile && nom) {
                mercaSetSession({ nombre: nom, email: data.profile.email, rol: data.profile.rol });
            }
        } catch {}

        var now = new Date();
        var d = String(now.getDate()).padStart(2, '0');
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var actEl = document.getElementById('dato-ultima-act');
        if (actEl) actEl.textContent = d + '/' + m + '/' + now.getFullYear();

        var ok = document.getElementById('dato-save-ok');
        if (ok) {
            ok.classList.add('is-visible');
            window.setTimeout(function () {
                ok.classList.remove('is-visible');
            }, 4000);
        }
        mercaRenderProfileMenu();
    }

    function bindCuentaUi() {
        document.querySelectorAll('.cuenta-nav-btn[data-panel]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showPanel(btn.getAttribute('data-panel'));
            });
        });

        document.querySelectorAll('.cuenta-quick-card[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                showPanel(a.getAttribute('data-go'));
            });
        });

        var ultimo = document.getElementById('cuenta-ultimo-pedido');
        if (ultimo) {
            ultimo.addEventListener('click', function (e) {
                if (e.target.closest('[data-go-pedido]')) {
                    showPanel('pedidos');
                }
            });
        }

        var fe = document.getElementById('filtro-estado');
        var ff = document.getElementById('filtro-fecha');
        var fc = document.getElementById('filtro-codigo');
        if (fe) fe.addEventListener('change', renderPedidos);
        if (ff) ff.addEventListener('change', renderPedidos);
        if (fc) fc.addEventListener('input', renderPedidos);

        var logoutSide = document.getElementById('cuenta-logout-side');
        if (logoutSide) {
            logoutSide.addEventListener('click', function () {
                mercaClearSession();
                window.location.href = 'Mainpage.html';
            });
        }

        var formDatos = document.getElementById('form-datos-personales');
        if (formDatos) {
            formDatos.addEventListener('submit', function (e) {
                e.preventDefault();
                saveProfileForm();
            });
        }

        // Formulario Contraseña
        var passForm = document.getElementById('form-password');
        if (passForm) {
            var passMsg = document.getElementById('pass-msg');
            if (!passMsg) {
                passMsg = document.createElement('p');
                passMsg.id = 'pass-msg';
                passMsg.className = 'cuenta-save-ok';
                passMsg.setAttribute('role', 'status');
                passMsg.style.display = 'none';
                passForm.appendChild(passMsg);
            }

            passForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var actual = document.getElementById('pass-actual').value;
                var nueva = document.getElementById('pass-nueva').value;
                var nueva2 = document.getElementById('pass-nueva2').value;
                passMsg.style.display = 'none';
                passMsg.className = 'cuenta-save-ok';
                passMsg.style.color = '';
                passMsg.style.background = '';
                passMsg.style.borderColor = '';

                if (!actual || !nueva || !nueva2) {
                    passMsg.textContent = 'Completa todos los campos de contraseña.';
                    passMsg.style.display = 'block';
                    passMsg.style.color = '#e53e3e';
                    passMsg.style.background = '#fff5f5';
                    passMsg.style.borderColor = '#e53e3e';
                    return;
                }
                if (nueva !== nueva2) {
                    passMsg.textContent = 'Las contraseñas nuevas no coinciden.';
                    passMsg.style.display = 'block';
                    passMsg.style.color = '#e53e3e';
                    passMsg.style.background = '#fff5f5';
                    passMsg.style.borderColor = '#e53e3e';
                    return;
                }
                var btn = passForm.querySelector('[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Guardando…';
                }
                try {
                    var res = await fetch('/api/auth/password', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword: actual, newPassword: nueva }),
                    });
                    var data = await res.json();
                    if (data.ok) {
                        passMsg.textContent = '✓ ' + (data.message || 'Contraseña actualizada.');
                        passMsg.classList.add('is-visible');
                        passMsg.style.display = 'block';
                        passForm.reset();
                        window.setTimeout(function () {
                            passMsg.classList.remove('is-visible');
                            passMsg.style.display = 'none';
                        }, 4000);
                    } else {
                        passMsg.textContent = data.error || 'Error al cambiar la contraseña.';
                        passMsg.style.display = 'block';
                        passMsg.style.color = '#e53e3e';
                        passMsg.style.background = '#fff5f5';
                        passMsg.style.borderColor = '#e53e3e';
                    }
                } catch {
                    passMsg.textContent = 'Error de red. Intenta de nuevo.';
                    passMsg.style.display = 'block';
                    passMsg.style.color = '#e53e3e';
                }
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Actualizar contraseña';
                }
            });
        }

        // Direcciones
        var dirModal = document.getElementById('dir-modal');
        var dirList = document.getElementById('dir-list');
        var dirForm = document.getElementById('form-direccion');
        var dirErr = document.getElementById('dir-form-error');

        function openDirModal(dir) {
            if (!dirModal) return;
            var title = document.getElementById('dir-modal-title');
            if (title) title.textContent = dir ? 'Editar dirección' : 'Nueva dirección';
            document.getElementById('dir-edit-id').value = dir ? dir.id : '';
            document.getElementById('dir-alias').value = dir ? (dir.alias || '') : '';
            document.getElementById('dir-nombre').value = dir ? (dir.nombre || '') : '';
            document.getElementById('dir-calle').value = dir ? (dir.calle || '') : '';
            document.getElementById('dir-ciudad').value = dir ? (dir.ciudad || '') : '';
            document.getElementById('dir-estado').value = dir ? (dir.estado || '') : '';
            document.getElementById('dir-cp').value = dir ? (dir.codigoPostal || '') : '';
            document.getElementById('dir-predet').checked = dir ? !!dir.predeterminada : false;
            if (dirErr) { dirErr.textContent = ''; dirErr.style.display = 'none'; }
            dirModal.hidden = false;
            document.getElementById('dir-nombre').focus();
        }

        function closeDirModal() {
            if (dirModal) dirModal.hidden = true;
            if (dirForm) dirForm.reset();
        }

        if (document.getElementById('btn-add-dir')) {
            document.getElementById('btn-add-dir').addEventListener('click', function () { openDirModal(null); });
        }
        if (document.getElementById('dir-modal-close')) {
            document.getElementById('dir-modal-close').addEventListener('click', closeDirModal);
        }
        if (document.getElementById('dir-modal-cancel')) {
            document.getElementById('dir-modal-cancel').addEventListener('click', closeDirModal);
        }
        if (dirModal) {
            dirModal.addEventListener('click', function (e) {
                if (e.target === dirModal) closeDirModal();
            });
        }

        // Delegación de clicks en tarjetas de dirección
        if (dirList) {
            dirList.addEventListener('click', async function (e) {
                var editBtn = e.target.closest('.dir-btn-edit');
                var delBtn = e.target.closest('.dir-btn-del');

                if (editBtn) {
                    var id = parseInt(editBtn.getAttribute('data-dir-id'), 10);
                    var resDirs = await fetch('/api/addresses');
                    var dirs = await resDirs.json();
                    var dir = dirs.find(function (d) { return d.id === id; });
                    if (dir) openDirModal(dir);
                }
                if (delBtn) {
                    if (!confirm('¿Eliminar esta dirección?')) return;
                    var delId = delBtn.getAttribute('data-dir-id');
                    var resD = await fetch('/api/addresses/' + delId, { method: 'DELETE' });
                    var dataD = await resD.json();
                    if (dataD.ok) renderDirecciones(dataD.addresses);
                    else alert(dataD.error || 'No se pudo eliminar la dirección.');
                }
            });
        }

        if (dirForm) {
            dirForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                if (dirErr) { dirErr.textContent = ''; dirErr.style.display = 'none'; }
                var editId = document.getElementById('dir-edit-id').value;
                var body = {
                    alias:          document.getElementById('dir-alias').value.trim(),
                    nombre:         document.getElementById('dir-nombre').value.trim(),
                    calle:          document.getElementById('dir-calle').value.trim(),
                    ciudad:         document.getElementById('dir-ciudad').value.trim(),
                    estado:         document.getElementById('dir-estado').value.trim(),
                    codigoPostal:   document.getElementById('dir-cp').value.trim(),
                    predeterminada: document.getElementById('dir-predet').checked,
                };
                var submitBtn = document.getElementById('dir-modal-submit');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Guardando…';
                }
                try {
                    var url = editId ? '/api/addresses/' + editId : '/api/addresses';
                    var method = editId ? 'PUT' : 'POST';
                    var res = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    var data = await res.json();
                    if (data.ok) {
                        renderDirecciones(data.addresses);
                        closeDirModal();
                    } else {
                        if (dirErr) {
                            dirErr.textContent = data.error || 'Error al guardar.';
                            dirErr.style.display = 'block';
                        }
                    }
                } catch {
                    if (dirErr) { dirErr.textContent = 'Error de red.'; dirErr.style.display = 'block'; }
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Guardar dirección';
                }
            });
        }

        var plist = document.getElementById('pedidos-list');
        if (plist) {
            plist.addEventListener('click', function (e) {
                var t = e.target.closest('[data-demo]');
                if (!t) return;
                var k = t.getAttribute('data-demo');
                window.alert(
                    k === 'rastreo'
                        ? 'Demo: seguimiento del envío con el transportista.'
                        : 'Demo: descarga o vista de factura en PDF.'
                );
            });
        }
    }

    function renderDirecciones(dirs) {
        var dirList = document.getElementById('dir-list');
        if (!dirList) return;
        if (!dirs || dirs.length === 0) {
            dirList.innerHTML = '<p style="color:#64748b;grid-column:1/-1;">Aún no tienes direcciones guardadas. ¡Añade una!</p>';
            return;
        }
        dirList.innerHTML = dirs.map(function (d) {
            var badges = d.predeterminada
                ? '<span class="cuenta-tag cuenta-tag--green">Predeterminada</span>'
                : '<span class="cuenta-tag cuenta-tag--gray">Envío</span>';
            var aliasText = d.alias ? '<strong>' + mercaEsc(d.alias) + '</strong><br>' : '';
            return (
                '<div class="cuenta-dir-card">' +
                '<h4>' + mercaEsc(d.nombre) + '</h4>' +
                aliasText +
                '<p>' + mercaEsc(d.calle) + '<br>' + mercaEsc(d.ciudad) +
                (d.estado ? ', ' + mercaEsc(d.estado) : '') +
                (d.codigoPostal ? ', ' + mercaEsc(d.codigoPostal) : '') + '</p>' +
                '<div class="cuenta-dir-badges">' + badges + '</div>' +
                '<div class="cuenta-dir-actions">' +
                '<button type="button" class="dir-btn-edit" data-dir-id="' + d.id + '" aria-label="Editar dirección"><i class="fa-solid fa-pencil"></i></button>' +
                '<button type="button" class="dir-btn-del" data-dir-id="' + d.id + '" aria-label="Eliminar dirección"><i class="fa-solid fa-trash"></i></button>' +
                '</div></div>'
            );
        }).join('');
    }

    async function loadDirecciones() {
        try {
            var res = await fetch('/api/addresses');
            var dirs = await res.json();
            renderDirecciones(dirs);
        } catch { renderDirecciones([]); }
    }

    function applyHash() {
        var h = (window.location.hash || '').replace(/^#/, '').toLowerCase();
        var allowed = ['resumen', 'pedidos', 'direcciones', 'datos', 'seguridad'];
        if (allowed.indexOf(h) !== -1) showPanel(h, false);
        else showPanel('resumen', false);
    }

    function mercaIniciarSimulacion() {
        if (!DEMO_ORDERS || DEMO_ORDERS.length === 0) return;
        var pedido = null;
        for (var i = 0; i < DEMO_ORDERS.length; i++) {
            if (DEMO_ORDERS[i].estado === 'confirmado') {
                pedido = DEMO_ORDERS[i];
                break;
            }
        }
        if (!pedido) return;

        var orderId = pedido.id;
        var estados = ['procesando', 'enviado', 'entregado'];
        var tiempos = [15000, 35000, 60000];

        estados.forEach(function (nuevoEstado, i) {
            window.setTimeout(function () {
                fetch('/api/orders/' + orderId + '/status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado }),
                }).catch(function () {});

                pedido.estado = nuevoEstado;
                renderUltimoPedido();
                renderPedidos();
            }, tiempos[i]);
        });
    }

    async function init() {
        if (!mercaGetSession()) {
            window.location.href = 'Login.html';
            return;
        }
        var s = mercaGetSession();
        var greetEl = document.getElementById('cuenta-greet');
        if (greetEl) greetEl.textContent = '¡Hola, ' + s.nombre + '!';

        // Cargar pedidos desde la API
        try {
            var res = await fetch('/api/orders');
            DEMO_ORDERS = await res.json();
        } catch { DEMO_ORDERS = []; }

        await mercaFetchCart();
        buildSearchDb();
        initNav();
        renderUltimoPedido();
        renderPedidos();
        loadProfileForm();
        bindCuentaUi();
        await loadDirecciones();

        // Si es administrador, agregar tarjeta de acceso al panel admin
        if (s && ['adminpro', 'adminjunior'].includes(s.rol)) {
            var grid = document.querySelector('.cuenta-quick-grid');
            if (grid && !document.getElementById('quick-card-admin')) {
                var adminCard = document.createElement('a');
                adminCard.id = 'quick-card-admin';
                adminCard.href = 'admin.html';
                adminCard.className = 'cuenta-quick-card';
                adminCard.style.border = '2px solid #ea580c';
                adminCard.style.background = '#fff7ed';
                adminCard.innerHTML = '<i class="fa-solid fa-crown" style="color:#ea580c;" aria-hidden="true"></i><strong style="color:#c2410c;">Panel Administrador</strong><span>Gestión de ventas, stock y pedidos</span>';
                grid.prepend(adminCard);
            }
        }

        applyHash();
        mercaIniciarSimulacion();
        window.addEventListener('hashchange', applyHash);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
