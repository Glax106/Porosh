/* ===================================================================
   POROSH — MOTION ENGINE
   Lenis (smooth scroll) + GSAP/ScrollTrigger (reveals, counters) +
   ambient particle canvas + custom cursor + 3D tilt + magnetic CTAs.
   =================================================================== */

(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(hover: none)').matches;

  let lenis = null;

  document.addEventListener('DOMContentLoaded', () => {
    initLenis();
    initHeaderState();
    initMobileDrawer();
    initSmoothAnchors();
    initHeroGlitch();
    initParticles();
    initCounters();
    initReveals(document);
    initCursor();
    initMagnetic(document);
    initTilt(document);
    document.getElementById('footer-year') && (document.getElementById('footer-year').textContent = new Date().getFullYear());
  });

  // Videos render async — wire up tilt/reveal/magnetic on the fresh cards.
  document.addEventListener('porosh:videosRendered', () => {
    const grid = document.getElementById('video-grid');
    initReveals(grid);
    initTilt(grid);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  document.addEventListener('porosh:statsReady', () => {
    initCounters(true);
  });

  document.addEventListener('porosh:preloaded', () => {
    playHeroIntro();
  });

  /* ---------------- Lenis smooth scroll ---------------- */
  function initLenis() {
    if (prefersReducedMotion || typeof Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -90, duration: 1.3 });
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        document.getElementById('mobile-drawer')?.classList.remove('is-open');
        document.getElementById('nav-burger')?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- header state + mobile drawer ---------------- */
  function initHeaderState() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initMobileDrawer() {
    const burger = document.getElementById('nav-burger');
    const drawer = document.getElementById('mobile-drawer');
    if (!burger || !drawer) return;
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------------- hero entry + glitch title ---------------- */
  function playHeroIntro() {
    if (!window.gsap) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to('.hero .reveal-up', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.09,
      });
  }

  function initHeroGlitch() {
    const el = document.querySelector('.hero__title--glitch');
    if (!el || prefersReducedMotion) return;
    setInterval(() => {
      el.classList.add('is-glitching');
      setTimeout(() => el.classList.remove('is-glitching'), 380);
    }, 3600);
  }

  /* ---------------- scroll reveals ---------------- */
  function initReveals(scope) {
    const items = scope.querySelectorAll('.reveal-up:not(.hero .reveal-up)');
    if (!items.length) return;

    if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) {
      items.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }

    items.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  /* ---------------- animated counters ---------------- */
  function initCounters(force) {
    const counters = document.querySelectorAll('[data-counter]');
    counters.forEach((el) => {
      if (el.dataset.counterBound && !force) return;
      el.dataset.counterBound = 'true';

      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const suffix = el.getAttribute('data-suffix') || '';

      const run = () => {
        const state = { val: 0 };
        if (window.gsap) {
          gsap.to(state, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = formatCount(state.val) + suffix; },
          });
        } else {
          el.textContent = formatCount(target) + suffix;
        }
      };

      if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: run,
        });
      } else {
        run();
      }
    });
  }

  function formatCount(n) {
    n = Math.floor(n);
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return String(n);
  }

  /* ---------------- ambient particle canvas ---------------- */
  function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let width, height, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((width * height) / 14000));
      particles = Array.from({ length: count }, () => spawnParticle());
    }

    function spawnParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.25 - 0.05,
        alpha: Math.random() * 0.5 + 0.15,
      };
    }

    function step() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 60, ${p.alpha})`;
        ctx.shadowColor = 'rgba(255,0,60,0.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
      });
      requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(step);
  }

  /* ---------------- custom cursor ---------------- */
  function initCursor() {
    if (isCoarsePointer) return;
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    function raf() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const hoverTargets = 'a, button, [data-magnetic], .video-card, input, textarea';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('is-hovering');
    });
  }

  /* ---------------- magnetic buttons ---------------- */
  function initMagnetic(scope) {
    if (isCoarsePointer || prefersReducedMotion) return;
    scope.querySelectorAll('[data-magnetic]').forEach((btn) => {
      if (btn.dataset.magneticBound) return;
      btn.dataset.magneticBound = 'true';

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${relX * 0.25}px, ${relY * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ---------------- 3D tilt on video cards ---------------- */
  function initTilt(scope) {
    if (isCoarsePointer || prefersReducedMotion) return;
    scope.querySelectorAll('[data-tilt]').forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rotX = (py * -8).toFixed(2);
        const rotY = (px * 10).toFixed(2);
        card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
      });
    });
  }
})();
