/* ======================================================================
   POROSH — MAIN
   Lenis smooth scroll + GSAP scroll reveals, featured-video fetch
   (oEmbed, no API key needed), and social icon touch handling.
   ====================================================================== */

const POROSH_CONFIG = {
  // Paste the exact MrBeast Gaming $25,000 video URL or 11-char ID here.
  // Leave blank and the spotlight card gracefully falls back to a
  // "watch on YouTube" state instead of guessing which video it is.
  FEATURED_VIDEO: 'https://youtu.be/7t4ntIGbr7s', // e.g. 'https://www.youtube.com/watch?v=XXXXXXXXXXX' or 'XXXXXXXXXXX'
  CHANNEL_URL: 'https://youtube.com/@poroshyt?si=t6dv105umnr1rOKt',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) document.documentElement.classList.add('reduced-motion');

let lenis = null;

document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initSmoothAnchors();
  initReveals();
  initSocialTouch();
  initFeaturedVideo();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

/* ---------------- Lenis smooth scroll ---------------- */
function initLenis() {
  if (prefersReducedMotion || typeof Lenis === 'undefined') return;

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.15,
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
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -20, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ---------------- scroll reveals ---------------- */
function initReveals() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!window.gsap || prefersReducedMotion) {
    items.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }

  // Hero content reveals once the preloader is out of the way;
  // everything below the fold reveals on scroll via ScrollTrigger.
  const heroItems = document.querySelectorAll('.hero [data-reveal]');
  const restItems = document.querySelectorAll('main > *:not(.hero) [data-reveal]');

  function playHero() {
    gsap.to(heroItems, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.1,
    });
  }

  if (document.getElementById('preloader')?.style.display === 'none') {
    playHero();
  } else {
    document.addEventListener('porosh:preloaded', playHero, { once: true });
  }

  if (window.ScrollTrigger) {
    restItems.forEach((el) => {
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
  } else {
    restItems.forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }
}

/* ---------------- featured video (oEmbed, no key required) ---------------- */
function initFeaturedVideo() {
  const thumb = document.getElementById('video-thumb');
  const titleEl = document.getElementById('video-title');
  const linkEl = document.getElementById('video-yt-link');
  const playBtn = document.getElementById('video-play-btn');
  const frame = document.getElementById('video-frame');
  if (!thumb || !titleEl) return;

  const videoId = extractVideoId(POROSH_CONFIG.FEATURED_VIDEO);

  if (!videoId) {
    // No video configured — graceful fallback state.
    titleEl.textContent = 'Watch the full competition on YouTube';
    linkEl.href = POROSH_CONFIG.CHANNEL_URL;
    playBtn.setAttribute('aria-label', 'Open channel on YouTube');
    frame.addEventListener('click', () => window.open(POROSH_CONFIG.CHANNEL_URL, '_blank', 'noopener'));
    return;
  }

  thumb.src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  thumb.alt = 'Porosh — MrBeast Gaming $25,000 competition';
  linkEl.href = `https://www.youtube.com/watch?v=${videoId}`;

  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (data?.title) titleEl.textContent = data.title;
    })
    .catch(() => {
      titleEl.textContent = 'Competing for $25,000 — MrBeast Gaming';
    });

  function play() {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    iframe.title = 'Porosh — MrBeast Gaming $25,000 competition';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    frame.innerHTML = '';
    frame.appendChild(iframe);
  }

  playBtn.addEventListener('click', play);
  thumb.addEventListener('click', play);
}

function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? match[1] : null;
}

/* ---------------- social icon touch state (mobile has no :hover) ---------------- */
function initSocialTouch() {
  const icons = document.querySelectorAll('.social-icon');
  icons.forEach((icon) => {
    icon.addEventListener('touchstart', () => {
      icons.forEach((other) => { if (other !== icon) other.classList.remove('is-touched'); });
      icon.classList.add('is-touched');
    }, { passive: true });
  });

  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.social-icon')) {
      icons.forEach((icon) => icon.classList.remove('is-touched'));
    }
  }, { passive: true });
}
