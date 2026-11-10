document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const K = window.Kinematics;
  const tr = (en, zh) => document.documentElement.lang.startsWith('zh') ? zh : en;
  const TAU = 2 * Math.PI, c = .75, threshold = 2 - c, eps = 1e-8;
  const arm = $('flip-arm'), distance = $('flip-distance'), angle = $('flip-angle');
  const switchButton = $('flip-switch');
  const state = { d: 1, psi: K.toRadians(28), branch: 0, tried: false, flipped: false, justSwitched: false };
  const trials = { two: 0, one: 0 };
  let revealed = false;
  const presets = [...document.querySelectorAll('[data-flip-distance]')];
  const dragHandles = [...arm.querySelectorAll('[data-flip-drag]')];
  const parts = Object.fromEntries([...document.querySelectorAll('[id^="flip-"]')].map(el => [el.id.slice(5), el]));
  const origin = { x: 0, y: 0 };
  let drag = null;

  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const mode = () => state.d < threshold ? 'two' : state.d === threshold ? 'touch' : 'one';
  const limit = () => mode() === 'one'
    ? Math.acos(K.clamp((state.d ** 2 + c ** 2 - 4) / (2 * state.d * c), -1, 1)) : Math.PI;
  const atJoin = () => mode() !== 'two' && Math.abs(Math.abs(state.psi) - limit()) < eps;
  const wrist = psi => ({ x: state.d - c * Math.cos(psi), y: c * Math.sin(psi) }); // SVG coordinates
  const format = (number, digits = 2) => (Math.abs(number) < .5 * 10 ** -digits ? 0 : number).toFixed(digits).replace('-', '−');
  const coord = p => `${p.x},${p.y}`;
  const moved = (p, x, y) => ({ x: p.x + x, y: p.y + y });
  function point(el, p, x = 'cx', y = 'cy') { el.setAttribute(x, p.x); el.setAttribute(y, p.y); }
  function line(el, a, b) { point(el, a, 'x1', 'y1'); point(el, b, 'x2', 'y2'); }
  const show = (el, yes) => el.classList.toggle('flip-hidden', !yes);
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  function fullCircle(x, y, r) {
    return `M${x - r},${y} a${r},${r} 0 1 0 ${2*r},0 a${r},${r} 0 1 0 ${-2*r},0`;
  }

  function drawArm() {
    const w = wrist(state.psi), t = { x: state.d, y: 0 };
    const boundary = atJoin();
    const result = K.inverse(w.x, -w.y, 1, 1);
    // At a gate the geometric elbow is exactly halfway from O to W.
    const elbows = boundary || result.solutions.length !== 2
      ? Array(2).fill({ x: w.x / 2, y: w.y / 2 })
      : result.solutions.map(s => ({ x: s.elbow.x, y: -s.elbow.y }));
    const e = elbows[state.branch], other = elbows[1 - state.branch];
    const alpha = limit(), gateA = wrist(-alpha), gateB = wrist(alpha);
    point(parts['wrist-circle'], t);
    parts['wrist-path'].setAttribute('d', mode() === 'one'
      ? `M${coord(gateA)} A${c},${c} 0 ${alpha > Math.PI / 2 ? 1 : 0} 0 ${coord(gateB)}`
      : fullCircle(t.x, 0, c));
    point(parts['gate-a'], gateA);
    point(parts['gate-b'], gateB);
    show(parts['gate-a'], mode() !== 'two');
    show(parts['gate-b'], mode() === 'one');
    line(parts.reference, origin, w);
    line(parts['link-1'], origin, e);
    line(parts['link-2'], e, w);
    line(parts['link-3'], w, t);
    parts.other.setAttribute('points', [origin, other, w].map(coord).join(' '));
    show(parts.other, !boundary);
    point(parts['other-elbow'], other);
    show(parts['other-elbow'], !boundary);
    point(parts.elbow, e);
    point(parts['elbow-label'], moved(e, -.09, e.y > .75 ? .19 : -.13), 'x', 'y');
    point(parts.wrist, w);
    point(parts['wrist-hit'], w);
    point(parts['wrist-label'], moved(w, .15, w.y < -.5 ? -.11 : .19), 'x', 'y');
    point(parts.target, t);
    point(parts['target-hit'], t);
    point(parts['target-label'], moved(t, .15, -.15), 'x', 'y');
    arm.dataset.branch = boundary ? 'straight' : state.branch === 0 ? 'positive' : 'negative';
    setText(parts['arm-title'], tr(
      `Fixed tip at (${format(t.x)}, 0); wrist at (${format(w.x)}, ${format(-w.y)}). ${boundary ? 'Straight pose.' : 'Elbow at (' + format(e.x) + ', ' + format(-e.y) + ').'}`,
      `末端固定於（${format(t.x)}，0）；手腕位於（${format(w.x)}，${format(-w.y)}）。${boundary ? '目前為伸直姿態。' : '肘點位於（' + format(e.x) + '，' + format(-e.y) + '）。'}`));
  }

  function drawMap() {
    const current = mode(), alpha = limit(), plus = state.branch === 0;
    const left = { x: 54, y: 77 }, right = { x: 246, y: 77 };
    let p, label;
    if (current === 'one') {
      parts['map-positive'].setAttribute('d', 'M54,77 A96,52 0 0 1 246,77');
      parts['map-negative'].setAttribute('d', 'M54,77 A96,52 0 0 0 246,77');
      const a = Math.PI + (plus ? 1 : -1) * Math.PI * (state.psi + alpha) / (2 * alpha);
      p = { x: 150 + 96 * Math.cos(a), y: 77 + 52 * Math.sin(a) };
      point(parts['map-gate-a'], left);
      point(parts['map-gate-b'], right);
      label = tr('One connected loop', '一個相連的圈');
    } else {
      const touch = current === 'touch', r = touch ? 51 : 45;
      const xA = touch ? 99 : 79, xB = touch ? 201 : 221;
      parts['map-positive'].setAttribute('d', fullCircle(xA, 77, r));
      parts['map-negative'].setAttribute('d', fullCircle(xB, 77, r));
      const a = touch
        ? (plus ? 0 : Math.PI) + (state.psi + Math.PI)
        : -Math.PI / 2 + state.psi;
      p = { x: (plus ? xA : xB) + r * Math.cos(a), y: 77 + r * Math.sin(a) };
      point(parts['map-gate-a'], { x: 150, y: 77 });
      label = touch ? tr('Figure eight · one join', '八字形 · 一個接點') : tr('Two separate loops', '兩個分離的圈');
    }
    point(parts['map-marker'], p);
    show(parts['map-gate-a'], current !== 'two');
    show(parts['map-gate-b'], current === 'one');
    setText(parts['space-count'], label);
    setText(parts['map-title'], label);
  }

  function render() {
    const current = mode(), alpha = limit(), degrees = K.toDegrees(state.psi);
    drawArm();
    drawMap();
    const triedNear = trials.two >= .12, triedFar = trials.one >= .12;
    parts.prompt.hidden = revealed;
    parts['map-panel'].hidden = !revealed;
    parts.explainer.hidden = !revealed;
    parts['near-step'].classList.toggle('trial-done', triedNear);
    parts['far-step'].classList.toggle('trial-done', triedFar);
    parts.reveal.hidden = !triedNear || !triedFar;
    parts['next-trial'].hidden = (triedNear && triedFar) || (current === 'two' && !triedNear) || (current === 'one' && triedNear);
    setText(parts['next-trial'], triedNear ? tr('Move T farther', '把 T 移遠') : tr('Try with T near', '先試近處'));
    distance.value = state.d;
    angle.min = -K.toDegrees(alpha);
    angle.max = K.toDegrees(alpha);
    angle.value = degrees;
    const psiText = `${format(degrees, 1)}°`;
    setText(parts['distance-value'], format(state.d));
    setText(parts['angle-value'], psiText);
    angle.setAttribute('aria-valuetext', psiText);
    switchButton.disabled = !atJoin();
    presets.forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.flipDistance) === state.d));

    let heading, detail;
    if (atJoin() && state.justSwitched) {
      heading = tr('You crossed onto the other branch.', '你已轉到另一個分支。');
      detail = tr('Move the wrist away from this straight pose. The elbow will now bend to the other side, while the tip stays fixed.',
        '把手腕移離伸直姿態。肘部現在會彎向另一側，末端仍然固定。');
    } else if (atJoin()) {
      heading = tr('The two branches meet here.', '兩個分支在這裏相接。');
      detail = current === 'one'
        ? tr('Drag back along the blue arc to bend the other way, or press “Cross to the other branch”.',
          '沿藍色圓弧往回拖，肘部就會往另一側彎；也可按「轉到另一個分支」。')
        : tr('Drag through the touch point, or press “Cross to the other branch” and move the wrist away.',
          '把手腕拖過相切點，或按「轉到另一個分支」後移開手腕。');
    } else if (state.flipped) {
      heading = tr('Elbow flipped. The tip never moved.', '肘部翻過去了，末端一直沒動。');
      detail = revealed ? tr('The front two links passed through a shared straight pose. The black dot is now on the other colour.',
        '前兩段經過共用的伸直姿態，黑點現在位於另一色的路徑上。')
        : tr('The front two links passed through a shared straight pose. Compare what happens when T is near.',
          '前兩段經過共用的伸直姿態。比較一下 T 在近處時會怎樣。');
    } else if (current === 'one') {
      heading = tr('Try reaching a white dot on the blue arc.', '試試把手腕拖到藍色圓弧的白點。');
      detail = tr('The blue arc ends at two straight poses. Can one of them help you reach the other elbow?',
        '藍色圓弧的兩端都是伸直姿態。能不能利用其中一個，翻到另一側？');
    } else if (current === 'touch') {
      heading = tr('There is exactly one place to cross.', '只有一個地方可以轉到另一個分支。');
      detail = tr('Drag the wrist to the white dot where the blue circle touches the edge of the disc.',
        '把手腕拖到白點：那裏是藍色圓周與圓盤邊界的相切點。');
    } else {
      heading = state.tried ? tr('Still on the same branch.', '肘部仍在同一分支。')
        : tr('Can you reach the dashed elbow pose?', '能翻到虛線所示的肘部姿態嗎？');
      detail = state.tried ? tr('Try a full turn of the wrist, then move T farther. Does that give the elbow a way across?',
        '試試讓手腕繞一圈，再把 T 移遠。肘部這次能翻過去嗎？')
        : tr('Drag the blue wrist around the red point, or use the direction slider. Keep T fixed for this trial.',
          '拖動藍色手腕繞紅點轉，或用方向滑桿。這一輪先保持 T 不動。');
    }
    setText(parts.status, heading);
    setText(parts.detail, detail);
  }

  function moveTarget(value) {
    const next = Math.round(K.clamp(value, Number(distance.min), Number(distance.max)) * 100) / 100;
    if (next === state.d) return;
    state.d = next;
    state.psi = K.clamp(state.psi, -limit(), limit());
    state.tried = state.flipped = state.justSwitched = false;
    render();
  }
  function setAngle(psi) {
    const next = K.clamp(psi, -limit(), limit()), current = mode();
    if (current !== 'touch') trials[current] += Math.abs(wrap(next - state.psi));
    state.psi = next;
    state.tried = true;
    if (!atJoin()) state.justSwitched = false;
    render();
  }
  function changeBranch() {
    state.branch = 1 - state.branch;
    state.flipped = true;
    state.justSwitched = true;
    if (mode() === 'one') trials.one = Math.max(.12, trials.one);
    if (trials.two >= .12 && trials.one >= .12) revealed = true;
  }

  distance.addEventListener('input', () => moveTarget(Number(distance.value)));
  angle.addEventListener('input', () => setAngle(K.toRadians(Number(angle.value))));
  switchButton.addEventListener('click', () => { if (atJoin()) { changeBranch(); render(); } });
  parts['next-trial'].addEventListener('click', () => {
    moveTarget(trials.two >= .12 ? 1.65 : 1);
    angle.focus({ preventScroll: true });
  });
  parts.reveal.addEventListener('click', () => {
    revealed = true;
    render();
    parts['map-panel'].focus({ preventScroll: true });
  });
  presets.forEach(button => button.addEventListener('click', () => {
    state.psi = K.toRadians(28);
    state.branch = 0;
    state.tried = state.flipped = state.justSwitched = false;
    moveTarget(Number(button.dataset.flipDistance));
    render();
  }));

  function localPoint(event) {
    const matrix = arm.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  }
  const fromPointer = p => Math.atan2(p.y, state.d - p.x);
  for (const handle of dragHandles) {
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || drag) return;
      const p = localPoint(event);
      if (!p) return;
      drag = {
        id: event.pointerId, kind: handle.dataset.flipDrag, last: fromPointer(p), startX: p.x, startD: state.d,
        phase: state.psi, gate: mode() === 'one' && atJoin() && !state.justSwitched ? state.psi : null
      };
      arm.setPointerCapture(event.pointerId);
    });
  }
  arm.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const p = localPoint(event);
    if (!p) return;
    if (drag.kind === 'target') {
      moveTarget(drag.startD + p.x - drag.startX);
      return;
    }
    if (Math.hypot(p.x - state.d, p.y) < .12) return; // undefined direction at the red point
    const desired = fromPointer(p), delta = wrap(desired - drag.last);
    drag.last = desired;
    const current = mode(), alpha = limit();
    if (current !== 'one') {
      const next = drag.phase + delta;
      if (current === 'touch' && Math.floor((next + Math.PI) / TAU) !== Math.floor((drag.phase + Math.PI) / TAU)) changeBranch();
      drag.phase = next;
      setAngle(wrap(next));
      return;
    }
    drag.phase = K.clamp(drag.phase + delta, -alpha, alpha);
    if (drag.gate !== null) {
      // The wrist reaches a straight pose first, then comes back along the same
      // physical arc on the other branch. Hysteresis avoids flips from jitter.
      if (Math.abs(drag.phase - drag.gate) > .045) {
        changeBranch();
        drag.gate = null;
        setAngle(drag.phase);
      } else setAngle(drag.gate);
    } else {
      if (Math.abs(drag.phase) === alpha && !state.justSwitched) drag.gate = drag.phase;
      setAngle(drag.phase);
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    arm.addEventListener(type, event => { if (drag?.id === event.pointerId) drag = null; });
  }

  const openProof = () => { if (location.hash === '#proof') $('proof').open = true; };
  document.querySelector('a[href="#proof"]').addEventListener('click', () => { $('proof').open = true; });
  window.addEventListener('hashchange', openProof);
  window.addEventListener('languagechange', render);
  render();
  openProof();
});
