/* Thomas Aquinas College — "Come and See for Yourself"
   Scroll engine: one rAF loop writes CSS custom properties.
   Only transform / opacity / clip are animated. */
(() => {
  const reduce = false;   // scroll-linked effects run for everyone; they only move as the visitor scrolls
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const ease = t => 1 - Math.pow(1 - t, 3);            // easeOutCubic
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const header = document.getElementById('header');
  const progress = document.getElementById('progress');

  /* ---------- word splitting for the narration ---------- */
  document.querySelectorAll('[data-words]').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map(w => `<span class="w">${w}</span>`).join(' ');
  });

  /* ---------- reveal on enter ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- active nav ---------- */
  const navLinks = [...document.querySelectorAll('.nav a')];
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['education', 'community', 'faith', 'your-visit'].forEach(id => {
    const el = document.getElementById(id); if (el) navIO.observe(el);
  });

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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- scene handlers: progress p (0→1) → CSS vars ---------- */
  const handlers = {
    hero(el, p) {
      const open = easeInOut(range(p, 0, .62));
      el.style.setProperty('--slit', (50 * (1 - open)).toFixed(3));
      el.style.setProperty('--zoom', (1.06 - .06 * ease(range(p, 0, .8))).toFixed(4));
      el.style.setProperty('--shade', range(p, .25, .65).toFixed(3));
    },
    words(el, p) {
      const words = el._words || (el._words = [...el.querySelectorAll('.w')]);
      const lit = Math.floor(range(p, .04, .68) * (words.length + .999));
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
      el.style.setProperty('--coda', ease(range(p, .7, .86)).toFixed(3));
    },
    arrest(el, p) {
      // darkness → light → focus → long, wordless hold → St. Thomas on beauty
      el.style.setProperty('--lit',   ease(range(p, 0, .28)).toFixed(3));
      el.style.setProperty('--focus', easeInOut(range(p, .12, .42)).toFixed(3));
      el.style.setProperty('--zoom',  (1.08 - .08 * ease(range(p, 0, .5))).toFixed(4));
      el.style.setProperty('--pan',   easeInOut(range(p, .04, .78)).toFixed(4));
      el.style.setProperty('--words', ease(range(p, .66, .8)).toFixed(3));
    },
    glow(el, p) {
      el.style.setProperty('--r', (ease(range(p, .02, .42)) * 92).toFixed(2));
      el.style.setProperty('--zoom', (1.06 - .06 * ease(range(p, 0, .5))).toFixed(4));
      el.style.setProperty('--close', easeInOut(range(p, .5, .7)).toFixed(3));
      el.style.setProperty('--words', ease(range(p, .74, .86)).toFixed(3));
    },
    finale(el, p) {
      // mirror of the opening: the window starts open and closes as you keep scrolling
      const close = easeInOut(range(p, .12, .62));
      el.style.setProperty('--slit', (50 * close).toFixed(3));
      el.style.setProperty('--zoom', (1 + .06 * ease(range(p, .1, .7))).toFixed(4));
      el.style.setProperty('--title', (1 - range(p, .06, .24)).toFixed(3));
      const cta = ease(range(p, .62, .8));
      el.style.setProperty('--cta', cta.toFixed(3));
      el.classList.toggle('cta-live', cta > .5);
    },
    doors(el, p) {
      el.style.setProperty('--open', easeInOut(range(p, .06, .5)).toFixed(4));
      el.style.setProperty('--zoom', (1.05 - .05 * ease(range(p, .1, .75))).toFixed(4));
      el.style.setProperty('--words', ease(range(p, .62, .76)).toFixed(3));
    }
  };

  const scenes = [...document.querySelectorAll('[data-scene]')];
  const quiet = [...document.querySelectorAll('[data-quiet]')];
  const parallax = [...document.querySelectorAll('[data-parallax]')].map(img => ({
    img, frame: img.parentElement, speed: parseFloat(img.dataset.parallax) || .1
  }));

  let lastY = window.scrollY, ticking = false;

  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const y = window.scrollY;

    /* read progress (hairline red under header) */
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty('--read', (max > 0 ? y / max : 0).toFixed(4));

    /* header states */
    header.classList.toggle('is-solid', y > vh * .9);
    const goingDown = y > lastY + 2, goingUp = y < lastY - 2;
    if (y < vh * .5) header.classList.remove('is-hidden');
    else if (goingDown) header.classList.add('is-hidden');
    else if (goingUp) header.classList.remove('is-hidden');
    lastY = y;

    /* aesthetic arrest: remove all chrome while a sacred image is pinned */
    const inQuiet = quiet.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= 1 && r.bottom >= vh - 1;
    });
    header.classList.toggle('is-quiet', inQuiet);

    if (reduce) return;

    /* scenes */
    for (const el of scenes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh * .2 || r.top > vh * 1.2) continue;
      const total = r.height - vh;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      el.style.setProperty('--p', p.toFixed(4));
      handlers[el.dataset.scene]?.(el, p);
    }

    /* parallax plates */
    for (const { img, frame, speed } of parallax) {
      const r = frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const offset = (r.top + r.height / 2 - vh / 2) * -speed;
      const limit = r.height * .045;
      img.style.setProperty('--py', clamp(offset, -limit, limit).toFixed(1) + 'px');
    }
  }

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  frame();
})();

/* ---------- Photo slots: while a photo file is missing, show a labeled placeholder.
   Drop a new file into assets/img/ with the same name and it appears automatically. ---------- */
(() => {
  const SLOT = '.plate-frame, .hero-media, .arrest-media, .glow-media, .glow-close, .doors-media';
  const mark = img => {
    const box = img.closest(SLOT); if (!box || box.dataset.slot) return;
    box.dataset.slot = img.getAttribute('src').split('/').pop();
    img.style.visibility = 'hidden';
  };
  document.querySelectorAll('main img[src^="assets/img/"]').forEach(img => {
    img.loading = 'eager';                       // check every slot right away
    if (img.complete && img.naturalWidth === 0) mark(img);
    img.addEventListener('error', () => mark(img));
  });
})();
