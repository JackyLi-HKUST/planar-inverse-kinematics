document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const $ = id => document.getElementById('three-' + id);
  const c = .75;
  let branch = 0;
  const targetInput = $('target'), angleInput = $('angle');
  const tr = (en, zh) => document.documentElement.lang.startsWith('zh') ? zh : en;
  const fmt = (value, digits = 2) => (Math.abs(value) < .5 * 10 ** -digits ? 0 : value).toFixed(digits).replace('-', '−');
  const degrees = angle => `${fmt(K.toDegrees(angle), 1)}°`;
  const coord = p => `${p.x},${-p.y}`;
  const origin = { x: 0, y: 0 };
  function point(id, p, x = 'cx', y = 'cy') {
    $(id).setAttribute(x, p.x);
    $(id).setAttribute(y, -p.y);
  }
  function visible(id, show) { $(id).classList.toggle('three-hidden', !show); }
  const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
  const label = (id, p, dx, dy) => point(id, { x: p.x + dx, y: p.y + dy }, 'x', 'y');

  function render() {
    const x = Number(targetInput.value), angle = Number(angleInput.value), psi = K.toRadians(angle);
    const t = { x, y: 0 };
    const w = { x: x - c * Math.cos(psi), y: -c * Math.sin(psi) };
    const result = K.inverse(w.x, w.y, 1, 1);
    const solution = result.solutions[branch] || result.solutions[0];
    const ghost = result.count === 2 ? result.solutions[1 - branch] : null;
    const psiText = `${fmt(angle, 0)}°`;
    text('substitution', `= (${fmt(x)}, 0.00) − 0.75(cos ${psiText}, sin ${psiText})`);
    text('wrist-value', `W ≈ (${fmt(w.x)}, ${fmt(w.y)})`);
    text('target-readout', fmt(x));
    text('angle-readout', psiText);
    angleInput.setAttribute('aria-valuetext', psiText);
    text('distance', result.count === 1 ? '|OW| = 2' : `|OW| ≈ ${fmt(result.r, 3)}`);
    const title = result.count === 2 ? tr('Two elbow choices', '有兩個肘點可選')
      : result.count === 1 ? tr('One straight pose', '只有一個伸直姿態')
        : tr('No solution for this direction', '這個方向無解');
    text('status', title);
    text('demo-status', title);
    $('demo-status').classList.toggle('three-no-solution', !result.reachable);
    text('diagram-title', tr(`Wrist W at (${fmt(w.x)}, ${fmt(w.y)}). ${title}.`, `手腕 W 位於（${fmt(w.x)}，${fmt(w.y)}）。${title}。`));
    $('branch').disabled = result.count !== 2;
    $('branch').setAttribute('aria-pressed', result.count === 2 && branch === 1);
    point('circle', t);
    point('wrist', w);
    point('tip', t);
    label('wrist-label', w, .13, w.y > .45 ? .13 : -.18);
    label('tip-label', t, .14, .15);
    point('tail', w, 'x1', 'y1');
    point('tail', t, 'x2', 'y2');
    $('diagram').classList.toggle('three-unreachable', !result.reachable);
    $('diagram').dataset.branch = result.count === 1 ? 'straight' : branch === 0 ? 'positive' : 'negative';
    visible('front', !!solution);
    visible('elbow', !!solution);
    visible('ghost', !!ghost);
    if (ghost) $('ghost').setAttribute('points', [origin, ghost.elbow, w].map(coord).join(' '));
    if (solution) {
      point('elbow', solution.elbow);
      $('front').setAttribute('points', [origin, solution.elbow, w].map(coord).join(' '));
      const { theta1, theta2 } = solution;
      const difference = psi - theta1 - theta2;
      const theta3 = Math.atan2(Math.sin(difference), Math.cos(difference));
      text('angle-pair', `(θ₁, θ₂, θ₃) ≈ (${degrees(theta1)}, ${degrees(theta2)}, ${degrees(theta3)})`);
      text('closure', `θ₁ + θ₂ + θ₃ ≡ ψ = ${psiText} (mod 360°)`);
    } else {
      text('angle-pair', tr('The dashed last link shows the requested direction; the wrist lies outside the disc.', '虛線第三段表示指定的方向；手腕落在圓盤之外。'));
      text('closure', '');
    }
  }
  targetInput.addEventListener('input', render);
  angleInput.addEventListener('input', render);
  $('branch').addEventListener('click', () => { branch = 1 - branch; render(); });
  const presets = { inside: [1.65, 30], edge: [1.25, 180], outside: [1.65, 180] };
  for (const button of document.querySelectorAll('[data-three-example]')) {
    button.addEventListener('click', () => {
      [targetInput.value, angleInput.value] = presets[button.dataset.threeExample];
      branch = 0;
      render();
    });
  }
  window.addEventListener('languagechange', render);
  render();
});
