(function () {
  'use strict';

  var LABELS = {
    app: { type: 'تطبيق', action: 'تحميل' },
    web: { type: 'موقع', action: 'فتح' }
  };
  var ROTATE_MS = 5000;

  var state = { filter: 'all', query: '', projects: [] };
  var $ = function (sel) { return document.querySelector(sel); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function openLink(url) { window.open(url, '_blank', 'noopener'); }

  function infoIcon() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>';
    return svg;
  }

  /* ---------- Cards ---------- */
  function isReady(p) { return p.available !== false; }

  function actionLink(p, cls) {
    var label = LABELS[p.type];
    if (p.links && p.links.length && isReady(p)) {
      // مشروع بأكثر من قسم: زر لكل قسم
      return el('div', { class: 'link-group' }, p.links.map(function (l) {
        var a = el('a', { class: cls, href: l.url, target: '_blank', rel: 'noopener', text: l.label });
        a.addEventListener('click', function (e) { e.stopPropagation(); onLaunch(p); });
        return a;
      }));
    }
    if (!isReady(p)) {
      return el('a', { class: cls, 'aria-disabled': 'true', role: 'link', text: 'قريباً' });
    }
    var a = el('a', { class: cls, href: p.url, target: '_blank', rel: 'noopener', text: label.action });
    a.addEventListener('click', function (e) { e.stopPropagation(); onLaunch(p); });
    return a;
  }

  function launch(p) {
    if (!isReady(p) || (p.links && p.links.length)) { openSheet(p); return; }
    openLink(p.url);
    onLaunch(p);
  }

  function onLaunch(p) {
    if (p.type === 'app') toast('بدأ تحميل «' + p.name + '». إذا ما بلّش، شغّل VPN وجرّب مرة تانية.');
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 5000);
  }

  function card(p) {
    var label = LABELS[p.type];
    var action = actionLink(p, 'btn btn-primary');
    var info = el('button', { class: 'info-btn', type: 'button', 'aria-label': 'تفاصيل ' + p.name }, [infoIcon()]);
    var meta = el('div', { class: 'meta' }, [
      el('span', { class: 'badge', text: label.type }),
      p.version ? el('span', { class: 'badge soft', text: 'v' + p.version }) : null,
      p.status === 'dev' ? el('span', { class: 'badge dev', text: 'قيد التطوير' }) : null
    ]);
    var node = el('article', { class: 'card', 'data-id': p.id }, [
      el('img', { class: 'app-icon', src: p.icon, alt: '', loading: 'lazy', width: '76', height: '76' }),
      el('h3', { text: p.name }),
      el('p', { class: 'tagline', text: p.tagline }),
      meta,
      el('div', { class: 'card-actions' }, [action, info])
    ]);
    info.addEventListener('click', function (e) { e.stopPropagation(); openSheet(p, info); });
    node.addEventListener('click', function () { launch(p); });
    return node;
  }

  // البحث في الاسم والوصف والميزات، مع تجاهل الفرق بين الهمزات والتاء المربوطة والألف المقصورة
  function norm(s) {
    return String(s).toLowerCase().replace(/[\u064B-\u0652]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function searchText(p) {
    return norm([p.name, p.tagline, p.what].concat(p.features || []).join(' '));
  }

  function group(p) { return p.status === 'dev' ? 'dev' : p.type; }

  function render() {
    var q = norm(state.query.trim());
    var shown = 0;
    ['app', 'web', 'dev'].forEach(function (key) {
      var grid = $('#grid-' + key);
      var section = document.querySelector('[data-section="' + key + '"]');
      var items = state.projects.filter(function (p) {
        return group(p) === key && (!q || searchText(p).indexOf(q) !== -1);
      });
      var cards = items.map(card);
      cards.forEach(function (c, i) { c.style.setProperty('--i', i); });
      grid.replaceChildren.apply(grid, cards);
      var type = key === 'dev' ? 'app' : key;
      var visible = items.length > 0 && (state.filter === 'all' || state.filter === type);
      section.hidden = !visible;
      if (visible) shown += items.length;
    });
    $('#empty').hidden = shown > 0;
    reveal(document.querySelectorAll('.card'));
  }

  /* ---------- Motion ---------- */
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var observer = !reduceMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 })
    : null;

  // العناصر تظهر بحركة خفيفة عند وصولها للشاشة؛ وبدون دعم الحركة تظهر مباشرة
  function reveal(nodes) {
    Array.prototype.forEach.call(nodes, function (n) {
      if (!observer) { n.classList.add('is-in'); return; }
      n.classList.add('will-reveal');
      observer.observe(n);
    });
  }

  function countUp() {
    var counts = { app: 0, web: 0, dev: 0 };
    state.projects.forEach(function (p) { counts[group(p)]++; });
    document.querySelectorAll('[data-count]').forEach(function (b) {
      var target = counts[b.dataset.count] || 0;
      if (reduceMotion) { b.textContent = target; return; }
      var start = null;
      function step(t) {
        if (!start) start = t;
        var k = Math.min((t - start) / 900, 1);
        b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Banner ---------- */
  function banner(featured) {
    var root = $('#banner');
    if (!featured.length) { root.hidden = true; return; }
    var slides = el('div', { class: 'slides' });
    var dots = el('div', { class: 'dots' });
    var index = 0;
    var timer = null;

    featured.forEach(function (p, i) {
      var btn = actionLink(p, 'btn');
      var slide = el('div', { class: 'slide', role: 'group', 'aria-label': (i + 1) + ' من ' + featured.length }, [
        el('img', { class: 'slide-deco', src: p.icon, alt: '', 'aria-hidden': 'true' }),
        el('img', { class: 'app-icon', src: p.icon, alt: '', width: '120', height: '120' }),
        el('div', { class: 'slide-text' }, [
          el('p', { class: 'slide-kicker', text: 'مميّز · ' + LABELS[p.type].type }),
          el('h2', { text: p.name }),
          el('p', { class: 'slide-tag', text: p.tagline }),
          btn
        ])
      ]);
      slide.style.setProperty('--c', p.color || '#1a6dff');
      slide.addEventListener('click', function () { openSheet(p, slide); });
      slides.appendChild(slide);

      var dot = el('button', { class: 'dot', type: 'button', 'aria-label': 'الشريحة ' + (i + 1) });
      dot.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(dot);
    });

    function go(i) {
      index = (i + featured.length) % featured.length;
      var dir = document.documentElement.dir === 'rtl' ? 1 : -1;
      slides.style.transform = 'translateX(' + (dir * index * 100) + '%)';
      Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('is-active', j === index); });
      Array.prototype.forEach.call(slides.children, function (s, j) {
        s.setAttribute('aria-hidden', j === index ? 'false' : 'true');
        s.classList.toggle('is-current', j === index);
      });
    }
    function restart() {
      clearInterval(timer);
      if (featured.length > 1) timer = setInterval(function () { go(index + 1); }, ROTATE_MS);
    }

    root.replaceChildren(slides, featured.length > 1 ? dots : el('span'));
    root.addEventListener('mouseenter', function () { clearInterval(timer); });
    root.addEventListener('mouseleave', restart);

    var startX = null;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(index + (dx > 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    go(0);
    restart();
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('ar-SY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  /* ---------- Details sheet ---------- */
  var lastFocus = null;

  function row(title, content) {
    var body;
    if (Array.isArray(content)) {
      body = el('ul', {}, content.map(function (t) { return el('li', { text: t }); }));
    } else {
      body = el('p', { text: content });
    }
    return el('div', { class: 'info-row' }, [el('h4', { text: title }), body]);
  }

  function openSheet(p, opener) {
    lastFocus = opener || document.activeElement;
    var label = LABELS[p.type];
    $('#sheetIcon').src = p.icon;
    $('#sheetTitle').textContent = p.name;
    $('#sheetMeta').textContent = label.type + (p.version ? ' · v' + p.version : '') + (p.status === 'dev' ? ' · قيد التطوير' : '') + (p.updated ? ' · آخر تحديث ' + formatDate(p.updated) : '');
    var body = $('#sheetBody');
    body.replaceChildren(
      p.note ? el('p', { class: 'note', text: '⚠️ ' + p.note }) : el('span'),
      row('📌 شو هو', p.what),
      row('⚙️ المواصفات', p.features || []),
      row('👥 لمين', p.audience),
      row('🎯 الغاية', p.goal),
      (p.whatsNew && p.whatsNew.length) ? row('✨ شو الجديد', p.whatsNew) : el('span')
    );
    body.scrollTop = 0;
    var old = $('#sheetAction');
    var action = actionLink(p, 'btn btn-primary btn-wide');
    action.id = 'sheetAction';
    old.replaceWith(action);
    $('#sheetHint').hidden = !(p.type === 'app' && isReady(p));
    $('#backdrop').hidden = false;
    $('#sheet').hidden = false;
    document.body.classList.add('no-scroll');
    $('#sheetClose').focus();
  }

  function closeSheet() {
    if ($('#sheet').hidden) return;
    $('#sheet').hidden = true;
    $('#backdrop').hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    var t = document.documentElement.dataset.theme;
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeColor();
  }
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = currentTheme() === 'dark' ? '#0b0f17' : '#f4f6fb';
  }

  /* ---------- Wire up ---------- */
  function bind() {
    $('#search').addEventListener('input', function (e) { state.query = e.target.value; render(); });
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.filter = chip.dataset.filter;
        document.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        render();
      });
    });
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#backdrop').addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    $('#year').textContent = new Date().getFullYear();
    syncThemeColor();
  }

  function init(data) {
    state.projects = data.projects || [];
    var byId = {};
    state.projects.forEach(function (p) { byId[p.id] = p; });
    banner((data.featured || []).map(function (id) { return byId[id]; }).filter(Boolean));
    if (data.contact) {
      $('#tg').href = data.contact.telegram;
      $('#wa').href = data.contact.whatsapp;
      if (data.contact.channel) $('#channel').href = data.contact.channel;
    }
    render();
    countUp();
    reveal(document.querySelectorAll('.reveal'));
  }

  bind();
  fetch('projects.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function () {
      $('#empty').textContent = 'تعذّر تحميل المشاريع، حدّث الصفحة.';
      $('#empty').hidden = false;
    });
})();
