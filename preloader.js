/* ======================================================================
   POROSH — PRELOADER
   Stage 1: crimson laser beams rain down the screen at randomized
            speeds/positions (CSS keyframe loop per streak).
   Stage 2: the rain fades as the "POROSH" wordmark snaps into place,
            with blood drips growing in beneath it.
   Stage 3: the preloader splits down the center like a camera
            aperture / shutter, revealing the page beneath.
   ====================================================================== */

document.documentElement.classList.add('js-ready');

(function () {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panelLeft = preloader.querySelector('.preloader__panel--left');
  const panelRight = preloader.querySelector('.preloader__panel--right');
  const wordmark = preloader.querySelector('.preloader__wordmark');
  const rainContainer = document.getElementById('laserRain');
  const drips = preloader.querySelectorAll('.blood-drip');

  function finish() {
    preloader.style.display = 'none';
    document.dispatchEvent(new CustomEvent('porosh:preloaded'));
  }

  if (reduceMotion || typeof gsap === 'undefined') {
    // Respect reduced motion / no-GSAP: skip straight to the reveal.
    finish();
    return;
  }

  // Seed the laser rainfall — randomized streaks, each falling top to
  // bottom on its own loop/speed/delay so they never look mechanical.
  const STREAK_COUNT = 34;
  if (rainContainer) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < STREAK_COUNT; i++) {
      const streak = document.createElement('div');
      streak.className = 'laser-streak';
      const left = Math.random() * 100;
      const height = Math.round(Math.random() * 90 + 60); // 60–150px beam
      const width = Math.random() < 0.25 ? 3 : 2;
      const duration = (Math.random() * 0.7 + 0.55).toFixed(2); // 0.55–1.25s fall
      const delay = (-Math.random() * 1.4).toFixed(2); // negative = mid-fall on load
      streak.style.left = left + '%';
      streak.style.height = height + 'px';
      streak.style.width = width + 'px';
      streak.style.setProperty('--dur', duration + 's');
      streak.style.setProperty('--delay', delay + 's');
      frag.appendChild(streak);
    }
    rainContainer.appendChild(frag);
  }

  gsap.set(wordmark, { opacity: 0, scale: 0.85 });
  gsap.set(drips, { height: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: finish,
  });

  // Stage 1 — laser rain falls freely for a beat before it gives way.
  tl.to({}, { duration: 1.05 })

    // Stage 2 — rain fades out, wordmark snaps together.
    .to(rainContainer, {
      opacity: 0,
      duration: 0.45,
      ease: 'power1.out',
      onComplete: () => { if (rainContainer) rainContainer.style.display = 'none'; },
    })
    .to(wordmark, {
      opacity: 1,
      scale: 1,
      duration: 0.55,
      ease: 'back.out(1.8)',
    }, '-=0.3')

    // blood drips grow in beneath the wordmark once it lands
    .to(drips, {
      height: () => gsap.utils.random(18, 34),
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.08,
    }, '-=0.1')

    // brief hold so the wordmark actually registers
    .to({}, { duration: 0.4 })

    // Stage 3 — aperture shutter: panels split apart, wordmark fades.
    .to(wordmark, {
      opacity: 0,
      scale: 1.05,
      duration: 0.4,
      ease: 'power1.in',
    })
    .to(panelLeft, {
      xPercent: -100,
      duration: 0.9,
      ease: 'power4.inOut',
    }, '<')
    .to(panelRight, {
      xPercent: 100,
      duration: 0.9,
      ease: 'power4.inOut',
    }, '<');

  // Safety net: never let a slow asset load hold the door shut forever.
  setTimeout(() => {
    if (tl.progress() < 1) tl.progress(1);
  }, 7000);
})();
