/* Thomas Aquinas College — Home
   Same engine as the funnel: one rAF loop writes CSS custom properties. */
(() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, s, e) => clamp((p - s) / (e - s));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = document.getElementById('header');
  const progress = document.getElementById('progress');

  /* ---------- narration word split ---------- */
  document.querySelectorAll('[data-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px', threshold: .06 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- mobile menu ---------- */
  const toggle = document.getElementById('menuToggle');
  const mobile = document.getElementById('mobileNav');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobile.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  mobile.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- search overlay ---------- */
  const search = document.getElementById('search');
  const openBtn = document.querySelector('.search-open');
  const setSearch = open => {
    search.hidden = !open; openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) search.querySelector('input').focus(); else openBtn.focus();
  };
  openBtn.addEventListener('click', () => setSearch(true));
  search.querySelector('.search-close').addEventListener('click', () => setSearch(false));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!search.hidden) setSearch(false);
    if (!mobile.hidden) setMenu(false);
    document.activeElement?.closest('.nav-item') && document.activeElement.blur();
  });

  /* ---------- hero slideshow ---------- */
  const hero = document.querySelector('.hero');
  const slides = [...hero.querySelectorAll('.slide')];
  const dots = [...hero.querySelectorAll('.slide-dots button')];
  const pauseBtn = hero.querySelector('.slide-pause');
  const DUR = 7000;
  hero.style.setProperty('--dur', DUR + 'ms');
  let idx = 0, timer = null, paused = reduceMotion, hovering = false;

  const show = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, n) => { s.classList.toggle('is-active', n === idx); s.setAttribute('aria-hidden', String(n !== idx)); s.inert = n !== idx; });
    dots.forEach((d, n) => {
      d.removeAttribute('aria-current');
      if (n === idx) { void d.offsetWidth; d.setAttribute('aria-current', 'true'); }   // restart the progress fill
    });
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!paused && !hovering) timer = setTimeout(() => show(idx + 1), DUR);
  };
  const setPaused = p => {
    paused = p; hero.classList.toggle('is-paused', p);
    pauseBtn.setAttribute('aria-pressed', String(p));
    pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
    schedule();
  };
  dots.forEach((d, n) => d.addEventListener('click', () => show(n)));
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  hero.addEventListener('focusin', () => { hovering = true; hero.classList.add('is-paused'); clearTimeout(timer); });
  hero.addEventListener('focusout', () => { hovering = false; hero.classList.toggle('is-paused', paused); show(idx); });
  let x0 = null;
  hero.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });
  setPaused(paused); show(0);

  /* ---------- scroll scenes ---------- */
  const handlers = {
    words(el, p) {
      const words = el._w || (el._w = [...el.querySelectorAll('.w')]);
      const lit = Math.floor(range(p, .04, .66) * (words.length + .999));
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
      el.style.setProperty('--coda', ease(range(p, .7, .86)).toFixed(3));
    },
    finale(el, p) {
      const open = easeInOut(range(p, 0, .55));
      el.style.setProperty('--slit', (44 * (1 - open)).toFixed(3));
      el.style.setProperty('--zoom', (1.08 - .08 * ease(range(p, 0, .8))).toFixed(4));
      const w = ease(range(p, .5, .72));
      el.style.setProperty('--words', w.toFixed(3));
      el.classList.toggle('is-live', w > .5);
    }
  };
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const parallax = [...document.querySelectorAll('[data-parallax]')].map(img => ({ img, frame: img.parentElement, speed: parseFloat(img.dataset.parallax) || .1 }));

  let lastY = scrollY, ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight, y = scrollY;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty('--read', (max > 0 ? y / max : 0).toFixed(4));

    header.classList.toggle('is-solid', y > vh * .85);
    if (y < vh * .5) header.classList.remove('is-hidden');
    else if (y > lastY + 2) header.classList.add('is-hidden');
    else if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;

    for (const el of scenes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh * .2 || r.top > vh * 1.2) continue;
      const total = r.height - vh;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      el.style.setProperty('--p', p.toFixed(4));
      handlers[el.dataset.scene]?.(el, p);
    }
    for (const { img, frame, speed } of parallax) {
      const r = frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const lim = r.height * .045;
      img.style.setProperty('--py', clamp((r.top + r.height / 2 - vh / 2) * -speed, -lim, lim).toFixed(1) + 'px');
    }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  frame();
})();
