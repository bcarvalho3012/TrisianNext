/* Trisian home and secondary pages: the motion layer (design/v2). No libraries.
   CSS draws; this file adds classes and numbers. Reveals on scroll, the hero entrance, the accordion, two stat counters,
   the nav's scrolled state and progress bar, and the zero-markup row pairing. Nothing scrubs with the scroll.
   Under prefers-reduced-motion: no counters, no entrance; every graphic is left in its final state. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const ease = t => 1 - Math.pow(1 - t, 3);                         // ease-out cubic

  const watch = (els, cb, threshold = 0.15) => {
    if (!hasIO) { els.forEach(e => cb(e)); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); } }), { threshold });
    els.forEach(e => io.observe(e));
  };

  /* ---------- enter-view: reveals and staggers ---------- */
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 7))));
  const tall = e => e.getBoundingClientRect().height > innerHeight * 3;
  const blocks = $$('[data-reveal],[data-stagger],.cert');
  const onIn = e => { e.classList.add('in'); if (e.hasAttribute('data-stagger')) setTimeout(() => e.classList.add('settled'), 1600); };
  watch(blocks.filter(e => !tall(e)), onIn, 0.2);
  watch(blocks.filter(tall), onIn, 0.05);
  watch($$('.anim,[data-viz]'), e => e.classList.add('in'), 0.35);

  /* ---------- hero: the text and the tile come in once ---------- */
  const hero = $('.hero');
  if (hero) {
    $$('.hero-in > *', hero).forEach((c, i) => c.style.setProperty('--i', i));
    setTimeout(() => hero.classList.add('go'), 60);
  }

  /* ---------- scenes are static: every scene rests on its end frame ---------- */
  $$('[data-scene]').forEach(c => c.classList.add('play'));

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

  /* ---------- counters (who we are), run once. Only the numbers marked data-count count. ---------- */
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
    }, 0.4);
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

  /* ---------- scroll: the nav's hairline and progress bar, and which section the nav link points at ---------- */
  const navWrap = $('#navWrap');
  const navLinks = $$('.nav-links a').filter(a => /#(seats|offer)$/.test(a.getAttribute('href') || ''));
  const secOf = id => (id === 'seats' ? [$('#seats')] : [$('#offer'), $('#partner')]).filter(Boolean);
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
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  frame();

  /* ---------- the orphan rule ----------
     css sets text-wrap: pretty on body text and balance on headings. Only a browser without text-wrap: pretty gets this
     fallback: bind the last two words of a text-only paragraph so the last line is never a single word. Never inside cards, never headings. */
  if (!(window.CSS && CSS.supports && CSS.supports('text-wrap', 'pretty'))) {
    $$('main p, main li, footer p').forEach(el => {
      if (el.children.length || el.closest('.box,.tile,.seat,.stair-card,.person,.hs,.scatter,.cert')) return;
      el.innerHTML = el.innerHTML.replace(/(\S+)\s+(\S+)\s*$/, '$1&nbsp;$2');
    });
  }
})();
