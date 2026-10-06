/* =========================================================
   STACKLY — dashboard.js
   Sidebar, topbar, notification panel, tables, filters,
   order details, menu & offer CRUD (localStorage backed),
   settings, logout modal wiring.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const A = () => window.STACKLYAuth || {};
  const toast = (m, t, anchor) => window.STACKLY && window.STACKLY.toast && window.STACKLY.toast(m, t, anchor);

  /* ---------- store helpers ---------- */
  const store = {
    get(key, fb) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fb : JSON.parse(v);
      } catch (e) {
        return fb;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  /* =======================================================
     1. SIDEBAR (mobile drawer + active state)
     ======================================================= */
  function initSidebar() {
    const sidebar = $('#dashSidebar');
    const toggle = $('#sbToggle');
    const overlay = $('#sbOverlay');
    if (!sidebar || !toggle) return;

    const closeButton = document.createElement('button');
    closeButton.className = 'sb-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close navigation menu');
    closeButton.innerHTML = '<span></span><span></span>';
    sidebar.appendChild(closeButton);

    function setOpen(open) {
      sidebar.classList.toggle('open', open);
      toggle.classList.toggle('open', open);
      if (overlay) overlay.classList.toggle('show', open);
      document.body.classList.toggle('no-scroll', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    closeButton.addEventListener('click', () => setOpen(false));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
    });
    $$('.sb-link').forEach((a) =>
      a.addEventListener('click', () => {
        if (window.innerWidth <= 1100) setOpen(false);
      })
    );

    /* mark current page */
    const page = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
    $$('.sb-link').forEach((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href === page) a.classList.add('active');
    });

    /* close drawer when resizing to desktop */
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && sidebar.classList.contains('open')) setOpen(false);
    });
  }

  /* =======================================================
     2. NOTIFICATION PANEL
     ======================================================= */
  function initNotify() {
    const btn = $('#notifyBtn');
    const panel = $('#notifyPanel');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(panel.classList.contains('show')));
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      panel.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        panel.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    const clearBtn = $('#notifyClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const list = $('#notifyList');
        list.innerHTML = '<div class="np-item info"><div class="np-ico">&#10003;</div><p>You are all caught up.</p><small>Just now</small></div>';
        const dot = btn.querySelector('.dot');
        if (dot) dot.remove();
        toast('All notifications cleared.', 'info');
      });
    }
  }

  /* =======================================================
     3. GENERIC TABLE SEARCH + STATUS FILTER
     ======================================================= */
  function initTableTools() {
    $$('[data-table]').forEach((table) => {
      const key = table.dataset.table;
      const search = $('[data-table-search="' + key + '"]');
      const filter = $('[data-table-filter="' + key + '"]');
      const count = $('[data-table-count="' + key + '"]');
      const rows = $$('[data-row]', table);
      const cards = $$('[data-card-row="' + key + '"]');

      function apply() {
        const term = (search ? search.value : '').trim().toLowerCase();
        const status = filter ? filter.value : 'all';
        let n = 0;

        rows.forEach((tr) => {
          const text = (tr.dataset.search || tr.textContent || '').toLowerCase();
          const st = tr.dataset.status || '';
          const ok = (!term || text.indexOf(term) !== -1) && (status === 'all' || st === status);
          tr.classList.toggle('hide', !ok);
          if (ok) n++;
        });

        cards.forEach((c) => {
          const text = (c.dataset.search || c.textContent || '').toLowerCase();
          const st = c.dataset.status || '';
          const ok = (!term || text.indexOf(term) !== -1) && (status === 'all' || st === status);
          c.classList.toggle('hide', !ok);
        });

        if (count) count.innerHTML = '<b>' + n + '</b> result' + (n === 1 ? '' : 's');

        const empty = $('[data-table-empty="' + key + '"]');
        if (empty) empty.classList.toggle('hide', n !== 0);
      }

      if (search) search.addEventListener('input', apply);
      if (filter) filter.addEventListener('change', apply);

      const clear = $('[data-table-clear="' + key + '"]');
      if (clear) {
        clear.addEventListener('click', () => {
          search.value = '';
          if (filter) filter.value = 'all';
          apply();
          search.focus();
        });
      }

      /* count rows in filter options */
      if (filter) {
        $$('option', filter).forEach((opt) => {
          const v = opt.value;
          if (!v || v === 'all') return;
          const count2 = rows.filter((tr) => tr.dataset.status === v).length;
          opt.textContent = opt.textContent.replace(/\s*\(\d+\)$/, '') + ' (' + count2 + ')';
        });
      }

      apply();
    });
  }

  /* =======================================================
     4. ORDER DETAIL MODAL
     ======================================================= */
  function initOrderDetail() {
    const modal = $('#orderModal');
    if (!modal) return;

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-order]');
      if (!opener) return;
      const o = opener.dataset.order ? JSON.parse(opener.dataset.order) : {};
      $('#odId').textContent = o.id || '—';
      $('#odCustomer').textContent = o.customer || '—';
      $('#odCustomerMail').textContent = o.email || 'Not provided';
      $('#odPhone').textContent = o.phone || 'Not provided';
      $('#odItem').textContent = o.item || '—';
      $('#odQty').textContent = o.qty || '1';
      $('#odTable').textContent = o.table || 'Takeaway';
      $('#odDate').textContent = o.date || '—';
      $('#odAmount').textContent = o.amount || '—';
      const st = $('#odStatus');
      if (st) {
        st.textContent = o.status || 'Pending';
        st.className = 'status ' + String(o.status || 'pending').toLowerCase();
      }
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    });

    function close() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-modal-close]')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  /* =======================================================
     5. MENU MANAGEMENT (add / edit / delete)
     ======================================================= */
  const MENU_KEY = 'stackly_menu_items';
  const MENU_SEED = [
    { id: 'M-101', name: 'Espresso', cat: 'Hot Coffee', price: 180, stock: 46, img: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=400&q=70' },
    { id: 'M-102', name: 'Cappuccino', cat: 'Hot Coffee', price: 240, stock: 38, img: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=70' },
    { id: 'M-103', name: 'Latte', cat: 'Hot Coffee', price: 260, stock: 31, img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&q=70' },
    { id: 'M-104', name: 'Cold Brew', cat: 'Cold Coffee', price: 290, stock: 24, img: 'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?auto=format&fit=crop&w=400&q=70' },
    { id: 'M-105', name: 'Blueberry Muffin', cat: 'Snacks', price: 150, stock: 19, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=70' },
    { id: 'M-106', name: 'Belgian Waffle', cat: 'Breakfast', price: 320, stock: 12, img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=400&q=70' }
  ];

  function getMenuItems() {
    const items = store.get(MENU_KEY, null);
    if (Array.isArray(items)) return items;
    const seed = MENU_SEED.map((s) => Object.assign({}, s, { avail: true }));
    store.set(MENU_KEY, seed);
    return seed;
  }

  function renderMenuAdmin() {
    const host = $('#menuAdminList');
    if (!host) return;
    const items = getMenuItems();
    const countEl = $('[data-menu-admin-count]');

    if (countEl) countEl.innerHTML = '<b>' + items.length + '</b> items';

    if (!items.length) {
      host.innerHTML =
        '<div class="dash-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 2v20M21 12H3M21 12l-4-4M21 12l-4 4M21 12l-4 4" transform="translate(0,0)"/><circle cx="12" cy="12" r="9"/></svg><p>No menu items yet. Add your first coffee to get started.</p></div>';
      return;
    }

    host.innerHTML = items
      .map(
        (it, i) => `
      <div class="d-card" data-menu-row data-id="${it.id}" style="--dc-accent:${it.avail ? '#3f7d5c' : '#c0392b'}" data-search="${(it.name + ' ' + it.cat).toLowerCase()}" data-status="${it.avail ? 'Available' : 'Unavailable'}">
        <div class="d-card-top">
          ${it.img ? `<img class="dc-thumb" src="${it.img}" alt="${it.name}" loading="lazy">` : ''}
          <div>
            <span class="dc-id">${it.id}</span>
            <h4>${it.name}</h4>
          </div>
          <span class="status ${it.avail ? 'completed' : 'cancelled'}">${it.avail ? 'Available' : 'Unavailable'}</span>
        </div>
        <div class="dc-meta">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h12"/></svg>${it.cat}</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 7 12 3 4 7v10l8 4 8-4Z"/></svg>Stock: ${it.stock}</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 6H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"/></svg>&#8377;${it.price}</span>
        </div>
        <div class="dc-foot">
          <b>&#8377;${it.price}</b>
        </div>
      </div>`
      )
      .join('');
  }

  function initMenuAdmin() {
    const form = $('#menuAdminForm');
    if (!form) return;
    renderMenuAdmin();

    const idField = $('#miId');
    const catSel = $('#miCat');
    const imgField = $('#miImg');

    /* sync category options with the public menu */
    if (catSel) {
      const existing = Array.from(catSel.options).map((o) => o.value);
      ['Hot Coffee', 'Cold Coffee', 'Tea', 'Snacks', 'Desserts', 'Breakfast'].forEach((c) => {
        if (existing.indexOf(c) === -1) {
          const o = document.createElement('option');
          o.value = c;
          o.textContent = c;
          catSel.appendChild(o);
        }
      });
    }

    /* image preview */
    if (imgField) {
      imgField.addEventListener('input', () => {
        const url = imgField.value.trim();
        const prev = $('#miImgPrev');
        if (prev) {
          prev.src = url || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=70';
        }
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = ($('#miName').value || '').trim();
      const price = parseFloat($('#miPrice').value);
      const stock = parseInt($('#miStock').value, 10);
      const cat = catSel ? catSel.value : 'Hot Coffee';
      const img = (imgField && imgField.value.trim()) || '';

      if (name.length < 2 || isNaN(price) || price <= 0 || isNaN(stock)) {
        toast('Please fill in a valid name, price and stock.', 'err', e.submitter || form);
        return;
      }

      const items = getMenuItems();
      const editId = idField ? idField.value : '';

      if (editId) {
        const it = items.find((x) => x.id === editId);
        if (it) {
          Object.assign(it, { name, price, stock, cat, img: img || it.img });
          store.set(MENU_KEY, items);
          toast(name + ' updated successfully.', 'ok', e.submitter || form);
        }
      } else {
        items.unshift({
          id: 'M-' + Math.floor(200 + Math.random() * 700),
          name,
          price,
          stock,
          cat,
          img:
            img ||
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=70',
          avail: true
        });
        store.set(MENU_KEY, items);
        toast(name + ' added to the STACKLY menu.', 'ok', e.submitter || form);
      }
      form.reset();
      if (idField) idField.value = '';
      const submitLabel = $('#miSubmitLabel');
      if (submitLabel) submitLabel.textContent = 'Add New Item';
      renderMenuAdmin();
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-item]');
      const delBtn = e.target.closest('[data-del-item]');
      const togBtn = e.target.closest('[data-toggle-avail]');
      const items = getMenuItems();

      if (editBtn) {
        const it = items.find((x) => x.id === editBtn.dataset.editItem);
        if (!it) return;
        $('#miId').value = it.id;
        $('#miName').value = it.name;
        $('#miPrice').value = it.price;
        $('#miStock').value = it.stock;
        if (catSel) catSel.value = it.cat;
        if (imgField) imgField.value = it.img || '';
        const prev = $('#miImgPrev');
        if (prev) prev.src = it.img || prev.src;
        const label = $('#miSubmitLabel');
        if (label) label.textContent = 'Save Changes';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Editing ' + it.name, 'info', editBtn);
      }

      if (delBtn) {
        const id = delBtn.dataset.delItem;
        const it = items.find((x) => x.id === id);
        if (!it) return;
        if (!window.confirm('Delete "' + it.name + '" from the menu?')) return;
        store.set(MENU_KEY, items.filter((x) => x.id !== id));
        renderMenuAdmin();
        toast(it.name + ' removed from the menu.', 'info', delBtn);
      }

      if (togBtn) {
        const it = items.find((x) => x.id === togBtn.dataset.toggleAvail);
        if (!it) return;
        it.avail = !it.avail;
        store.set(MENU_KEY, items);
        renderMenuAdmin();
        toast(it.name + (it.avail ? ' is now available.' : ' is now unavailable.'), it.avail ? 'ok' : 'info', togBtn);
      }
    });

    const resetBtn = $('#miReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        if (idField) idField.value = '';
        const label = $('#miSubmitLabel');
        if (label) label.textContent = 'Add New Item';
        toast('Form cleared.', 'info', resetBtn);
      });
    }
  }

  /* =======================================================
     6. OFFER MANAGEMENT
     ======================================================= */
  const OFFER_KEY = 'stackly_offers';
  const OFFER_SEED = [
    { id: 'OF-11', title: 'Buy 1 Get 1 Free', disc: '50%', start: '2026-09-01', end: '2026-12-31', grad: 'linear-gradient(135deg,#c2542f,#f0863c)' },
    { id: 'OF-12', title: 'Morning Coffee Combo', disc: '30%', start: '2026-10-01', end: '2026-11-30', grad: 'linear-gradient(135deg,#3f7d5c,#7fc39a)' },
    { id: 'OF-13', title: 'Weekend Brunch Special', disc: '20%', start: '2026-10-05', end: '2026-10-31', grad: 'linear-gradient(135deg,#6f4429,#c98a45)' },
    { id: 'OF-14', title: 'Student Sundays', disc: '25%', start: '2026-08-15', end: '2026-09-30', grad: 'linear-gradient(135deg,#8a8a8a,#b5b5b5)' },
    { id: 'OF-15', title: 'Dessert + Coffee Combo', disc: '35%', start: '2026-11-01', end: '2026-12-15', grad: 'linear-gradient(135deg,#b4436b,#e0739a)' },
    { id: 'OF-16', title: 'Loyalty Double Points', disc: '2X', start: '2026-10-10', end: '2027-01-10', grad: 'linear-gradient(135deg,#c98a45,#f0c46b)' }
  ];

  function getOffers() {
    const o = store.get(OFFER_KEY, null);
    if (Array.isArray(o)) return o;
    const seed = OFFER_SEED.map((s) => Object.assign({}, s, { status: offerStatus(s.start, s.end) }));
    store.set(OFFER_KEY, seed);
    return seed;
  }

  function fmtDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /* yyyy-mm-dd parsed in the visitor's own timezone, not UTC */
  function dayBounds(iso) {
    const parts = String(iso || '').split('-').map(Number);
    const y = parts[0] || 1970;
    const m = parts[1] || 1;
    const d = parts[2] || 1;
    const from = new Date(y, m - 1, d, 0, 0, 0, 0);
    const to = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { from: from, to: to };
  }

  /* start/end are inclusive calendar days, so "today" always counts */
  function offerStatus(start, end, now) {
    const t = now || new Date();
    const s = dayBounds(start).from;
    const e = dayBounds(end).to;
    if (t < s) return 'Scheduled';
    if (t > e) return 'Expired';
    return 'Active';
  }

  function renderOffersAdmin() {
    const host = $('#offersAdminList');
    if (!host) return;
    const offers = getOffers();
    const countEl = $('[data-offers-admin-count]');
    if (countEl) countEl.innerHTML = '<b>' + offers.length + '</b> offers';
    if (!offers.length) {
      host.innerHTML = '<div class="dash-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg><p>No offers yet. Create a promotion to boost footfall.</p></div>';
      return;
    }
    host.innerHTML = offers
      .map(
        (o) => `
      <article class="adoffer" data-offer-row data-id="${o.id}" data-search="${o.title.toLowerCase()}" data-status="${o.status}">
        <div class="ao-top" style="--ao-grad:${o.grad}">
          <div class="ao-disc">${o.disc}</div>
          <h4>${o.title}</h4>
          <p>${o.status === 'Active' ? 'Live and accepting claims now' : o.status === 'Expired' ? 'Promotion period has ended' : 'Scheduled to go live'}</p>
        </div>
        <div class="ao-body">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${fmtDate(o.start)} &rarr; ${fmtDate(o.end)}</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/></svg>Code: ${o.id}-STACKLY</span>
        </div>
        <div class="ao-foot">
          <span class="status ${o.status.toLowerCase()}">${o.status}</span>
        </div>
      </article>`
      )
      .join('');
  }

  function initOffersAdmin() {
    const form = $('#offerForm');
    if (!form) return;
    renderOffersAdmin();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = ($('#ofTitle').value || '').trim();
      const disc = ($('#ofDisc').value || '').trim();
      const start = $('#ofStart').value;
      const end = $('#ofEnd').value;

      if (title.length < 3 || !disc || !start || !end) {
        toast('Complete every field before saving the offer.', 'err');
        return;
      }
      if (new Date(end) < new Date(start)) {
        toast('End date must be after the start date.', 'err');
        return;
      }

      const offers = getOffers();
      const editId = $('#ofId').value;
      const now = new Date();

      if (editId) {
        const o = offers.find((x) => x.id === editId);
        if (o) {
          Object.assign(o, { title, disc, start, end });
          o.status = offerStatus(start, end, now);
          store.set(OFFER_KEY, offers);
          toast(title + ' updated.', 'ok');
        }
      } else {
        offers.unshift({
          id: 'OF-' + Math.floor(20 + Math.random() * 70),
          title,
          disc,
          start,
          end,
          status: offerStatus(start, end, now),
          grad: 'linear-gradient(135deg,#c2542f,#f0863c)'
        });
        store.set(OFFER_KEY, offers);
        toast('New offer "' + title + '" created.', 'ok');
      }
      form.reset();
      $('#ofId').value = '';
      const lbl = $('#ofSubmitLabel');
      if (lbl) lbl.textContent = 'Create Offer';
      renderOffersAdmin();
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-offer]');
      const delBtn = e.target.closest('[data-del-offer]');
      const offers = getOffers();

      if (editBtn) {
        const o = offers.find((x) => x.id === editBtn.dataset.editOffer);
        if (!o) return;
        $('#ofId').value = o.id;
        $('#ofTitle').value = o.title;
        $('#ofDisc').value = o.disc;
        $('#ofStart').value = o.start;
        $('#ofEnd').value = o.end;
        const lbl = $('#ofSubmitLabel');
        if (lbl) lbl.textContent = 'Save Offer';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (delBtn) {
        const o = offers.find((x) => x.id === delBtn.dataset.delOffer);
        if (!o) return;
        if (!window.confirm('Delete the offer "' + o.title + '"?')) return;
        store.set(OFFER_KEY, offers.filter((x) => x.id !== o.id));
        renderOffersAdmin();
        toast('Offer deleted.', 'info');
      }
    });
  }

  /* =======================================================
     7. SETTINGS (tabs, save, toggles, theme)
     ======================================================= */
  function initSettings() {
    const nav = $('#settingsNav');
    if (!nav) return;

    const PANES = {
      profile: '#setProfile',
      account: '#setAccount',
      notify: '#setNotify',
      password: '#setPassword',
      appearance: '#setAppearance'
    };

    function show(key) {
      Object.keys(PANES).forEach((k) => {
        const pane = $(PANES[k]);
        if (pane) pane.classList.toggle('hide', k !== key);
      });
      $$('button', nav).forEach((b) => b.classList.toggle('active', b.dataset.setTab === key));
      try {
        store.set('stackly_set_tab', key);
      } catch (e) {
        /* noop */
      }
    }

    $$('button', nav).forEach((b) => b.addEventListener('click', () => show(b.dataset.setTab)));
    const saved = store.get('stackly_set_tab', 'profile');
    show(saved in PANES ? saved : 'profile');

    /* switch toggles */
    $$('.switch').forEach((sw) => {
      const key = 'stackly_sw_' + sw.dataset.switch;
      if (store.get(key, null) === true) sw.classList.add('on');
      sw.setAttribute('aria-checked', sw.classList.contains('on') ? 'true' : 'false');

      const flip = () => {
        sw.classList.toggle('on');
        const on = sw.classList.contains('on');
        sw.setAttribute('aria-checked', on ? 'true' : 'false');
        store.set(key, on);
        toast(on ? 'Preference enabled.' : 'Preference disabled.', 'info');
      };
      sw.addEventListener('click', flip);
      sw.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
          e.preventDefault();
          flip();
        }
      });
    });

    /* appearance theme dots */
    $$('.theme-dot').forEach((dot) => {
      const key = 'stackly_theme_' + dot.dataset.theme;
      if (store.get(key, false)) dot.classList.add('active');
      dot.addEventListener('click', () => {
        $$('.theme-dot').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
        $$('.theme-dot').forEach((d) => store.set('stackly_theme_' + d.dataset.theme, d === dot));
        document.documentElement.style.setProperty('--terracotta', dot.dataset.accent || '#c2542f');
        toast('Accent colour updated to ' + dot.dataset.theme + '.', 'ok');
      });
    });

    /* profile save */
    const profileForm = $('#profileForm');
    if (profileForm) {
      const sess = A().getSession ? A().getSession() : null;
      if (sess) {
        const n = $('#psName');
        const e = $('#psEmail');
        const p = $('#psPhone');
        if (n) n.value = sess.name;
        if (e) e.value = sess.email;
        if (p && store.get('stackly_phone', null)) p.value = store.get('stackly_phone', '');
      }
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ($('#psName').value || '').trim();
        const email = ($('#psEmail').value || '').trim();
        if (name.length < 2) {
          toast('Please enter your full name.', 'err');
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
          toast('Please enter a valid email address.', 'err');
          return;
        }
        store.set('stackly_profile', { name, email, phone: ($('#psPhone').value || '').trim() });
        store.set('stackly_phone', ($('#psPhone').value || '').trim());
        const sess = A().getSession();
        if (sess && A().setSession) A().setSession(email, name);
        $$('[data-user-name]').forEach((el) => (el.textContent = name));
        $$('[data-user-email]').forEach((el) => (el.textContent = email));
        $$('[data-welcome-plain]').forEach((el) => (el.textContent = 'Welcome back, ' + A().usernameFromEmail(email) + '!'));
        $$('[data-welcome]').forEach(
          (el) => (el.innerHTML = 'Welcome back, <span class="welcome">' + A().usernameFromEmail(email) + '</span>!')
        );
        toast('Profile settings saved.', 'ok');
      });
    }

    /* account form */
    const accForm = $('#accountForm');
    if (accForm) {
      accForm.addEventListener('submit', (e) => {
        e.preventDefault();
        store.set('stackly_account', {
          lang: $('#acLang').value,
          tz: $('#acTz').value,
          currency: $('#acCur').value
        });
        toast('Account preferences saved.', 'ok');
      });
    }

    /* password form */
    const pwForm = $('#passwordForm');
    if (pwForm) {
      pwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cur = $('#pwCurrent').value;
        const nw = $('#pwNew').value;
        const cf = $('#pwConfirm').value;
        if (cur.length < 6) {
          toast('Enter your current password.', 'err');
          return;
        }
        if (nw.length < 6) {
          toast('New password must be at least 6 characters.', 'err');
          return;
        }
        if (nw !== cf) {
          toast('New passwords do not match.', 'err');
          return;
        }
        const sess = A().getSession();
        const user = sess && A().findUser ? A().findUser(sess.email) : null;
        if (user) {
          const users = A().getUsers();
          const u = users.find((x) => x.email === user.email);
          if (u) {
            u.password = nw;
            store.set('stackly_users', users);
          }
        }
        pwForm.reset();
        toast('Password updated successfully.', 'ok');
      });
    }
  }

  /* =======================================================
     8. SEGMENTED CONTROLS (analytics filters)
     ======================================================= */
  function initSegmented() {
    $$('[data-segmented]').forEach((group) => {
      const buttons = $$('button', group);
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          const range = btn.dataset.range;

          /* show the label first — it must update even if the canvas is absent */
          const labelEl = document.querySelector('[data-range-label="' + group.dataset.chart + '"]');
          if (labelEl) labelEl.textContent = range.charAt(0).toUpperCase() + range.slice(1) + ' view';

          /* redraw the target canvas for the selected range */
          const canvas = document.querySelector('[data-chart="' + (group.dataset.canvas || group.dataset.chart) + '"]');
          if (canvas && window.STACKLYCharts) {
            const C = window.STACKLYCharts;
            const height = canvas.dataset.height ? +canvas.dataset.height : 280;
            if (range === 'weekly') {
              C.line(canvas, C.DATA.weekLabels, [{ name: 'Revenue', data: C.DATA.weekRevenue }], { height: height });
            } else if (range === 'monthly') {
              C.line(
                canvas,
                C.DATA.monthLabels,
                [
                  { name: 'Revenue', data: C.DATA.monthRevenue, color: '#c2542f' },
                  { name: 'Orders', data: C.DATA.monthOrders, color: '#e08a3c' }
                ],
                { height: height, rightAxis: true, rightColor: '#e08a3c', area: false }
              );
            } else if (range === 'yearly') {
              C.line(canvas, C.DATA.yearLabels, [{ name: 'Revenue', data: C.DATA.yearRevenue, color: '#c2542f' }], { height: height });
            }
          }
          toast('Chart switched to ' + range + ' view.', 'info');
        });
      });
    });
  }

  /* =======================================================
     9. SETTINGS-NAVED OTHER PAGES' TABS (Customers/Coffee)
     ======================================================= */
  function initTabs() {
    $$('[data-tabs]').forEach((group) => {
      const btns = $$('[data-tab]', group);
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const key = btn.dataset.tab;
          const scope = document.querySelector(group.dataset.tabScope || 'body');
          $$('[data-tab-pane]', scope).forEach((p) => p.classList.toggle('hide', p.dataset.tabPane !== key));
        });
      });
    });
  }

  /* =======================================================
     10. ORDER STATUS CHANGE
     ======================================================= */
  function initStatusChange() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-set-status]');
      if (!btn) return;
      const card = btn.closest('[data-status-holder]');
      if (!card) return;
      const next = btn.dataset.setStatus;
      const badge = card.querySelector('.status');
      if (badge) {
        badge.textContent = next;
        badge.className = 'status ' + next.toLowerCase();
      }
      toast('Order ' + (card.dataset.orderId || '') + ' marked as ' + next + '.', 'ok');
    });
  }

  /* =======================================================
     11. EXPORT / PRINT HELPERS
     ======================================================= */
  function initActions() {
    $$('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toast('Preparing ' + btn.dataset.export + ' export as CSV…', 'info');
        setTimeout(() => toast(btn.dataset.export + ' export ready for download.', 'ok'), 1200);
      });
    });
    $$('[data-print]').forEach((btn) => btn.addEventListener('click', () => window.print()));
  }

  /* =======================================================
     BOOT
     ======================================================= */
  function boot() {
    initSidebar();
    initNotify();
    initTableTools();
    initOrderDetail();
    initMenuAdmin();
    initOffersAdmin();
    initSettings();
    initSegmented();
    initTabs();
    initStatusChange();
    initActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.STACKLYDash = { store, fmtDate };
})();
