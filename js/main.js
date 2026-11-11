/* Trisian home and secondary pages: the motion layer. No libraries.
   CSS draws; this file adds classes and numbers, and runs one rAF loop for everything tied to scroll.
   Under prefers-reduced-motion: no loops, no counters, no parallax, no scroll-linked scaling, no word reveals.
   Every graphic is left in its final state. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const ease = t => 1 - Math.pow(1 - t, 3);                         // ease-out cubic
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const watch = (els, cb, threshold = 0.15) => {
    if (!hasIO) { els.forEach(e => cb(e)); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } }), { threshold });
    els.forEach(e => io.observe(e));
  };

  /* ---------- enter-view: reveals, staggers, word splits, anim containers ---------- */
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 5))));
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}"><span>${w}</span></span>`).join(' ');
  });
  // blocks trigger at 25% in view (5.4); anything taller than three viewports can never reach that, so it goes at 5%
  const tall = e => e.getBoundingClientRect().height > innerHeight * 3;
  const blocks = $$('[data-reveal],[data-stagger],[data-split],.vs-mid,.cert');
  const onIn = e => { e.classList.add('in'); if (e.hasAttribute('data-stagger')) setTimeout(() => e.classList.add('settled'), 1800); };
  watch(blocks.filter(e => !tall(e)), onIn, 0.25);
  watch(blocks.filter(tall), onIn, 0.05);
  watch($$('.anim,[data-viz]'), e => e.classList.add('in'), 0.35);

  /* ---------- hero: fit the line to 75% of the viewport width ----------
     This routine only sets font-size on #h1. It measures the rendered line at a 100px probe size, then scales.
     Desktop: one line. Under 768px the line breaks into two and the wider one fills 75vw (minimum 44px). */
  const hero = $('.hero'), h1 = $('#h1');
  const fit = () => {
    if (!h1) return;
    const box = $('.h1-fit', h1), target = document.documentElement.clientWidth * 0.75;
    h1.style.fontSize = '100px';
    const w = innerWidth < 768 ? Math.max(...[...box.children].map(c => c.getBoundingClientRect().width)) : box.getBoundingClientRect().width;
    h1.style.fontSize = Math.max(44, 100 * target / w).toFixed(2) + 'px';
    h1.classList.add('fit');
  };
  if (hero) {
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let rt; addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(fit); });
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('go')));
  }

  /* ---------- questions: open and close with the rows technique (css), not a height tween ---------- */
  $$('.faq-list details').forEach(d => {
    const sum = $('summary', d);
    sum.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      if (!d.open) { d.open = true; requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open'))); }
      else { d.classList.remove('is-open'); setTimeout(() => { d.open = false; }, 300); }
    });
  });

  /* ---------- counters (receipts), run once. Only 28 and 9 count: a response time that counts up from zero is not a response time. ---------- */
  const grid = $('#rcGrid');
  if (grid && !reduce) {
    const nums = $$('[data-count]', grid);
    nums.forEach(n => { n.textContent = '0'; });
    watch([grid], () => {
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - t0) / 1200);
        nums.forEach(n => { n.textContent = Math.round(ease(p) * +n.dataset.count); });
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 0.5);
  }

  /* ---------- certificate row: about 60px per second ---------- */
  const certSet = $('.cert-set');
  if (certSet && !reduce) {
    const speed = () => { const w = certSet.getBoundingClientRect().width; if (w) $('.cert-track').style.setProperty('--mq-dur', (w / 60).toFixed(1) + 's'); };
    speed(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(speed); addEventListener('resize', speed);
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches) {
    $$('[data-magnet]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${((e.clientX - r.left - r.width / 2) * .14).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .22).toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  /* ---------- isometric icons: one rule for all 68 (Directive v3 section 6) ----------
     Entry once (60ms stagger per icon in a group, capped at 6), ambient float only while the host is on screen,
     cursor lean through one delegated pointer handler (capped at 6px), a one-off lift on tap for touch.
     Under reduced motion none of this runs and the icons simply appear. */
  const hosts = $$('[data-ico-host]').filter(h => !h.classList.contains('hs'));
  hosts.forEach((h, n) => {
    const group = h.parentElement, sibs = [...group.children].filter(c => c.hasAttribute('data-ico-host'));
    const i = Math.min(sibs.indexOf(h), 5);
    h.style.setProperty('--gi', i);
    $$('.ico', h).forEach(ic => { ic.style.setProperty('--i', i); ic.style.setProperty('--fi', n % 12); });
  });
  if (hosts.length) {
    if (!hasIO || reduce) hosts.forEach(h => h.classList.add('is-in'));
    else {
      const io = new IntersectionObserver(es => es.forEach(en => {
        en.target.classList.toggle('is-live', en.isIntersecting);
        if (en.isIntersecting && !en.target.classList.contains('is-in')) { en.target.classList.add('is-in'); setTimeout(() => en.target.classList.add('done'), 900); }
      }), { threshold: 0.2 });
      hosts.forEach(h => io.observe(h));
    }
  }
  if (!reduce && !document.body.classList.contains('home') && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let cur = null, px = 0, py = 0, raf = 0;
    const apply = () => {
      raf = 0;
      if (cur) $$('.ico', cur).forEach(ic => { ic.style.setProperty('--px', px.toFixed(3)); ic.style.setProperty('--py', py.toFixed(3)); });
    };
    const reset = h => { if (h) $$('.ico', h).forEach(ic => { ic.style.setProperty('--px', 0); ic.style.setProperty('--py', 0); }); };
    document.addEventListener('pointermove', e => {
      const h = e.target.closest && e.target.closest('[data-ico-host]');
      if (h !== cur) { reset(cur); cur = h; }
      if (!h) return;
      const r = h.getBoundingClientRect();
      px = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      py = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { reset(cur); cur = null; });
  } else if (!reduce) {
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      const h = e.target.closest && e.target.closest('[data-ico-host]');
      if (!h) return;
      h.classList.add('is-tap'); setTimeout(() => h.classList.remove('is-tap'), 450);
    }, { passive: true });
  }

  /* ---------- scenes: play once at 60% in view; scene 1 replays on click or tap; layers lean toward a fine pointer ---------- */
  const scenes = $$('.scene-card[data-scene],.versus[data-scene]').filter(c => !c.hasAttribute('data-loop'));
  const playScene = c => { c.classList.remove('play'); void c.getBoundingClientRect(); c.classList.add('play'); };
  // each scene plays once, as it scrolls into view and rests on its last frame (no looping). A tall element (the comparison stacks on
  // a phone) can never be 60% in view, so it triggers at 25%.
  if (reduce || !hasIO) scenes.forEach(c => c.classList.add('play'));
  else scenes.forEach(c => watch([c], playScene, c.getBoundingClientRect().height > innerHeight * 0.85 ? 0.25 : 0.6));
  // a click or tap on a scene plays it again (the hidden replay button does the same for keyboard users)
  if (!reduce) scenes.filter(c => c.hasAttribute('data-once')).forEach(c => c.addEventListener('click', e => { if (c.classList.contains('play') && !e.target.closest('.s3-row')) playScene(c); }));
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let cur = null, raf = 0, lx = 0, ly = 0;
    const lean = () => { raf = 0; if (cur) { cur.style.setProperty('--lx', lx.toFixed(3)); cur.style.setProperty('--ly', ly.toFixed(3)); } };
    $$('.scene-card[data-scene]').forEach(c => {
      c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); cur = c; lx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); ly = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1); if (!raf) raf = requestAnimationFrame(lean); }, { passive: true });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--lx', 0); c.style.setProperty('--ly', 0); });
    });
  }

  /* ---------- scene 3: hover, focus or tap a row and its pair lights on the other sheet ---------- */
  const zm = $('.sc-markup');
  if (zm) {
    const set = i => { [0, 1, 2].forEach(n => zm.classList.toggle('pair-' + n, n === i)); };
    $$('.s3-row', zm).forEach(r => {
      const i = +r.dataset.row;
      r.addEventListener('pointerenter', () => set(i)); r.addEventListener('pointerleave', () => set(-1));
      r.addEventListener('focus', () => set(i)); r.addEventListener('blur', () => set(-1));
      r.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') set(i); });
    });
    document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('.s3-row')) set(-1); }, { passive: true });
  }

  /* ---------- the regulation row: a visible pause control (WCAG 2.2.2) ---------- */
  const cert = $('#cert'), pauseBtn = cert && $('.cert-pause', cert);
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    const on = cert.classList.toggle('is-paused');
    pauseBtn.setAttribute('aria-pressed', on);
    $('span', pauseBtn).textContent = on ? 'Play' : 'Pause';
  });

  /* ---------- depth roots: the nearest [data-scene] or section of every .depth layer. --p is written on the root, once per frame. ---------- */
  // scenes that play once do not drift with the scroll while they animate; only the footer wordmark and unscripted layers do
  const depthRoots = [...new Set($$('.depth').filter(d => !d.closest('[data-once]')).map(d => d.closest('[data-scene],section') || d.parentElement))];
  const liveRoots = new Set();
  if (depthRoots.length && hasIO && !reduce) {
    const dio = new IntersectionObserver(es => es.forEach(en => {
      en.target.classList.toggle('depth-live', en.isIntersecting);
      en.isIntersecting ? liveRoots.add(en.target) : liveRoots.delete(en.target);
    }), { rootMargin: '10% 0px' });
    depthRoots.forEach(r => dio.observe(r));
  }

  /* ---------- how we take it from here: geometry for the self-running loop (no scroll-scrubbing anywhere) ----------
     The line and the dot are placed from the real node centres, and each node's fill time follows the dot's distance. */
  const hsteps = $('#hsteps'), hsNodes = hsteps ? $$('.hs', hsteps) : [];
  const measureHs = () => {
    if (!hsteps) return;
    const vertical = innerWidth < 1024, box = hsteps.getBoundingClientRect();
    const pts = hsNodes.map(h => { const r = $('.hs-node', h).getBoundingClientRect(); return vertical ? r.top + r.height / 2 - box.top : r.left + r.width / 2 - box.left; });
    const a = pts[0], b = pts[pts.length - 1], fill = $('.hs-fill', hsteps), dot = $('.hs-dot', hsteps);
    if (vertical) {
      fill.style.cssText = `left:19px;right:auto;top:${a}px;height:${b - a}px;width:1.5px`;
      dot.style.cssText = `left:19px;top:${a}px`;
      hsteps.style.setProperty('--hy', (b - a) + 'px'); hsteps.style.setProperty('--hx', '0px');
    } else {
      fill.style.cssText = `left:${a}px;right:auto;width:${b - a}px`;
      dot.style.cssText = `left:${a}px`;
      hsteps.style.setProperty('--hx', (b - a) + 'px'); hsteps.style.setProperty('--hy', '0px');
    }
    hsNodes.forEach((h, i) => $('.hs-node', h).style.setProperty('--nd', Math.round(400 + 3000 * (pts[i] - a) / Math.max(1, b - a)) + 'ms'));
  };
  if (hsteps && !reduce) { measureHs(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHs); addEventListener('resize', measureHs); }

  /* ---------- loops: the three truth scenes and how we take it from here ----------
     Each loop starts at 60% in view, runs one cycle (adds .play, waits the cycle length, adds it again), pauses when it leaves the screen,
     on keyboard focus inside it, and on its pause button (WCAG 2.2.2). Under reduced motion nothing loops: the static end frame shows. */
  const CYCLE = { 'a-clean-start': 5000, 'same-foundation': 4200, 'zero-markup': 4400, meeting: 8000, how: 5000 };
  const loops = reduce ? [] : $$('[data-loop]').map(el => ({ el, ms: CYCLE[el.dataset.scene] || 5000, seen: false, vis: false, hold: false, focus: false, hover: false, running: false, count: 0, t: 0, start: 0, left: 0 }));
  const MAX_CYCLES = 6;   // each loop stops after six cycles and rests on its final frame (v7 6.2)
  const cycle = l => { l.el.classList.remove('play', 'is-rest'); void l.el.getBoundingClientRect(); l.el.classList.add('play'); l.count++; l.left = l.ms; l.start = performance.now(); arm(l); };
  const arm = l => { clearTimeout(l.t); l.t = setTimeout(() => { if (!l.running) return; if (l.count >= MAX_CYCLES) { l.el.classList.add('is-rest'); l.running = false; l.done = true; } else cycle(l); }, l.left); };
  const sync = l => {
    if (l.done) return;
    const want = l.seen && l.vis && !l.hold && !l.focus && !l.hover;
    if (want && !l.running) { l.running = true; l.el.classList.remove('is-paused'); if (!l.el.classList.contains('play')) cycle(l); else { l.start = performance.now(); arm(l); } }
    else if (!want && l.running) { l.running = false; clearTimeout(l.t); l.left = Math.max(0, l.left - (performance.now() - l.start)); l.el.classList.add('is-paused'); }
  };
  loops.forEach(l => {
    if (hasIO) new IntersectionObserver(es => es.forEach(en => { if (en.intersectionRatio >= 0.6) l.seen = true; l.vis = en.intersectionRatio > 0; sync(l); }), { threshold: [0, 0.6] }).observe(l.el);
    else { l.seen = l.vis = true; sync(l); }
    const pb = $('.pause-btn', l.el);
    if (pb) pb.addEventListener('click', () => { l.hold = !l.hold; pb.setAttribute('aria-pressed', l.hold); sync(l); });
    l.el.addEventListener('focusin', e => { if (e.target.matches && e.target.matches(':focus-visible') && !e.target.closest('.pause-btn')) { l.focus = true; sync(l); } });
    l.el.addEventListener('focusout', () => { l.focus = false; sync(l); });
    l.el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { l.hover = true; sync(l); } });
    l.el.addEventListener('pointerleave', () => { l.hover = false; sync(l); });
  });

  /* ---------- the meeting comparison and one partner: timed once on entry, replay on click ---------- */
  $$('[data-replay]').forEach(b => b.addEventListener('click', () => { const t = $(b.dataset.replay); if (t) playScene(t); }));
  const art = $('#sc-one-partner'); if (art && !reduce) art.addEventListener('click', e => { if (!e.target.closest('.replay-sr')) playScene(art); });

  /* ---------- one loop for everything tied to scroll ---------- */
  const navWrap = $('#navWrap'), parallax = $$('[data-parallax]'), pimgs = $$('[data-parallax-img]');
  const navLinks = $$('.nav-links a').filter(a => /#(seats|offer)$/.test(a.getAttribute('href') || ''));
  const secOf = id => (id === 'seats' ? [$('#seats')] : [$('#offer'), $('#partner')]).filter(Boolean);
  const footMark = $('.foot-mark');
  let queued = false;
  const frame = () => {
    queued = false;
    const y = scrollY, H = innerHeight, max = document.documentElement.scrollHeight - H;
    if (navWrap) { navWrap.classList.toggle('scrolled', y > 8); navWrap.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0); }
    navLinks.forEach(a => {
      const id = a.getAttribute('href').split('#')[1];
      const on = secOf(id).some(s => { const r = s.getBoundingClientRect(); return r.top < H * .4 && r.bottom > H * .4; });
      a.classList.toggle('is-here', on);
    });
    if (reduce) return;
    if (innerWidth >= 768) liveRoots.forEach(r => {
      const b = r.getBoundingClientRect();
      r.style.setProperty('--p', clamp(((H - b.top) / (H + b.height)) * 2 - 1, -1, 1).toFixed(3));
    });
    if (footMark) footMark.style.setProperty('--fr', clamp((y - (max - 400)) / 400).toFixed(3));
    if (innerWidth >= 768) parallax.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > H + 100) return; const f = +el.dataset.parallax; el.style.transform = `translateY(${(((r.top + r.height / 2) - H / 2) * -f).toFixed(1)}px)`; });
    if (innerWidth >= 768) pimgs.forEach(im => { const c = im.parentElement.getBoundingClientRect(); if (c.bottom < -100 || c.top > H + 100) return; im.style.transform = `translateY(${clamp(((c.top + c.height / 2) - H / 2) * -.06, -c.height * .1, c.height * .1).toFixed(1)}px)`; });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  frame();

  /* ---------- the orphan rule (v7 11.2) ----------
     css/motion.css sets text-wrap: pretty on body text and balance on headings. Only a browser without text-wrap: pretty gets this
     fallback: bind the last two words of a text-only paragraph so the last line is never a single word. Never inside cards, never headings. */
  if (!(window.CSS && CSS.supports && CSS.supports('text-wrap', 'pretty'))) {
    $$('main p, main li, footer p').forEach(el => {
      if (el.children.length || el.closest('.box,.tile,.seat,.stair-card,.person,.hs,.scatter,.cert')) return;
      el.innerHTML = el.innerHTML.replace(/(\S+)\s+(\S+)\s*$/, '$1&nbsp;$2');
    });
  }
})();
