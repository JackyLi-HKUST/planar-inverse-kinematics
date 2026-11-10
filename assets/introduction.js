(() => {
  const animation = document.getElementById('mereq-animation');
  const fallback = document.getElementById('mereq-fallback');
  const still = document.getElementById('mereq-still');
  const toggle = document.getElementById('mereq-toggle');
  const playLabel = toggle.querySelector('[data-mereq-play]');
  const pauseLabel = toggle.querySelector('[data-mereq-pause]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function show(frame) {
    const playing = frame === animation;
    animation.hidden = !playing;
    fallback.hidden = frame !== fallback;
    still.hidden = frame !== still;
    playLabel.hidden = playing;
    pauseLabel.hidden = !playing;
  }

  function play() {
    if (animation.naturalWidth) {
      show(animation);
    } else {
      animation.src = animation.dataset.src;
    }
  }

  function pause() {
    still.getContext('2d').drawImage(animation, 0, 0, still.width, still.height);
    show(still);
  }

  animation.addEventListener('load', () => {
    show(animation);
    toggle.hidden = false;
  });
  animation.addEventListener('error', () => {
    toggle.hidden = true;
    document.getElementById('mereq-unavailable').hidden = false;
    show(fallback);
  });
  toggle.addEventListener('click', () => {
    if (animation.hidden) play();
    else pause();
  });

  if (reducedMotion.matches) toggle.hidden = false;
  else play();
})();
