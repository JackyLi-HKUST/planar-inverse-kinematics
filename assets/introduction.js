(() => {
  const fallback = document.getElementById('mereq-fallback');
  const preview = document.getElementById('mereq-preview');
  const iframe = document.getElementById('mereq-player');

  function showVideo(visible) {
    iframe.hidden = !visible;
    preview.hidden = visible || !preview.naturalWidth;
    fallback.hidden = visible || !preview.hidden;
  }

  preview.addEventListener('load', () => showVideo(!iframe.hidden));
  showVideo(false);

  if (location.protocol === 'file:' || !navigator.onLine) return;

  const clip = { videoId: 'Cog_cH90_80', startSeconds: 81, endSeconds: 103 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  window.onYouTubeIframeAPIReady = () => {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${clip.videoId}`);
    url.search = new URLSearchParams({
      enablejsapi: '1',
      origin: location.origin,
      start: clip.startSeconds,
      end: clip.endSeconds,
      autoplay: reducedMotion.matches ? '0' : '1',
      mute: '1',
      playsinline: '1',
      rel: '0'
    });
    iframe.src = url.href;
    new YT.Player(iframe, {
      events: {
        onReady({ target }) {
          showVideo(true);
          target.mute();
          if (!reducedMotion.matches) target.playVideo();
        },
        onStateChange({ data, target }) {
          if (data === YT.PlayerState.ENDED && !reducedMotion.matches) {
            target.loadVideoById(clip);
          }
        },
        onError() {
          showVideo(false);
        }
      }
    });
  };

  const api = document.createElement('script');
  api.src = 'https://www.youtube.com/iframe_api';
  document.head.append(api);
})();
