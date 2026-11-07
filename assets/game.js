document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const $ = id => document.getElementById(id);
  const l1 = 2.7, l2 = 2;
  const tolerance = .24, holdTime = 350;
  const angles = [-30, 80];
  const sliders = [$('gameShoulder'), $('gameElbowAngle')];
  const numbers = [$('gameShoulderNumber'), $('gameElbowNumber')];
  const keys = { KeyD: [0, -1], KeyF: [0, 1], KeyJ: [1, -1], KeyK: [1, 1] };
  const held = new Map();
  let target, frameId = 0, previousFrame = null, insideSince = null, hit = false, score = 0;
  const tr = (en, zh) => document.documentElement.lang.startsWith('zh') ? zh : en;
  const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;
  const pose = () => K.forward(K.toRadians(angles[0]), K.toRadians(angles[1]), l1, l2);
  const format = (value, digits = 2) => Number(value.toFixed(digits)) === 0
    ? (0).toFixed(digits) : value.toFixed(digits).replace('-', '−');
  const pair = p => `(${format(p.x)}, ${format(p.y)})`;
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function sampleTarget() {
    // Sample uniformly by area, with room for the entire target ring inside the workspace.
    const inner = l1 - l2 + tolerance, outer = l1 + l2 - tolerance;
    const end = pose().end;
    for (let i = 0; i < 30; i++) {
      const direction = Math.random() * 2 * Math.PI;
      const radius = Math.sqrt(inner ** 2 + Math.random() * (outer ** 2 - inner ** 2));
      const point = { x: radius * Math.cos(direction), y: radius * Math.sin(direction) };
      if (gap(point, end) > .9 && (!target || gap(point, target) > .9)) return point;
    }
    const direction = Math.atan2(end.y, end.x) + Math.PI;
    return { x: outer * Math.cos(direction), y: outer * Math.sin(direction) };
  }

  function place(id, p, xAttribute = 'cx', yAttribute = 'cy') {
    const element = $(id);
    element.setAttribute(xAttribute, p.x);
    element.setAttribute(yAttribute, -p.y);
  }

  function requestFrame() {
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(tick);
  }

  function render(now = performance.now()) {
    const { elbow, end } = pose();
    const distance = gap(end, target);
    if (!hit && distance <= tolerance && !document.hidden) {
      insideSince ??= now;
      if (now - insideSince >= holdTime) {
        hit = true;
        $('gameScore').textContent = ++score;
      } else requestFrame();
    } else insideSince = null;
    $('gameBoard').classList.toggle('game-hit', hit);
    const inside = !hit && insideSince !== null;
    $('gameBoard').classList.toggle('game-inside', inside);
    $('gameStatus').dataset.phase = hit ? 'hit' : inside ? 'inside' : 'aim';
    const status = hit ? tr('Target reached! Try a new one.', '命中！換一個目標繼續挑戰。')
      : inside ? tr('Inside the ring. Hold still…', '已進入目標圈，保持不動…')
        : tr('Move P within 0.24 units of T.', '把 P 移到距離 T 不超過 0.24 單位的位置。');
    if ($('gameStatus').textContent !== status) $('gameStatus').textContent = status;
    place('gameLink1', elbow, 'x2', 'y2');
    place('gameLink2', elbow, 'x1', 'y1');
    place('gameLink2', end, 'x2', 'y2');
    place('gameElbow', elbow);
    place('gameElbowCore', elbow);
    place('gameErrorLine', end, 'x1', 'y1');
    place('gameErrorLine', target, 'x2', 'y2');
    $('gameGripper').setAttribute('transform', `translate(${end.x} ${-end.y}) rotate(${-angles[0] - angles[1]})`);
    $('gamePosition').textContent = pair(end);
    $('gameDistance').textContent = format(distance, 3);
    angles.forEach((angle, i) => {
      sliders[i].value = angle;
      sliders[i].setAttribute('aria-valuetext', `${format(angle, 1)}°`);
      if (document.activeElement !== numbers[i]) numbers[i].value = angle.toFixed(1);
    });
  }

  function newTarget() {
    target = sampleTarget();
    hit = false;
    insideSince = null;
    place('gameTargetRing', target);
    place('gameTargetDot', target);
    place('gameTargetLabel', { x: target.x + .32, y: target.y + .22 }, 'x', 'y');
    $('gameTargetPosition').textContent = pair(target);
    render();
  }

  const turn = (index, increment) => {
    angles[index] = Math.round(wrap(angles[index] + increment) * 10) / 10;
  };
  function tick(now) {
    frameId = 0;
    const elapsed = Math.max(0, Math.min(32, now - (previousFrame ?? now)));
    previousFrame = now;
    const directions = [0, 0];
    for (const [code, start] of held) {
      const [index, sign] = keys[code];
      if (now - start >= 175) directions[index] += sign;
    }
    directions.forEach((direction, index) => {
      if (direction && elapsed) turn(index, direction * 90 * elapsed / 1000);
    });
    render(now);
    if (held.size) requestFrame();
    else previousFrame = null;
  }

  function isTyping(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable || target.matches('textarea, select, input:not([type=range])')
    );
  }
  window.addEventListener('keydown', event => {
    const key = keys[event.code];
    if (!key || event.altKey || event.ctrlKey || event.metaKey || event.isComposing || isTyping(event.target)) return;
    event.preventDefault();
    if (held.has(event.code) || event.repeat) return;
    held.set(event.code, performance.now());
    turn(...key);
    render();
    requestFrame();
  });
  window.addEventListener('keyup', event => { held.delete(event.code); });
  function stopKeys() { held.clear(); previousFrame = null; }
  window.addEventListener('blur', stopKeys);
  document.addEventListener('visibilitychange', () => {
    stopKeys();
    insideSince = null;
    if (!document.hidden) render();
  });
  numbers.forEach((input, i) => {
    sliders[i].addEventListener('input', () => {
      angles[i] = sliders[i].valueAsNumber;
      render();
    });
    input.addEventListener('focus', stopKeys);
    input.addEventListener('input', () => {
      if (!Number.isFinite(input.valueAsNumber)) return;
      angles[i] = Math.round(K.clamp(input.valueAsNumber, -180, 180) * 10) / 10;
      render();
    });
    input.addEventListener('blur', () => { input.value = angles[i].toFixed(1); });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
  });
  $('gameNext').addEventListener('click', newTarget);
  window.addEventListener('languagechange', () => {
    sliders[0].setAttribute('aria-label', tr('Shoulder angle slider', '肩角滑桿'));
    sliders[1].setAttribute('aria-label', tr('Elbow angle slider', '肘角滑桿'));
    numbers[0].setAttribute('aria-label', tr('Shoulder angle in degrees', '肩角度數'));
    numbers[1].setAttribute('aria-label', tr('Elbow angle in degrees', '肘角度數'));
    $('gameBoardTitle').textContent = tr('Two-link arm, reachable region and target', '雙連桿機械臂、可達區域與目標');
    render();
  });
  newTarget();
});
