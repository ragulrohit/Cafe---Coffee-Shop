/* =========================================================
   STACKLY — main.js
   Navbar, mobile menu, filters, lightbox, toasts, modals,
   cart, counters helper, image fallback, footer behaviour
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* =======================================================
     0. IMAGE FALLBACK — guarantees no broken images
     ======================================================= */
  const FALLBACK_SVG = (label) => {
    const t = (label || 'STACKLY Coffee').slice(0, 26);
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='#4b2e1c'/><stop offset='.55' stop-color='#8a5a3b'/>" +
      "<stop offset='1' stop-color='#f0863c'/></linearGradient></defs>" +
      "<rect width='600' height='400' fill='url(#g)'/>" +
      "<ellipse cx='300' cy='300' rx='150' ry='18' fill='rgba(0,0,0,.18)'/>" +
      "<path d='M205 170h170v70a85 85 0 0 1-170 0z' fill='#fdf8f2'/>" +
      "<path d='M375 186h22a26 26 0 0 1 0 52h-22' fill='none' stroke='#fdf8f2' stroke-width='14'/>" +
      "<ellipse cx='290' cy='172' rx='85' ry='26' fill='#6f4429'/>" +
      "<path d='M262 148c0-18 22-18 22-36M296 152c0-18 22-18 22-36' stroke='rgba(255,255,255,.65)' stroke-width='6' stroke-linecap='round' fill='none'/>" +
      "<text x='300' y='368' font-family='Georgia,serif' font-size='26' font-weight='700' fill='rgba(255,255,255,.92)' text-anchor='middle' letter-spacing='4'>" +
      t +
      "</text></svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  function guardImages() {
    document.addEventListener(
      'error',
      (e) => {
        const t = e.target;
        if (!(t instanceof HTMLImageElement)) return;
        if (t.dataset.fallbackApplied) return;
        t.dataset.fallbackApplied = '1';
        t.src = FALLBACK_SVG(t.dataset.label || 'STACKLY Coffee');
      },
      true
    );
  }

  /* =======================================================
     1. NAVBAR — scroll state + active link
     ======================================================= */
  function initNavbar() {
    const nav = $('#navbar');
    if (!nav) return;
    const darkSections = $$('[data-nav-dark]');

    function onScroll() {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 40);

      if (darkSections.length) {
        const probe = y + 90;
        let onDark = false;
        darkSections.forEach((s) => {
          const top = s.offsetTop;
          const bottom = top + s.offsetHeight;
          if (probe >= top && probe < bottom) onDark = true;
        });
        nav.classList.toggle('on-dark', onDark);
      }
    }

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            onScroll();
            ticking = false;
          });
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    /* mark current page */
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav-link, .m-link').forEach((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
    });
  }

  /* =======================================================
     2. MOBILE MENU
     ======================================================= */
  function initMobileMenu() {
    const toggle = $('#navToggle');
    const menu = $('#mobileMenu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('open', open);
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    }
    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    $$('.m-link', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && menu.classList.contains('open')) setOpen(false);
    });
  }

  /* =======================================================
     2A. CUSTOM SELECTS — viewport-safe dropdowns
     ======================================================= */
  function initCustomSelects() {
    $$('select').forEach((select) => {
      if (select.dataset.customReady) return;
      select.dataset.customReady = '1';

      const shell = document.createElement('div');
      shell.className = 'custom-select-shell';
      select.parentNode.insertBefore(shell, select);
      shell.appendChild(select);
      select.classList.add('custom-select-native');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'custom-select-button';
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      shell.appendChild(button);

      const menu = document.createElement('div');
      menu.className = 'custom-select-menu';
      menu.setAttribute('role', 'listbox');
      document.body.appendChild(menu);

      const sync = () => {
        const option = select.options[select.selectedIndex];
        button.textContent = option ? option.textContent : '';
        button.disabled = select.disabled;
        menu.querySelectorAll('[role="option"]').forEach((item) => {
          item.setAttribute('aria-selected', String(item.dataset.value === select.value));
        });
      };

      Array.from(select.options).forEach((option) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'custom-select-option';
        item.textContent = option.textContent;
        item.dataset.value = option.value;
        item.disabled = option.disabled;
        item.setAttribute('role', 'option');
        item.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          sync();
          close();
        });
        menu.appendChild(item);
      });

      function position() {
        const rect = button.getBoundingClientRect();
        menu.style.width = `${rect.width}px`;
        menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
        const roomBelow = window.innerHeight - rect.bottom - 8;
        const roomAbove = rect.top - 8;
        const openUp = roomBelow < 220 && roomAbove > roomBelow;
        const availableRoom = Math.max(60, openUp ? roomAbove : roomBelow);
        menu.style.maxHeight = `${Math.min(280, availableRoom)}px`;
        const menuHeight = Math.min(280, availableRoom, menu.scrollHeight);
        const top = openUp
          ? Math.max(8, rect.top - menuHeight - 6)
          : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 6);
        menu.style.top = `${Math.max(8, top)}px`;
        menu.style.bottom = 'auto';
      }

      function close() {
        menu.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }

      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const opening = !menu.classList.contains('open');
        $$('.custom-select-menu.open').forEach((other) => other.classList.remove('open'));
        $$('.custom-select-button[aria-expanded="true"]').forEach((other) => other.setAttribute('aria-expanded', 'false'));
        if (opening) {
          menu.classList.add('open');
          button.setAttribute('aria-expanded', 'true');
          position();
        } else close();
      });
      // The pointerdown above opens the menu; keep the following click from
      // bubbling to the document-level outside-click closer.
      button.addEventListener('click', (event) => event.stopPropagation());
      select.addEventListener('change', sync);
      window.addEventListener('resize', () => menu.classList.contains('open') && position());
      window.addEventListener('scroll', () => menu.classList.contains('open') && position(), true);
      sync();
    });
    document.addEventListener('click', () => {
      $$('.custom-select-menu.open').forEach((menu) => menu.classList.remove('open'));
      $$('.custom-select-button[aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    });
    document.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.custom-select-shell, .custom-select-menu')) return;
      $$('.custom-select-menu.open').forEach((menu) => menu.classList.remove('open'));
      $$('.custom-select-button[aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      $$('.custom-select-menu.open').forEach((menu) => menu.classList.remove('open'));
      $$('.custom-select-button[aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    });
  }

  /* =======================================================
     3. TOASTS
     ======================================================= */
  function toast(message, type, anchor) {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const icons = {
      ok: '<path d="M20 6 9 17l-5-5"/>',
      err: '<path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'
    };
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML =
      '<span class="t-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      (icons[type] || icons.ok) +
      '</svg></span><span>' +
      message +
      '</span>';
    stack.appendChild(el);
    if (anchor && anchor.getBoundingClientRect) {
      const rect = anchor.getBoundingClientRect();
      const toastWidth = Math.min(320, window.innerWidth - 32);
      const left = rect.right + 12 + toastWidth <= window.innerWidth
        ? rect.right + 12
        : Math.max(16, rect.left - toastWidth - 12);
      const top = Math.min(
        Math.max(16, rect.top),
        Math.max(16, window.innerHeight - el.offsetHeight - 16)
      );
      stack.style.top = top + 'px';
      stack.style.left = left + 'px';
      stack.style.right = 'auto';
      stack.style.bottom = 'auto';
    }
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 340);
    }, 3400);
  }

  /* =======================================================
     4. MODALS (generic)
     ======================================================= */
  function initModals() {
    let lastFocus = null;

    function open(modal) {
      if (!modal) return;
      lastFocus = document.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      const focusable = modal.querySelector('button, [href], input, select, textarea');
      if (focusable) setTimeout(() => focusable.focus(), 120);
    }

    function close(modal) {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      if (!$('.modal-overlay.open')) document.body.classList.remove('no-scroll');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-modal-open]');
      if (opener) {
        e.preventDefault();
        open($('#' + opener.dataset.modalOpen));
        return;
      }
      const closer = e.target.closest('[data-modal-close]');
      if (closer) {
        e.preventDefault();
        close(closer.closest('.modal-overlay'));
        return;
      }
      if (e.target.classList && e.target.classList.contains('modal-overlay')) close(e.target);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = $('.modal-overlay.open');
      if (open) close(open);
    });

    window.STACKLYModal = { open, close };
  }

  /* =======================================================
     5. MENU FILTER + SEARCH
     ======================================================= */
  function initMenuFilter() {
    const bar = $('[data-filter-bar]');
    const grid = $('[data-filter-grid]');
    if (!bar || !grid) return;

    const items = $$('[data-cat]', grid);
    const buttons = $$('.filter-btn', bar);
    const empty = $('[data-filter-empty]', grid.parentElement || document);
    const countEl = $('[data-filter-count]');
    let active = 'all';

    function apply() {
      const term = ($('[data-menu-search]')?.value || '').trim().toLowerCase();
      let shown = 0;

      items.forEach((it) => {
        const matchCat = active === 'all' || it.dataset.cat === active;
        const text = (it.dataset.search || it.textContent || '').toLowerCase();
        const matchTerm = !term || text.indexOf(term) !== -1;
        const show = matchCat && matchTerm;
        it.classList.toggle('hide', !show);
        if (show) {
          shown++;
          it.classList.remove('filter-anim');
          void it.offsetWidth;
          it.classList.add('filter-anim');
        }
      });

      if (empty) empty.classList.toggle('hide', shown !== 0);
      if (countEl) countEl.innerHTML = '<b>' + shown + '</b> items shown';
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        active = btn.dataset.filter;
        apply();
      });
    });

    const search = $('[data-menu-search]');
    const clear = $('[data-search-clear]');
    if (search) {
      search.addEventListener('input', () => {
        if (clear) clear.classList.toggle('show', search.value.length > 0);
        apply();
      });
    }
    if (clear) {
      clear.addEventListener('click', () => {
        search.value = '';
        clear.classList.remove('show');
        apply();
        search.focus();
      });
    }

    /* update counts on filter chips */
    buttons.forEach((b) => {
      const cat = b.dataset.filter;
      if (cat === 'all') return;
      const n = items.filter((i) => i.dataset.cat === cat).length;
      const small = b.querySelector('small');
      if (small) small.textContent = n;
    });

    apply();
  }

  /* =======================================================
     6. LIGHTBOX
     ======================================================= */
  function initLightbox() {
    const lb = $('#lightbox');
    if (!lb) return;
    const img = $('.lightbox img', lb);
    const cap = $('[data-lb-caption]', lb);
    const cnt = $('[data-lb-count]', lb);
    const items = $$('[data-lightbox]');
    let idx = 0;

    function show(i) {
      idx = (i + items.length) % items.length;
      const el = items[idx];
      const src = el.dataset.lightbox || ($('img', el)?.src || '');
      const label = el.dataset.caption || 'STACKLY Coffee';
      img.style.opacity = '0';
      const probe = new Image();
      probe.onload = () => {
        img.src = src;
        img.alt = label;
        img.style.opacity = '1';
      };
      probe.onerror = () => {
        img.src = src;
        img.alt = label;
        img.style.opacity = '1';
      };
      img.src = src;
      if (cap) cap.textContent = label;
      if (cnt) cnt.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    }

    items.forEach((el, i) => {
      el.addEventListener('click', () => {
        show(i);
        lb.classList.add('open');
        document.body.classList.add('no-scroll');
        lb.setAttribute('aria-hidden', 'false');
      });
    });

    function close() {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }

    $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', close));
    $$('[data-lb-prev]', lb).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); }));
    $$('[data-lb-next]', lb).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); }));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* =======================================================
     7. ADD TO CART (UI micro-interaction + counter)
     ======================================================= */
  function initCart() {
    function cartCount() {
      let n = 0;
      try {
        n = parseInt(localStorage.getItem('stackly_cart') || '0', 10) || 0;
      } catch (err) {
        n = 0;
      }
      return n;
    }
    function setCartCount(n) {
      try {
        localStorage.setItem('stackly_cart', String(n));
      } catch (err) {
        /* storage unavailable */
      }
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = n;
        el.classList.toggle('hide', n === 0);
      });
    }
    window.STACKLYCart = { get: cartCount, add: setCartCount };

    $$('[data-cart-count]').forEach((el) => {
      const n = cartCount();
      el.textContent = n;
      el.classList.toggle('hide', n === 0);
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add-cart]');
      if (!btn) return;
      const name = btn.dataset.addCart || 'Item';
      const original = btn.innerHTML;
      btn.classList.add('added');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Added';
      setCartCount(cartCount() + 1);
      toast(name + ' added to your order', 'ok');
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = original;
      }, 1600);
    });
  }

  /* =======================================================
     8. OFFER CLAIM
     ======================================================= */
  function initClaim() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-claim]');
      if (!btn) return;
      const title = btn.dataset.claim;
      const claimed = btn.classList.contains('claimed');
      if (claimed) {
        btn.classList.remove('claimed');
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Claim Offer';
        toast(title + ' offer unclaimed', 'info');
        return;
      }
      btn.classList.add('claimed');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Claimed';
      toast('Offer claimed! ' + title + ' is ready at the counter.', 'ok');
    });
  }

  /* =======================================================
     9. CONTACT FORM
     ======================================================= */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    const alertBox = $('[data-form-alert]', form.parentElement || document);

    const fields = {
      name: { el: $('#cName'), err: $('#cNameErr'), msg: 'Please tell us your name.', test: (v) => v.trim().length >= 2 },
      email: { el: $('#cEmail'), err: $('#cEmailErr'), msg: 'Enter a valid email address.', test: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) },
      phone: { el: $('#cPhone'), err: $('#cPhoneErr'), msg: 'Enter a valid phone number.', test: (v) => v.trim() === '' || /^[+\d][\d\s\-().]{6,17}$/.test(v.trim()) },
      address: { el: $('#cAddress'), err: $('#cAddressErr'), msg: 'Enter your address.', test: (v) => v.trim().length >= 3 },
      message: { el: $('#cMessage'), err: $('#cMessageErr'), msg: 'Message should be at least 12 characters.', test: (v) => v.trim().length >= 12 }
    };

    function validateOne(f) {
      const ok = f.test(f.el.value);
      f.el.classList.toggle('invalid', !ok);
      f.el.classList.toggle('valid', ok && f.el.value.trim() !== '');
      f.err.classList.toggle('show', !ok);
      return ok;
    }

    Object.values(fields).forEach((f) => {
      f.el.addEventListener('blur', () => validateOne(f));
      f.el.addEventListener('input', () => {
        if (f.el.classList.contains('invalid')) validateOne(f);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = Object.values(fields).map(validateOne);
      if (results.includes(false)) {
        showAlert('err', 'Almost there!', 'Please fix the highlighted fields and try again.');
        return;
      }
      const firstName = fields.name.el.value.trim().split(' ')[0];
      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      btn.disabled = true;
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        form.reset();
        Object.values(fields).forEach((f) => f.el.classList.remove('valid', 'invalid'));
        showAlert('ok', 'Message sent!', 'Thank you, ' + firstName + '. Our team replies within 24 hours.');
        toast('Your message is on its way to STACKLY.', 'ok');
      }, 1400);
    });

    function showAlert(type, title, msg) {
      if (!alertBox) return;
      alertBox.className = 'form-alert show ' + type;
      alertBox.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        (type === 'ok' ? '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/>' : '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/>') +
        '</svg><span><b>' + title + '</b>' + msg + '</span>';
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* =======================================================
     10. NEWSLETTER
     ======================================================= */
  function initNewsletter() {
    $$('[data-newsletter]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('input', form);
        if (!input.value || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.value.trim())) {
          toast('Please enter a valid email address.', 'err');
          input.focus();
          return;
        }
        toast('You are on the list! Watch your inbox for brewing secrets.', 'ok');
        form.reset();
      });
    });
  }

  /* =======================================================
     11. PASSWORD SHOW / HIDE + STRENGTH
     ======================================================= */
  function initPasswordTools() {
    $$('[data-pw-toggle]').forEach((btn) => {
      const input = document.getElementById(btn.dataset.pwToggle);
      if (!input) return;
      const eyeOpen = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      const eyeOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/><path d="M9.4 5.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1"/><path d="M6.2 6.6C3.6 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.2-1"/></svg>';
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show ? eyeOff : eyeOpen;
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        input.focus();
      });
    });

    const meter = $('[data-pw-strength]');
    const pwInput = meter ? document.getElementById(meter.dataset.pwStrength) : null;
    if (meter && pwInput) {
      const label = $('[data-pw-label]', meter);
      const texts = ['Too short', 'Weak password', 'Good password', 'Strong password', 'Excellent password'];
      pwInput.addEventListener('input', () => {
        const v = pwInput.value;
        let score = 0;
        if (v.length >= 6) score++;
        if (v.length >= 10) score++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
        if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
        if (v.length < 6) score = Math.min(score, 1);
        meter.dataset.level = String(Math.max(score, v ? 1 : 0));
        if (label) label.textContent = v ? texts[Math.max(score, 1)] : 'Use 8+ chars, mix cases, numbers & symbols';
      });
    }
  }

  /* =======================================================
     12. BACK TO TOP
     ======================================================= */
  function initToTop() {
    const btn = $('.top-btn');
    if (!btn) return;
    let ticking = false;
    function update() {
      btn.classList.toggle('show', window.scrollY > 500);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* =======================================================
     13. CURRENT YEAR + OPEN STATUS
     ======================================================= */
  function initCompactFooter() {
    $$('.footer').forEach((footer) => {
      const container = $('.container', footer);
      if (!container) return;
      container.innerHTML = `
        <div class="footer-grid footer-compact-grid">
          <div class="footer-about">
            <a class="footer-logo" href="index.html" aria-label="STACKLY home">
              <img src="images/Stackly_logo_clean.png" alt="STACKLY">
            </a>
            <p>Small-batch coffee, thoughtfully roasted and served fresh every day. Come in for a warm cup, good food and a little time for yourself.</p>
            <div class="socials">
              <a href="404.html" aria-label="STACKLY on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
              <a href="404.html" aria-label="STACKLY on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="404.html" aria-label="STACKLY on YouTube"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/></svg></a>
              <a href="404.html" aria-label="STACKLY on X"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l16 16M20 4 4 20"/></svg></a>
            </div>
          </div>
          <div>
            <h4>Company</h4>
            <ul class="f-links">
              <li><a href="about.html">About Us</a></li>
              <li><a href="gallery.html">Our Story</a></li>
              <li><a href="offers.html">Special Offers</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="login.html">Member Login</a></li>
            </ul>
          </div>
          <div>
            <h4>Products</h4>
            <ul class="f-links">
              <li><a href="menu.html">Coffee Menu</a></li>
              <li><a href="coffee.html">Coffee Guide</a></li>
              <li><a href="offers.html">Offers</a></li>
              <li><a href="gallery.html">Gallery</a></li>
            </ul>
          </div>
          <div>
            <h4>Get in Touch</h4>
            <ul class="f-info">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 7 9 6 9-6"/></svg><a href="mailto:hello@stackly.cafe">hello@stackly.cafe</a></li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg><a href="tel:+919876543210">+91 98765 43210</a></li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>Bengaluru, India</span></li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Mon - Fri: 7:00 - 22:00<br>Sat - Sun: 8:00 - 23:00</span></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p style="margin:0">&copy; <span data-year>2026</span> STACKLY Coffee Roasters. All rights reserved.</p>
          <p style="margin:0">Made with <span class="heart">♥</span> for coffee lovers</p>
        </div>`;
    });
  }

  function initMisc() {
    $$('[data-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });

    $$('[data-open-status]').forEach((el) => {
      const h = new Date().getHours();
      const d = new Date().getDay();
      const open = (h >= 7 && h < 22) && d !== 0;
      el.innerHTML = open
        ? '<span style="width:8px;height:8px;border-radius:50%;background:#59a37c;display:inline-block"></span> Open now &middot; till 10 PM'
        : '<span style="width:8px;height:8px;border-radius:50%;background:#d64545;display:inline-block"></span> Closed &middot; opens 7 AM';
    });

    /* 404 page actions */
    const backBtn = $('[data-go-back]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = 'index.html';
      });
    }
  }

  /* =======================================================
     BOOT
     ======================================================= */
  function boot() {
    const homeGallery = $('#gallery-preview');
    if (homeGallery) homeGallery.addEventListener('click', (e) => {
      if (e.target.closest('.gallery-item')) e.preventDefault();
    });
    guardImages();
    initNavbar();
    initMobileMenu();
    // Contact uses the plain native select for reliable browser and touch
    // behavior. Other pages continue using the custom select control.
    if (!$('#contactForm')) initCustomSelects();
    initModals();
    initMenuFilter();
    initLightbox();
    initCart();
    initClaim();
    initContactForm();
    initNewsletter();
    initPasswordTools();
    initToTop();
    initCompactFooter();
    initMisc();
    $$('.socials a').forEach((link) => {
      link.href = '404.html';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '404.html';
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.STACKLY = { toast, $, $$ };
})();
