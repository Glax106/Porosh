/* ===================================================================
   POROSH — PRELOADER
   Drives the crimson progress bar, then hands off to a staggered
   hero reveal once the page (and the bar) both hit 100%.
   =================================================================== */

document.documentElement.classList.add('js-ready');

(function () {
  const preloader = document.getElementById('preloader');
  const bar = document.getElementById('preloader-bar');
  const pctLabel = document.getElementById('preloader-pct');

  if (!preloader || !bar || !pctLabel) return;

  let progress = 0;
  let windowLoaded = false;
  let rafId = null;

  function setProgress(value) {
    progress = Math.min(value, 100);
    // clip-path style fill via inset-right trick on .preloader__bar
    bar.style.right = 'auto';
    bar.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
    pctLabel.textContent = Math.floor(progress);
  }

  function tick() {
    // Ease toward 90% while assets are still loading; the final jump to
    // 100% happens only once window 'load' actually fires.
    const ceiling = windowLoaded ? 100 : 90;
    if (progress < ceiling) {
      const step = (ceiling - progress) * 0.06 + 0.35;
      setProgress(progress + step);
    }

    if (progress >= 100) {
      finishLoading();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function finishLoading() {
    cancelAnimationFrame(rafId);
    setProgress(100);

    const tl = window.gsap ? gsap.timeline() : null;

    if (tl) {
      tl.to('.preloader__mark, .preloader__bar-track, .preloader__pct', {
        opacity: 0,
        duration: 0.35,
        ease: 'power1.out',
      })
        .to(preloader, {
          yPercent: -100,
          duration: 0.9,
          ease: 'power4.inOut',
          onStart: () => preloader.classList.add('is-done'),
          onComplete: () => {
            preloader.style.display = 'none';
            document.dispatchEvent(new CustomEvent('porosh:preloaded'));
          },
        }, '-=0.1');
    } else {
      preloader.style.transition = 'transform 0.8s ease';
      preloader.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        preloader.style.display = 'none';
        document.dispatchEvent(new CustomEvent('porosh:preloaded'));
      }, 800);
    }
  }

  window.addEventListener('load', () => {
    windowLoaded = true;
  });

  // Safety net: never let the preloader hang forever if 'load' is slow
  // (e.g. throttled network) — force completion after 6s.
  setTimeout(() => { windowLoaded = true; }, 6000);

  setProgress(0);
  rafId = requestAnimationFrame(tick);
})();
