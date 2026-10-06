/* =========================================================
   STACKLY — auth.js
   Signup · Login · Session · Logout · Route guard
   All data lives in localStorage (frontend simulation).
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- storage keys ---------- */
  const K = {
    users: 'stackly_users',
    session: 'stackly_session',
    signedUp: 'stackly_signed_up'
  };

  /* ---------- safe storage helpers ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
  function drop(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* noop */
    }
  }

  /* ---------- validators ---------- */
  const V = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '').trim()),
    phone: (v) => /^[+\d][\d\s\-().]{6,17}$/.test(String(v || '').trim()),
    name: (v) => String(v || '').trim().length >= 2,
    password: (v) => String(v || '').length >= 6
  };

  /* ---------- username derivation (never hardcoded) ---------- */
  function usernameFromEmail(email) {
    const raw = String(email || '').trim();
    const at = raw.lastIndexOf('@');
    const local = at > -1 ? raw.slice(0, at) : raw;
    return local || 'friend';
  }

  function prettyName(username) {
    return username
      .replace(/[._-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function initialsOf(username) {
    const parts = username.replace(/[._-]+/g, ' ').split(' ').filter(Boolean);
    if (!parts.length) return 'SK';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /* ---------- users ---------- */
  function getUsers() {
    const list = read(K.users, []);
    return Array.isArray(list) ? list : [];
  }
  function findUser(email) {
    const e = String(email || '').trim().toLowerCase();
    return getUsers().find((u) => String(u.email).toLowerCase() === e) || null;
  }

  /* ---------- session ---------- */
  function getSession() {
    const s = read(K.session, null);
    if (!s || !s.email) return null;
    return {
      email: s.email,
      username: usernameFromEmail(s.email),
      name: s.name || prettyName(usernameFromEmail(s.email)),
      loginAt: s.loginAt || new Date().toISOString()
    };
  }
  function setSession(email, name) {
    write(K.session, { email: String(email).trim(), name: name || '', loginAt: new Date().toISOString() });
  }
  function clearSession() {
    drop(K.session);
  }

  /* ---------- field validation UI ---------- */
  function setState(id, errId, isValid, message) {
    const input = document.getElementById(id);
    const err = document.getElementById(errId);
    if (input) {
      input.classList.toggle('invalid', !isValid);
      input.classList.toggle('valid', isValid);
      input.setAttribute('aria-invalid', String(!isValid));
    }
    if (err) {
      err.classList.toggle('show', !isValid);
      if (!isValid && message) err.innerHTML = alertIcon + message;
    }
    return isValid;
  }

  const alertIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/></svg>';

  function attachLiveValidation(map) {
    map.forEach(({ id, errId, test, message }) => {
      const input = document.getElementById(id);
      if (!input) return;
      const run = () => setState(id, errId, test(input.value), message);
      input.addEventListener('blur', run);
      input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) run();
      });
    });
  }

  function showAlert(boxId, type, title, msg) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.className = 'form-alert show ' + type;
    box.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      (type === 'ok'
        ? '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/>') +
      '</svg><span><b>' + title + '</b>' + msg + '</span>';
  }

  function hideAlert(boxId) {
    const box = document.getElementById(boxId);
    if (box) box.className = 'form-alert';
  }

  /* =======================================================
     LOGIN
     ======================================================= */
  function initLogin() {
    const form = $('#loginForm');
    if (!form) return;

    const idMap = [
      { id: 'lEmail', errId: 'lEmailErr', test: V.email, message: 'Enter a valid email address.' },
      { id: 'lPassword', errId: 'lPasswordErr', test: V.password, message: 'Password must be at least 6 characters.' }
    ];
    attachLiveValidation(idMap);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert('loginAlert');

      const email = ($('#lEmail').value || '').trim();
      const password = $('#lPassword').value || '';
      const remember = $('#lRemember');
      const okEmail = setState('lEmail', 'lEmailErr', V.email(email), 'Enter a valid email address.');
      const okPass = setState('lPassword', 'lPasswordErr', V.password(password), 'Password must be at least 6 characters.');

      if (!okEmail) {
        showAlert('loginAlert', 'err', 'Check your email', 'That email address does not look right.');
        $('#lEmail').focus();
        return;
      }
      if (!okPass) {
        showAlert('loginAlert', 'err', 'Check your password', 'Passwords at STACKLY are at least 6 characters long.');
        $('#lPassword').focus();
        return;
      }

      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      btn.disabled = true;

      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;

        const registered = findUser(email);
        if (registered && registered.password && registered.password !== password) {
          showAlert('loginAlert', 'err', 'Wrong password', 'That password does not match our records. Try again or reset it.');
          setState('lPassword', 'lPasswordErr', false, 'Incorrect password for this account.');
          $('#lPassword').focus();
          return;
        }

        /* ---- successful login ---- */
        const username = usernameFromEmail(email); /* derived, never hardcoded */
        setSession(email, registered ? registered.name : prettyName(username));
        write(K.signedUp, true);

        showAlert(
          'loginAlert',
          'ok',
          'Welcome back, ' + username + '!',
          'Signed in successfully. Taking you to your dashboard…'
        );
        if (window.STACKLY && window.STACKLY.toast) {
          window.STACKLY.toast('Welcome back, ' + username + '!', 'ok');
        }
        const redirectBox = $('#loginRedirect');
        if (redirectBox) {
          redirectBox.classList.remove('hide');
          const bar = $('[data-redirect-bar]', redirectBox);
          if (bar) {
            bar.style.transition = 'width 1.6s linear';
            requestAnimationFrame(() => {
              bar.style.width = '100%';
            });
          }
        }

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1700);
      }, 1200);
    });

    $$('[data-google-auth]').forEach((button) => {
      button.addEventListener('click', () => {
        showAlert('loginAlert', 'ok', 'Google sign-in selected', 'Connect your Google account here when OAuth is enabled.');
      });
    });
  }

  /* =======================================================
     SIGN UP
     ======================================================= */
  function initSignup() {
    const form = $('#signupForm');
    if (!form) return;

    const map = [
      { id: 'sName', errId: 'sNameErr', test: V.name, message: 'Please enter your full name.' },
      { id: 'sEmail', errId: 'sEmailErr', test: V.email, message: 'Enter a valid email address.' },
      { id: 'sPhone', errId: 'sPhoneErr', test: V.phone, message: 'Enter a valid phone number (e.g. +91 98765 43210).' },
      { id: 'sPassword', errId: 'sPasswordErr', test: V.password, message: 'Password must be at least 6 characters.' },
      { id: 'sConfirm', errId: 'sConfirmErr', test: (v) => v === ($('#sPassword').value || ''), message: 'Passwords do not match.' }
    ];
    attachLiveValidation(map);

    const pw = $('#sPassword');
    const confirmPw = $('#sConfirm');
    if (pw && confirmPw) {
      confirmPw.addEventListener('input', () => {
        if (confirmPw.value) {
          setState('sConfirm', 'sConfirmErr', confirmPw.value === pw.value, 'Passwords do not match.');
        }
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert('signupAlert');

      const name = ($('#sName').value || '').trim();
      const email = ($('#sEmail').value || '').trim();
      const phone = ($('#sPhone').value || '').trim();
      const role = ($('#sRole').value || '').trim();
      const password = $('#sPassword').value || '';
      const confirm = $('#sConfirm').value || '';
      const terms = $('#sTerms');

      const checks = [
        setState('sName', 'sNameErr', V.name(name), 'Please enter your full name.'),
        setState('sEmail', 'sEmailErr', V.email(email), 'Enter a valid email address.'),
        setState('sPhone', 'sPhoneErr', V.phone(phone), 'Enter a valid phone number (e.g. +91 98765 43210).'),
        setState('sRole', 'sRoleErr', role !== '', 'Please choose a role.'),
        setState('sPassword', 'sPasswordErr', V.password(password), 'Password must be at least 6 characters.'),
        setState('sConfirm', 'sConfirmErr', confirm === password && confirm !== '', 'Passwords do not match.')
      ];

      if (terms && !terms.checked) {
        showAlert('signupAlert', 'err', 'Accept the terms', 'Please agree to the Terms & Conditions and Privacy Policy.');
        terms.focus();
        return;
      }

      if (checks.includes(false)) {
        showAlert('signupAlert', 'err', 'Almost there', 'Please fix the highlighted fields to create your account.');
        const firstBad = form.querySelector('.invalid');
        if (firstBad) firstBad.focus();
        return;
      }

      if (findUser(email)) {
        showAlert('signupAlert', 'err', 'Email already registered', 'This email already has a STACKLY account. Try logging in instead.');
        setState('sEmail', 'sEmailErr', false, 'This email is already registered.');
        return;
      }

      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      btn.disabled = true;

      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;

        const username = usernameFromEmail(email);
        const users = getUsers();
        users.push({
          name: name,
          email: email,
          phone: phone,
          role: role,
          password: password,
          username: username,
          joinedAt: new Date().toISOString()
        });
        write(K.users, users);
        write(K.signedUp, true);
        /* Registration is complete; send the user to login instead of opening the dashboard. */
        clearSession();

        showAlert(
          'signupAlert',
          'ok',
          'Welcome to STACKLY, ' + username + '!',
          'Your account is ready. Sign in to open your dashboard.'
        );
        if (window.STACKLY && window.STACKLY.toast) {
          window.STACKLY.toast('Account created for ' + username + '. Welcome aboard!', 'ok');
        }

        const box = $('#signupSuccess');
        if (box) {
          box.classList.remove('hide');
          const card = $('.ss-card', box);
          if (card) {
            card.classList.remove('pop');
            void card.offsetWidth;
            card.classList.add('pop');
          }
          $$('[data-su-email]', box).forEach((el) => (el.textContent = email));
          $$('[data-su-name]', box).forEach((el) => (el.textContent = name));
          $$('[data-su-avatar]', box).forEach((el) => (el.textContent = initialsOf(username)));
        }
        form.reset();
        Object.values($$('.signup-form .input, .signup-form .select')).forEach((el) => el.classList.remove('valid', 'invalid'));
        setTimeout(() => {
          window.location.href = 'login.html?reason=signup&email=' + encodeURIComponent(email);
        }, 900);
      }, 1400);
    });
  }

  /* =======================================================
     ROUTE GUARD + PERSONALISED DASHBOARD HEADER
     ======================================================= */
  function initDashboardIdentity() {
    const session = getSession();
    const guardMarkers = document.querySelectorAll('[data-auth-guard]');
    const isDashboardPage = document.body.classList.contains('dash-body') || guardMarkers.length > 0;

    if (isDashboardPage && !session) {
      const next = encodeURIComponent(location.pathname.split('/').pop() || 'dashboard.html');
      window.location.replace('login.html?next=' + next);
      return null;
    }

    if (!session) return null;

    const username = session.username; /* derived from email before "@" */
    const name = session.name || prettyName(username);

    $$('[data-user-email]').forEach((el) => (el.textContent = session.email));
    $$('[data-user-name]').forEach((el) => (el.textContent = name));
    $$('[data-user-first]').forEach((el) => (el.textContent = name.split(' ')[0]));
    $$('[data-user-initials]').forEach((el) => (el.textContent = initialsOf(username)));
    $$('[data-welcome]').forEach((el) => (el.innerHTML = 'Welcome back, <span class="welcome">' + username + '</span>!'));
    $$('[data-welcome-plain]').forEach((el) => (el.textContent = 'Welcome back, ' + username + '!'));
    $$('[data-session-date]').forEach((el) => {
      const d = new Date(session.loginAt);
      el.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    });

    return session;
  }

  /* =======================================================
     LOGOUT (with confirmation modal)
     ======================================================= */
  function initLogout() {
    $$('[data-logout]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = $('#logoutModal');
        if (!modal) {
          clearSession();
          window.location.href = 'login.html';
          return;
        }
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
      });
    });

    const modal = $('#logoutModal');
    if (!modal) return;

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }

    /* Cancel → close, stay logged in */
    $$('[data-logout-cancel]', modal).forEach((b) => {
      b.addEventListener('click', () => {
        closeModal();
        if (window.STACKLY && window.STACKLY.toast) {
          window.STACKLY.toast('Logout cancelled — you are still signed in.', 'info');
        }
      });
    });

    /* Clicking backdrop or X also cancels */
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-logout-x]')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });

    /* Confirm → clear session, confirm, redirect */
    $$('[data-logout-confirm]', modal).forEach((b) => {
      b.addEventListener('click', () => {
        const card = $('.modal-card', modal);
        const username = (getSession() || {}).username || '';
        b.classList.add('is-loading');
        clearSession();
        try {
          sessionStorage.removeItem('stackly_silent');
        } catch (err) {
          /* noop */
        }

        setTimeout(() => {
          b.classList.remove('is-loading');
          if (card) {
            card.innerHTML =
              '<div class="modal-ico" style="background:rgba(63,125,92,.14);color:var(--leaf)">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
              '<h3>Logged out</h3>' +
              '<p>Your session has been cleared' +
              (username ? ', see you soon, ' + username + '!' : '. See you soon!') +
              ' Redirecting to the login page…</p>';
          }
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        }, 900);
      });
    });
  }

  /* =======================================================
     LOGIN PAGE: handle ?next= redirect + logged-out notice
     ======================================================= */
  function initLoginPageExtras() {
    if (!$('#loginForm')) return;

    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    const nextBox = $('#loginNext');
    if (nextBox && next) {
      nextBox.classList.remove('hide');
      const label = $('[data-next-name]', nextBox);
      if (label) label.textContent = next;
    }

    const reason = params.get('reason');
    if (reason === 'logout') {
      showAlert('loginAlert', 'ok', 'Logged out successfully', 'You have been signed out of the STACKLY dashboard.');
    } else if (reason === 'signup') {
      showAlert('loginAlert', 'ok', 'Account created', 'Sign in with your new details to continue.');
    }

    /* prefills */
    const emailParam = params.get('email');
    if (emailParam && $('#lEmail')) $('#lEmail').value = emailParam;

  }

  /* =======================================================
     BOOT
     ======================================================= */
  function boot() {
    initLogin();
    initSignup();
    initDashboardIdentity();
    initLogout();
    initLoginPageExtras();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* Public API */
  window.STACKLYAuth = {
    usernameFromEmail,
    prettyName,
    initialsOf,
    getSession,
    setSession,
    clearSession,
    getUsers,
    findUser
  };
})();
