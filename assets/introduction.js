(() => {
  const fallback = document.getElementById('mereq-fallback');
  const preview = document.getElementById('mereq-preview');
  const player = document.getElementById('mereq-player');
  const play = document.getElementById('mereq-play');

  function showPreview() {
    if (!player.hidden || !preview.naturalWidth) return;
    fallback.hidden = true;
    preview.hidden = false;
  }

  preview.addEventListener('load', showPreview);
  showPreview();

  // YouTube's embedded player needs a web origin. A local file still has the watch link.
  if (location.protocol === 'file:') return;
  play.hidden = false;
  play.addEventListener('click', () => {
    fallback.hidden = true;
    preview.hidden = true;
    player.src = player.dataset.src;
    player.hidden = false;
    play.hidden = true;
    player.focus();
  });
})();
