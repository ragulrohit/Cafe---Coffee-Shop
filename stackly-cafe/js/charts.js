/* =========================================================
   STACKLY — charts.js
   Lightweight dependency-free canvas charts:
   · Donut / Pie (interactive)
   · Line / Area
   · Bar (grouped & stacked)
   · Horizontal bars
   All are DPR-aware and resize responsively.
   ========================================================= */
(function () {
  'use strict';

  const PALETTE = ['#c2542f', '#e08a3c', '#3f7d5c', '#b4436b', '#6f4429', '#f0a44b', '#59a37c', '#8a5a3b'];
  const FONT = '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif';

  const $ = (s, c) => (c || document).querySelector(s);
  const DEFAULT_DONUT_H = 260;

  function prep(canvas, height) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width || canvas.parentElement.clientWidth || 300, 200);
    const h = height || Math.max(rect.height, 200);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* =======================================================
     DONUT / PIE CHART
     data: [{ label, value, color? }]
     opts: { cutout, centerValue, centerLabel, interactive }
     ======================================================= */
  function donut(canvas, data, opts) {
    opts = opts || {};
    if (!canvas || !data || !data.length) return;
    const { ctx, w, h } = prep(canvas, opts.height || DEFAULT_DONUT_H);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 16;
    const inner = radius * (opts.cutout || 0.62);
    const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;

    let start = -Math.PI / 2;
    const sliceRects = [];

    data.forEach((d, i) => {
      const angle = (Math.max(0, d.value) / total) * Math.PI * 2;
      const end = start + angle;
      const color = d.color || PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.arc(cx, cy, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.94;
      ctx.fill();

      /* separator */
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();

      /* label inside ring */
      if (angle > 0.28) {
        const mid = (start + end) / 2;
        const lr = (radius + inner) / 2;
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round((d.value / total) * 100) + '%', cx + Math.cos(mid) * lr, cy + Math.sin(mid) * lr);
      }

      sliceRects.push({ start, end, color, label: d.label, value: d.value, pct: Math.round((d.value / total) * 100) });
      start = end;
    });

    /* hover explode */
    if (opts.interactive !== false) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius || dist < inner) return;
        let a = Math.atan2(dy, dx);
        if (a < -Math.PI / 2) a += Math.PI * 2;
        const hit = sliceRects.find((s) => a >= s.start && a <= s.end);
        const center = $('[data-donut-center-value]');
        const labelEl = $('[data-donut-center-label]');
        if (hit && center) center.textContent = hit.pct + '%';
        if (hit && labelEl) labelEl.textContent = hit.label;
      };
      canvas.onmouseleave = () => {
        const center = $('[data-donut-center-value]');
        const labelEl = $('[data-donut-center-label]');
        if (center && opts.centerValue !== undefined) center.textContent = opts.centerValue;
        if (labelEl && opts.centerLabel) labelEl.textContent = opts.centerLabel;
      };
    }

    return sliceRects;
  }

  /* =======================================================
     LINE / AREA CHART
     labels: [], series: [{ name, data:[], color? }]
     opts.rightAxis = true  → second series gets its own scale
     ======================================================= */
  function line(canvas, labels, series, opts) {
    opts = opts || {};
    if (!canvas || !labels) return;
    const { ctx, w, h } = prep(canvas, opts.height);
    const dual = !!opts.rightAxis && series.length > 1;
    const padL = opts.padL || 46;
    const padR = dual ? 46 : 14;
    const padT = 16;
    const padB = 30;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    /* each series keeps its own min/max so small series stay visible */
    const bounds = series.map((s) => {
      const lo = opts.min !== undefined ? opts.min : Math.min.apply(null, s.data.concat([0]));
      const hi = opts.max !== undefined ? opts.max : Math.max.apply(null, s.data.concat([1]));
      return { lo: lo, hi: hi === lo ? lo + 1 : hi };
    });

    const gridMax = opts.max !== undefined ? opts.max : Math.max.apply(null, bounds.map((b) => b.hi));
    const gridMin = opts.min !== undefined ? opts.min : Math.min.apply(null, bounds.map((b) => b.lo));
    const range = gridMax - gridMin || 1;
    const gridLines = opts.gridLines || 4;

    /* grid + y labels (left axis belongs to the first series) */
    ctx.font = '500 10px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (ch / gridLines) * i;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(75,46,28,.09)';
      ctx.lineWidth = 1;
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + cw, y);
      ctx.stroke();
      const val = gridMax - (range / gridLines) * i;
      ctx.fillStyle = '#8d786a';
      ctx.fillText(opts.fmtY ? opts.fmtY(val) : Math.round(val), padL - 8, y);
    }

    /* right axis for the second series */
    if (dual) {
      const rb = bounds[bounds.length - 1];
      const rr = rb.hi - rb.lo || 1;
      ctx.textAlign = 'left';
      for (let i = 0; i <= gridLines; i++) {
        const y = padT + (ch / gridLines) * i;
        const val = rb.hi - (rr / gridLines) * i;
        ctx.fillStyle = opts.rightColor || '#b06f2c';
        ctx.fillText(opts.fmtRight ? opts.fmtRight(val) : Math.round(val), padL + cw + 8, y);
      }
    }

    const stepX = labels.length > 1 ? cw / (labels.length - 1) : cw;
    const px = (i) => padL + stepX * i;

    series.forEach((s, si) => {
      const color = s.color || PALETTE[si % PALETTE.length];
      const b = bounds[si];
      const sr = b.hi - b.lo || 1;
      const py = (v) => padT + ch - ((v - b.lo) / sr) * ch;

      /* area */
      if (opts.area !== false) {
        const g = ctx.createLinearGradient(0, padT, 0, padT + ch);
        g.addColorStop(0, hexA(color, 0.3));
        g.addColorStop(1, hexA(color, 0.02));
        ctx.beginPath();
        ctx.moveTo(px(0), py(s.data[0]));
        s.data.forEach((v, i) => ctx.lineTo(px(i), py(v)));
        ctx.lineTo(px(s.data.length - 1), padT + ch);
        ctx.lineTo(px(0), padT + ch);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      }

      /* line */
      ctx.beginPath();
      s.data.forEach((v, i) => {
        const x = px(i);
        const y = py(v);
        if (i === 0) ctx.moveTo(x, y);
        else {
          const xc = (px(i - 1) + x) / 2;
          ctx.bezierCurveTo(xc, py(s.data[i - 1]), xc, y, x, y);
        }
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      /* points */
      s.data.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(px(i), py(v), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      });
    });

    /* x labels */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#8d786a';
    ctx.font = '500 10px ' + FONT;
    const every = labels.length > 10 ? 2 : 1;
    labels.forEach((l, i) => {
      if (i % every !== 0 && i !== labels.length - 1) return;
      ctx.fillText(l, px(i), padT + ch + 9);
    });
  }

  /* =======================================================
     BAR CHART (grouped)
     labels: [], series: [{ name, data:[] }]
     ======================================================= */
  function bar(canvas, labels, series, opts) {
    opts = opts || {};
    if (!canvas) return;
    const { ctx, w, h } = prep(canvas, opts.height);
    const padL = opts.padL || 46;
    const padR = 14;
    const padT = 18;
    const padB = 32;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    const all = series.flatMap((s) => s.data);
    const maxV = opts.max !== undefined ? opts.max : Math.max.apply(null, all.concat([1]));
    const range = maxV || 1;
    const gridLines = opts.gridLines || 4;

    ctx.font = '500 10px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (ch / gridLines) * i;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(75,46,28,.09)';
      ctx.lineWidth = 1;
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#8d786a';
      ctx.fillText(opts.fmtY ? opts.fmtY(maxV - (range / gridLines) * i) : Math.round(maxV - (range / gridLines) * i), padL - 8, y);
    }

    const slot = cw / labels.length;
    const inner = Math.min(slot * 0.68, opts.barMax || 46);
    const gap = series.length > 1 ? 5 : 0;
    const bw = Math.max((inner - gap * (series.length - 1)) / series.length, 4);

    labels.forEach((l, i) => {
      const groupX = padL + slot * i + (slot - inner) / 2;
      series.forEach((s, si) => {
        const v = s.data[i] || 0;
        const bh = (v / range) * ch;
        const x = groupX + si * (bw + gap);
        const y = padT + ch - bh;
        const color = s.color || PALETTE[si % PALETTE.length];
        const g = ctx.createLinearGradient(0, y, 0, padT + ch);
        g.addColorStop(0, color);
        g.addColorStop(1, hexA(color, 0.55));
        roundRect(ctx, x, y, bw, Math.max(bh, 2), Math.min(7, bw / 2));
        ctx.fillStyle = g;
        ctx.fill();
      });
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#8d786a';
    labels.forEach((l, i) => {
      ctx.fillText(l, padL + slot * i + slot / 2, padT + ch + 10);
    });
  }

  /* =======================================================
     SPARKLINE (tiny line)
     ======================================================= */
  function sparkline(canvas, data, color) {
    if (!canvas || !data) return;
    const { ctx, w, h } = prep(canvas, opts_h(canvas));
    const max = Math.max.apply(null, data.concat([1]));
    const min = Math.min.apply(null, data.concat([0]));
    const range = max - min || 1;
    const step = w / Math.max(data.length - 1, 1);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color || '#c2542f';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function opts_h(canvas) {
    const r = canvas.getBoundingClientRect();
    return Math.max(r.height, 40);
  }

  /* ---------- colour helper ---------- */
  function hexA(hex, alpha) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* =======================================================
     REGISTRY — data used across the dashboard
     ======================================================= */
  const DATA = {
    categories: [
      { label: 'Coffee', value: 4820, color: '#c2542f' },
      { label: 'Snacks', value: 2140, color: '#e08a3c' },
      { label: 'Desserts', value: 1760, color: '#b4436b' },
      { label: 'Tea', value: 980, color: '#3f7d5c' }
    ],
    weekLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekRevenue: [4200, 5350, 4980, 6120, 7350, 9480, 8620],
    weekOrders: [186, 214, 198, 246, 288, 362, 331],
    monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthRevenue: [38200, 41800, 44600, 42100, 49800, 52400, 56700, 55300, 61200, 64800, 69300, 74800],
    monthOrders: [1480, 1620, 1740, 1690, 1930, 2060, 2210, 2180, 2390, 2540, 2710, 2880],
    yearLabels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    yearRevenue: [286000, 348000, 412000, 498000, 596000, 748000],
    yearCustomers: [8200, 10400, 12900, 15800, 19400, 23600],
    coffeeNames: ['Espresso', 'Cappuccino', 'Latte', 'Mocha', 'Americano', 'Cold Brew'],
    coffeeUnits: [1480, 1120, 980, 720, 640, 520],
    dailyLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
    dailyRevenue: [3100, 2850, 3400, 3620, 3180, 4020, 4480, 4290, 3860, 4710, 5240, 4980, 5560, 6120]
  };

  /* =======================================================
     AUTO INIT — canvases declare their data via data-chart
     ======================================================= */
  function autoInit() {
    document.querySelectorAll('canvas[data-chart]').forEach((canvas) => {
      const type = canvas.dataset.chart;
      const height = parseInt(canvas.dataset.height || '0', 10) || undefined;

      if (type === 'donut') {
        donut(canvas, DATA.categories, {
          height: height || 260,
          centerValue: '9.7K',
          centerLabel: 'Items Sold'
        });
      } else if (type === 'line-week') {
        line(canvas, DATA.weekLabels, [{ name: 'Revenue', data: DATA.weekRevenue }], { height: height || 260 });
      } else if (type === 'line-month') {
        line(
          canvas,
          DATA.monthLabels,
          [
            { name: 'Revenue', data: DATA.monthRevenue, color: '#c2542f' },
            { name: 'Orders', data: DATA.monthOrders, color: '#e08a3c' }
          ],
          { height: height || 300, rightAxis: true, rightColor: '#e08a3c', area: false }
        );
      } else if (type === 'bar-week') {
        bar(canvas, DATA.weekLabels, [{ name: 'Orders', data: DATA.weekOrders, color: '#3f7d5c' }], { height: height || 260 });
      } else if (type === 'bar-coffee') {
        bar(
          canvas,
          DATA.coffeeNames,
          [{ name: 'Cups', data: DATA.coffeeUnits, color: '#c2542f' }],
          { height: height || 300 }
        );
      } else if (type === 'line-customer') {
        line(canvas, DATA.yearLabels, [{ name: 'Customers', data: DATA.yearCustomers, color: '#3f7d5c' }], { height: height || 260 });
      } else if (type === 'line-daily') {
        line(canvas, DATA.dailyLabels, [{ name: 'Revenue', data: DATA.dailyRevenue }], { height: height || 260 });
      } else if (type === 'bar-month') {
        bar(canvas, DATA.monthLabels, [{ name: 'Revenue', data: DATA.monthRevenue, color: '#c2542f' }], { height: height || 280 });
      }
    });

    /* legend toggles for donut */
    document.querySelectorAll('[data-legend-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => btn.classList.toggle('off'));
    });
  }

  /* ---------- resize handling (debounced) ---------- */
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      document.querySelectorAll('canvas[data-chart]').forEach((c) => {
        if (!c.isConnected) return;
        const type = c.dataset.chart;
        const height = parseInt(c.dataset.height || '0', 10) || undefined;
        if (type === 'donut') donut(c, DATA.categories, { height: height || 260 });
        else if (type === 'line-week') line(c, DATA.weekLabels, [{ name: 'Revenue', data: DATA.weekRevenue }], { height: height || 260 });
        else if (type === 'line-month')
          line(
            c,
            DATA.monthLabels,
            [
              { name: 'Revenue', data: DATA.monthRevenue, color: '#c2542f' },
              { name: 'Orders', data: DATA.monthOrders, color: '#e08a3c' }
            ],
            { height: height || 300, rightAxis: true, rightColor: '#e08a3c', area: false }
          );
        else if (type === 'bar-week') bar(c, DATA.weekLabels, [{ name: 'Orders', data: DATA.weekOrders, color: '#3f7d5c' }], { height: height || 260 });
        else if (type === 'bar-coffee') bar(c, DATA.coffeeNames, [{ name: 'Cups', data: DATA.coffeeUnits, color: '#c2542f' }], { height: height || 300 });
        else if (type === 'line-customer') line(c, DATA.yearLabels, [{ name: 'Customers', data: DATA.yearCustomers, color: '#3f7d5c' }], { height: height || 260 });
        else if (type === 'line-daily') line(c, DATA.dailyLabels, [{ name: 'Revenue', data: DATA.dailyRevenue }], { height: height || 260 });
        else if (type === 'bar-month') bar(c, DATA.monthLabels, [{ name: 'Revenue', data: DATA.monthRevenue, color: '#c2542f' }], { height: height || 280 });
      });
    }, 200);
  });

  /* ---------- boot ---------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();

  window.STACKLYCharts = { donut, line, bar, sparkline, DATA, PALETTE };
})();