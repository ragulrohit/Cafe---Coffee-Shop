/* =========================================================
   STACKLY — animations.js
   Scroll reveal, counters, parallax, tilt, ripples, bars
   ========================================================= */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. SCROLL REVEAL (IntersectionObserver) ---------- */
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseFloat(el.dataset.revealDelay || 0);
          setTimeout(() => el.classList.add('in'), delay * 1000);
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    items.forEach((el) => io.observe(el));
  }

  /* Auto-stagger children of [data-reveal-group] */
  function initRevealGroups() {
    document.querySelectorAll('[data-reveal-group]').forEach((group) => {
      const step = parseFloat(group.dataset.revealGroup || 0.08);
      Array.from(group.children).forEach((child, i) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', 'up');
        if (!child.dataset.revealDelay) child.dataset.revealDelay = (i * step).toFixed(2);
      });
    });
  }

  /* ---------- 2. ANIMATED COUNTERS ---------- */
  function animateValue(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = parseInt(el.dataset.duration || '1800', 10);

    if (reduced || isNaN(target)) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }

    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;

    if (!('IntersectionObserver' in window)) {
      nums.forEach(animateValue);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          animateValue(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.4 }
    );
    nums.forEach((el) => io.observe(el));
  }

  /* ---------- 3. SCROLL PROGRESS BAR ---------- */
  function initScrollProgress() {
    const bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    let ticking = false;

    function update() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- 4. PROGRESS BARS (animate width from data) ---------- */
  function initBars() {
    const bars = document.querySelectorAll('[data-bar]');
    if (!bars.length) return;

    const fill = (el) => {
      const v = el.dataset.bar;
      el.style.width = v.endsWith('%') ? v : v + '%';
    };

    if (!('IntersectionObserver' in window) || reduced) {
      bars.forEach(fill);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          fill(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.3 }
    );
    bars.forEach((el) => io.observe(el));
  }

  /* ---------- 5. CARD TILT (subtle 3D on pointer) ---------- */
  function initTilt() {
    if (reduced) return;
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt || 6);
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ---------- 6. BUTTON RIPPLE ---------- */
  function initRipple() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn, .add-cart, .filter-btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = e.clientX - r.left - size / 2 + 'px';
      span.style.top = e.clientY - r.top - size / 2 + 'px';
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      if (getComputedStyle(btn).overflow !== 'hidden') btn.style.overflow = 'hidden';
      btn.appendChild(span);
      setTimeout(() => span.remove(), 640);
    });
  }

  /* ---------- 7. PARALLAX FLOATING ELEMENTS ---------- */
  function initParallax() {
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length || reduced) return;
    let ticking = false;

    function update() {
      const vh = window.innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax || 0.12);
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- 8. ANIMATED BEAN POSITIONS (decor) ---------- */
  function initDecorBeans() {
    const wrap = document.querySelectorAll('[data-beans]');
    wrap.forEach((host) => {
      if (reduced) return;
      for (let i = 0; i < 8; i++) {
        const b = document.createElement('span');
        b.className = 'bean float-bean';
        const size = 12 + Math.random() * 26;
        b.style.width = b.style.height = size + 'px';
        b.style.left = 3 + Math.random() * 92 + '%';
        b.style.top = 4 + Math.random() * 88 + '%';
        b.style.opacity = 0.07 + Math.random() * 0.12;
        b.style.animationDelay = -Math.random() * 9 + 's';
        b.style.animationDuration = 7 + Math.random() * 7 + 's';
        host.appendChild(b);
      }
    });
  }

  /* ---------- 9. TIMELINE ACTIVE STEP ---------- */
  function initTimeline() {
    document.querySelectorAll('[data-timeline]').forEach((timeline) => {
      const items = timeline.querySelectorAll('.tl-item');
      if (!items.length || !('IntersectionObserver' in window)) return;

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              items.forEach((i) => i.classList.remove('active'));
              e.target.classList.add('active');
            }
          });
        },
        { threshold: 0.55, rootMargin: '-40px 0px -40px 0px' }
      );
      items.forEach((i) => io.observe(i));
    });
  }

  /* ---------- 10. PAGE LOADER ---------- */
  function initLoader() {
    const loader = document.querySelector('.page-loader');
    if (!loader) return;
    const hide = () => {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 700);
    };
    if (document.readyState === 'complete') setTimeout(hide, 320);
    else window.addEventListener('load', () => setTimeout(hide, 320));
    setTimeout(hide, 2600); // safety net
  }

  /* ---------- 11. PAGE ENTER ---------- */
  function initPageEnter() {
    document.body.classList.add('page-enter');
  }

  /* ---------- 12. IMAGE FADE-IN ON LOAD ---------- */
  function initImageFade() {
    document.querySelectorAll('img').forEach((img) => {
      img.classList.add('img-loading');
      const done = () => img.classList.add('img-ready');
      if (img.complete && img.naturalWidth > 0) setTimeout(done, 40);
      else {
        img.addEventListener('load', () => setTimeout(done, 40), { once: true });
        img.addEventListener('error', () => done(), { once: true });
      }
    });
  }

  /* ---------- BOOT ---------- */
  function boot() {
    initPageEnter();
    initLoader();
    initRevealGroups();
    initReveal();
    initCounters();
    initBars();
    initScrollProgress();
    initTilt();
    initRipple();
    initParallax();
    initDecorBeans();
    initTimeline();
    initImageFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.STACKLYAnim = { animateValue, initReveal, initCounters, initBars };
})();
