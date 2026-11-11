/* Secondary pages: the services tablist (deep-linkable, arrow keys) and the insights filter.
   Without JavaScript every panel and every card is visible. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- services groups ---------- */
  const tabs = $$('.g-tab');
  if (tabs.length) {
    const panels = $$('.g-panel');
    const show = (k, focus, push) => {
      const i = tabs.findIndex(t => t.dataset.g === k);
      if (i < 0) return;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach((p, j) => { if (j === i) { p.removeAttribute('data-off'); p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap'); } else p.setAttribute('data-off', ''); });
      // entry motion again for the cards in the group that was just shown (fade up, 60ms stagger, capped at 6)
      $$('[data-ico-host]', panels[i]).forEach(h => { h.classList.remove('is-in', 'done'); void h.offsetWidth; requestAnimationFrame(() => { h.classList.add('is-in'); setTimeout(() => h.classList.add('done'), 900); }); });
      if (focus) tabs[i].focus();
      if (push) history.replaceState(null, '', '#' + k);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t.dataset.g, false, true));
      t.addEventListener('keydown', e => {
        const n = tabs.length;
        const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
        if (to !== undefined) { e.preventDefault(); show(tabs[to].dataset.g, true, true); }
      });
    });
    const fromHash = () => { const k = location.hash.slice(1); if (tabs.some(t => t.dataset.g === k)) { show(k); $('#groups').scrollIntoView(); } };
    fromHash();
    addEventListener('hashchange', fromHash);
  }

  /* ---------- insights filter ---------- */
  const chips = $$('.f-chip');
  if (chips.length) {
    const items = $$('[data-cat]'), empty = $('#fEmpty');
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => x.setAttribute('aria-pressed', x === c));
      const f = c.dataset.f; let n = 0;
      items.forEach(it => { const on = f === 'all' || it.dataset.cat === f; it.hidden = !on; if (on) n++; });
      if (empty) empty.hidden = n > 0;
    }));
  }
})();
