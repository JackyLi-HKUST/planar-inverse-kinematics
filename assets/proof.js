document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const tr = (en, zh) => document.documentElement.lang.startsWith('zh') ? zh : en;
  const state = { r: 2.4, angles: { a: 0, b: 90 }, equal: true, side: 1 };
  const distance = $('follow-distance');
  const lengthPicker = $('follow-lengths');
  const branchPicker = $('follow-branch');
  const innerButton = $('follow-inner');
  const maxDistance = Number(distance.max);
  const l1 = 2;
  const lengths = () => {
    const l2 = state.equal ? l1 : 1.25;
    return { l2, inner: l1 - l2, outer: l1 + l2 };
  };
  const angleInputs = { a: $('follow-angle-a'), b: $('follow-angle-b') };
  const boards = {};

  for (const svg of document.querySelectorAll('[data-follow-board]')) {
    // These are static SVG elements; only their geometry and text change.
    svg.insertAdjacentHTML('beforeend', `
      <circle class="follow-workspace" data-part="outer"/>
      <circle class="follow-workspace-hole" data-part="inner"/>
      <path class="follow-axes" d="M-4.3 0H4.3M0-4.3V4.3"/>
      <text class="follow-axis-label" x="4.37" y="-.13">x</text>
      <text class="follow-axis-label" x=".13" y="-4.36">y</text>
      <line class="follow-ray" data-part="ray" x1="0" y1="0"/>
      <circle class="follow-locus" data-part="locus" r="2"/>
      <g data-part="pose">
        <line class="follow-link link-one" data-part="link1" x1="0" y1="0"/>
        <line class="follow-link link-two" data-part="link2"/>
        <circle class="follow-elbow" data-part="elbow" r=".14"/>
        <text class="follow-elbow-label" data-part="elbowLabel">E</text>
      </g>
      <circle class="follow-base" r=".11"/>
      <text class="follow-base-label" x="-.19" y=".4" text-anchor="end">O</text>
      <circle class="follow-target" data-part="target" r=".19"/>
      <text class="follow-target-label" data-part="targetLabel">T</text>
    `);
    const parts = Object.fromEntries([...svg.querySelectorAll('[data-part]')].map(el => [el.dataset.part, el]));
    boards[svg.dataset.followBoard] = { svg, title: svg.querySelector('title'), parts };
  }

  function point(element, x, y, xAttribute = 'cx', yAttribute = 'cy') {
    element.setAttribute(xAttribute, x);
    element.setAttribute(yAttribute, -y);
  }
  const visible = (el, show) => el.classList.toggle('follow-hidden', !show);
  const formatted = value => (Math.abs(value) < .005 ? 0 : value).toFixed(2).replace('-', '−');

  function drawPath(key, { l2, inner, outer }, atOrigin, reachable) {
    const { title, parts } = boards[key];
    const radians = state.angles[key] * Math.PI / 180;
    const ux = Math.cos(radians), uy = Math.sin(radians);
    const tx = state.r * ux, ty = state.r * uy;
    const limit = atOrigin && state.equal;
    parts.outer.setAttribute('r', outer);
    parts.inner.setAttribute('r', inner);
    visible(parts.inner, inner > 0);
    point(parts.ray, 4.15 * ux, 4.15 * uy, 'x2', 'y2');
    point(parts.target, tx, ty);
    const left = tx > 3.35;
    point(parts.targetLabel, tx + (left ? -.28 : .28), ty + (ty > 3.75 ? -.35 : .24), 'x', 'y');
    parts.targetLabel.setAttribute('text-anchor', left ? 'end' : 'start');
    parts.targetLabel.textContent = atOrigin ? 'T = O' : 'T';
    visible(parts.pose, reachable);
    visible(parts.locus, limit);
    parts.pose.classList.toggle('follow-limit-pose', limit);
    let description = tr('No pose reaches the target.', '沒有姿態能到達目標。');

    if (reachable) {
      // In the ray's frame, E = a u + h Ju. The equal-length limit is
      // a = 0, h = ±L, and depends on the last direction outside O.
      const a = state.equal ? state.r / 2 : (state.r ** 2 + l1 ** 2 - l2 ** 2) / (2 * state.r);
      const h = state.side * Math.sqrt(Math.max(0, l1 ** 2 - a ** 2));
      const ex = a * ux - h * uy, ey = a * uy + h * ux;
      point(parts.link1, ex, ey, 'x2', 'y2');
      point(parts.link2, ex, ey, 'x1', 'y1');
      point(parts.link2, tx, ty, 'x2', 'y2');
      point(parts.elbow, ex, ey);
      point(parts.elbowLabel, ex + .2, ey + .19, 'x', 'y');
      description = tr(`${limit ? 'Limit elbow' : 'Elbow'} (${formatted(ex)}, ${formatted(ey)}).`,
        `${limit ? '極限肘點' : '肘點'}（${formatted(ex)}，${formatted(ey)}）。`);
    }

    const degrees = `${String(state.angles[key]).replace('-', '−')}°`;
    const name = key.toUpperCase();
    const observation = limit ? tr('limit', '極限') : !reachable ? tr('unreachable', '不可達') : '';
    $(`follow-readout-${key}`).textContent = observation ? `${degrees} · ${observation}` : degrees;
    angleInputs[key].value = state.angles[key];
    angleInputs[key].setAttribute('aria-valuetext', degrees);
    title.textContent = tr(`Path ${name}, direction ${degrees}. ${description}`, `路徑 ${name}，方向 ${degrees}。${description}`);
  }

  function render() {
    const geometry = lengths();
    const { inner, outer } = geometry;
    const atOrigin = state.r === 0;
    const reachable = state.r >= inner && state.r <= outer;
    const sameRay = (state.angles.a - state.angles.b) % 360 === 0;
    distance.value = state.r;
    $('follow-radius').textContent = formatted(state.r);
    distance.setAttribute('aria-valuetext', formatted(state.r));
    lengthPicker.value = state.equal ? 'equal' : 'unequal';
    branchPicker.value = state.side;
    innerButton.hidden = state.equal;
    drawPath('a', geometry, atOrigin, reachable);
    drawPath('b', geometry, atOrigin, reachable);

    let heading, copy;
    if (atOrigin && state.equal) {
      heading = tr('One target. A whole circle of possible elbows.', '同一個目標，肘點可以在整個圓上。');
      copy = sameRay
        ? tr('The directions match, so the dashed limit poses match. Change one direction to see a different limit at the same target.',
          '兩條路徑方向相同，虛線極限姿態也相同。改變其中一個方向，就能看到同一目標的另一個極限姿態。')
        : tr('The dashed arms show the folded poses reached along these two rays using the same branch. The dotted circle shows all possible elbows at O.',
          '虛線手臂顯示同一分支沿兩條射線接近時的折疊姿態。點線圓則顯示目標在 O 時所有可能的肘點。');
    } else if (state.r < inner) {
      heading = tr('The origin is out of reach.', '原點不可達。');
      copy = tr('The longer link cannot fold back far enough. Try the inner edge at r = 0.75: each target on that circle has exactly one folded pose.',
        '較長的連桿無法完全折回原點。試試 r = 0.75 的內邊界：圓上的每個目標都恰有一種折疊姿態。');
    } else if (state.r > outer) {
      heading = tr('Both targets are beyond the arm’s reach.', '兩個目標都在機械臂的可達範圍外。');
      copy = tr(`Drag back inside the outer circle, whose radius is ${outer}.`, `把目標拖回半徑為 ${outer} 的外圓內。`);
    } else if (state.r === inner || state.r === outer) {
      heading = tr('The two branches meet at each boundary point.', '在每個邊界點，兩個分支會重合。');
      copy = tr('The links are collinear. Switch the elbow branch: each target keeps its pose.',
        '兩段連桿共線。試試切換肘點分支：每個目標的姿態都不變。');
    } else {
      heading = sameRay ? tr('Try a different direction for one path.', '試試改變其中一條路徑的方向。')
        : tr('Same distance, different directions.', '距離相同，方向不同。');
      copy = state.equal ? tr('Bring both targets to the centre. Compare where the two elbows end up.',
        '把兩個目標移到中心，再比較兩個肘點最後的位置。')
        : tr('Try approaching the inner edge. The hole around O is the part neither arm can reach.',
          '試試接近內邊界。O 周圍的空洞是兩支手臂都無法到達的區域。');
    }
    const title = $('follow-observation-title'), description = $('follow-observation-copy');
    if (title.textContent !== heading) title.textContent = heading;
    if (description.textContent !== copy) description.textContent = copy;
  }

  function setRadius(r) { state.r = Math.round(Math.min(maxDistance, Math.max(0, r)) * 100) / 100; }
  distance.addEventListener('input', () => { setRadius(Number(distance.value)); render(); });
  lengthPicker.addEventListener('change', () => { state.equal = lengthPicker.value === 'equal'; render(); });
  branchPicker.addEventListener('change', () => { state.side = Number(branchPicker.value); render(); });
  for (const [key, input] of Object.entries(angleInputs)) {
    input.addEventListener('input', () => { state.angles[key] = Number(input.value); render(); });
  }
  $('follow-zero').addEventListener('click', () => { setRadius(0); render(); });
  innerButton.addEventListener('click', () => { setRadius(lengths().inner); render(); });
  $('follow-reset').addEventListener('click', () => {
    Object.assign(state, { r: 2.4, angles: { a: 0, b: 90 }, equal: true, side: 1 });
    render();
  });

  for (const [key, { svg }] of Object.entries(boards)) {
    let pointer = null;
    function move(event) {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const r = Math.hypot(p.x, p.y);
      if (r > .13) state.angles[key] = Math.round(Math.atan2(-p.y, p.x) * 180 / Math.PI);
      setRadius(r <= .13 ? 0 : r);
      render();
    }
    svg.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = event.pointerId;
      svg.setPointerCapture(pointer);
      move(event);
    });
    svg.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      svg.addEventListener(name, event => { if (event.pointerId === pointer) pointer = null; });
    }
  }

  function localize() {
    lengthPicker.options[0].textContent = tr('Equal · 2 and 2', '等長 · 2 和 2');
    lengthPicker.options[1].textContent = tr('Unequal · 2 and 1.25', '不等長 · 2 和 1.25');
    branchPicker.options[0].textContent = tr('Left of the ray', '射線左側');
    branchPicker.options[1].textContent = tr('Right of the ray', '射線右側');
    render();
  }
  function showLinkedProof() {
    if (location.hash === '#proof') $('proof').open = true;
  }
  document.querySelector('a[href="#proof"]').addEventListener('click', () => { $('proof').open = true; });
  window.addEventListener('hashchange', showLinkedProof);
  window.addEventListener('languagechange', localize);
  localize();
  showLinkedProof();
});
