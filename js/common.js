/* Shared by every page: mobile menu, industries dropdown, assessment form.
   No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), links = $('#navLinks');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    links.addEventListener('click', e => {
      if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- nav dropdowns: Who it's for and Plans & Projects (mouse, keyboard, touch) ---------- */
  $$('.has-dd').forEach(dd => {
    const btn = $('.dd-toggle', dd);
    const set = open => { dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', e => { e.stopPropagation(); $$('.has-dd').forEach(o => { if (o !== dd) { o.classList.remove('open'); $('.dd-toggle', o).setAttribute('aria-expanded', 'false'); } }); set(!dd.classList.contains('open')); });
    document.addEventListener('click', e => { if (!dd.contains(e.target)) set(false); });
    dd.addEventListener('keydown', e => { if (e.key === 'Escape') { set(false); btn.focus(); } });
    dd.addEventListener('focusout', e => { if (!dd.contains(e.relatedTarget)) set(false); });
  });

  /* ---------- hash with a query: /#assessment?topic=question ----------
     One parser, on load, on hashchange and on click. Split location.hash on "?", scroll to the part before it, read topic from
     the part after it and put it in the hidden interest field. Unknown topics fall back to "general".
     Scroll is 600ms (instant under reduced motion) and focus moves to the form's first field once it arrives.
     There is no contact page: "Ask us" and every topic link land on the form. */
  const TOPICS = ['question', 'services', 'core', 'advanced', 'enterprise', 'coverage', 'general'];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interest = $('#f-interest');
  const parseHash = h => {
    const [id, q] = String(h || '').replace(/^#/, '').split('?');
    const m = q && /(?:^|&)topic=([^&]*)/.exec(q);
    return { id, topic: m ? (TOPICS.includes(m[1]) ? m[1] : 'general') : '' };
  };
  const scrollToY = (y, done) => {
    if (reduceMotion) { scrollTo(0, y); done && done(); return; }
    const y0 = scrollY, t0 = performance.now(), dur = 600;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      scrollTo({ top: y0 + (y - y0) * e, behavior: 'instant' });
      p < 1 ? requestAnimationFrame(step) : done && done();
    };
    requestAnimationFrame(step);
  };
  const route = (hash, fromClick) => {
    const { id, topic } = parseHash(hash);
    if (interest && topic) interest.value = topic;
    const el = id && document.getElementById(id);
    if (!el) return false;
    scrollToY(el.getBoundingClientRect().top + scrollY - (id === 'assessment' ? 72 : 0), () => {
      if (id === 'assessment') { const f = $('#f-name'); if (f) f.focus({ preventScroll: true }); }
    });
    return true;
  };
  if (location.hash.includes('?') || /^#assessment/.test(location.hash)) setTimeout(() => route(location.hash), 80);
  addEventListener('hashchange', () => { if (location.hash.includes('?')) route(location.hash); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#assessment"]');
    if (!a || !$('#assessment')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.pathname !== location.pathname) return;                        // another page: let the browser go
    e.preventDefault();
    const topic = a.dataset.topic;
    route(topic ? '#assessment?topic=' + topic : url.hash);
    history.replaceState(null, '', '#assessment');
  });

  /* ---------- assessment form ---------- */
  // Front-end only for now. Nothing is sent anywhere yet; wire to email/CRM before launch.
  const form = $('#form'), msg = $('#formMsg');
  if (form) {
    const map = { healthcare: 'Healthcare', financial: 'Financial services', legal: 'Legal', growing: 'Growing business' };
    const sel = $('#f-ind', form);
    const want = new URLSearchParams(location.search).get('industry') || form.dataset.industry;
    if (sel && map[want]) sel.value = map[want];
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); msg.textContent = ''; return; }
      form.classList.add('is-sending');     // a 2px bar sweeps the button's bottom edge (css); nothing is sent yet
      setTimeout(() => {
        form.classList.remove('is-sending');
        msg.textContent = 'Thanks. We will be in touch.';   // [CONFIRM] confirmation copy is not written yet
        form.reset();
        const pv = $('#fPrivacy'); if (pv) pv.hidden = true;
        if (sel && map[want]) sel.value = map[want];
      }, 900);
    });
  }

  /* ---------- form: the privacy-request path (v7 7.4) ---------- */
  const topic = $('#f-topic'), priv = $('#fPrivacy'), stateField = $('#f-state');
  if (topic && priv) topic.addEventListener('change', () => {
    const on = topic.value === 'privacy';
    priv.hidden = !on;
    if (stateField) stateField.required = on;
  });

  /* ---------- cookie consent (v7 7.6) ----------
     Before consent only strictly necessary cookies are set: analytics does not load. The banner never blocks the page. Decline and Accept
     are equal. A Global Privacy Control signal counts as Decline and shows no banner. "Cookie preferences" in the footer reopens it.
     The choice is kept in localStorage inside try/catch; if storage fails, the banner asks again next visit.
     Google Analytics loads only after Accept, and only if a measurement id is set in <meta name="ga-measurement-id">. */
  const KEY = 'trisian-cookie-choice';
  const banner = $('#cookie');
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* ask again next visit */ } };
  const loadGA = () => {
    const meta = $('meta[name="ga-measurement-id"]'), id = meta && meta.content.trim();
    if (!id || window.__gaLoaded) return;
    window.__gaLoaded = true;
    const sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(sc);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', id);
  };
  const show = () => { if (banner) banner.hidden = false; };
  const hide = () => { if (banner) banner.hidden = true; };
  const choose = v => { write(v); hide(); if (v === 'accept') loadGA(); };
  if (navigator.globalPrivacyControl === true) { hide(); }
  else {
    const saved = read();
    if (saved === 'accept') loadGA(); else if (saved !== 'decline') show();
  }
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => choose(b.dataset.cookie)));
  $$('[data-cookie-prefs]').forEach(b => b.addEventListener('click', show));
})();
