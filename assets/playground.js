document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const canvas = document.getElementById('robotCanvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('canvasWrap');
  const $ = id => document.getElementById(id);
  const state = { mode: 'ik', branch: 0, target: { x: 3.2, y: 1.6 }, theta1: K.toRadians(-20), theta2: K.toRadians(75), l1: 2.7, l2: 2.0, dragging: false };
  let transform = { scale: 1, ox: 0, oy: 0 };

  function format(value, digits = 1) {
    const text = Number(value).toFixed(digits);
    return text.startsWith('-') ? '−' + text.slice(1) : text;
  }
  const deg = radians => `${format(K.toDegrees(radians), 1)}°`;
  const worldToScreen = p => ({ x: transform.ox + p.x * transform.scale, y: transform.oy - p.y * transform.scale });
  const screenToWorld = p => ({ x: (p.x - transform.ox) / transform.scale, y: (transform.oy - p.y) / transform.scale });

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const height = parseFloat(getComputedStyle(canvas).height);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${rect.width}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    transform = { scale: Math.min(rect.width / 11.5, height / 8.2), ox: rect.width * .48, oy: height * .58 };
    draw();
  }

  function line(a, b, color, width = 1, dash = []) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
  }
  function circle(center, radius, stroke, width = 1, fill = null, dash = []) {
    ctx.save(); ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
  }
  function label(text, point, color = '#6d727b', align = 'center') { ctx.save(); ctx.fillStyle = color; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = align; ctx.fillText(text, point.x, point.y); ctx.restore(); }
  function drawWorkspace() {
    if (!$('showWorkspace').checked) return;
    const c = worldToScreen({ x: 0, y: 0 });
    const inner = Math.abs(state.l1 - state.l2) * transform.scale;
    const outer = (state.l1 + state.l2) * transform.scale;
    ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, outer, 0, Math.PI * 2); ctx.arc(c.x, c.y, inner, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(84,117,232,.055)'; ctx.fill('evenodd'); ctx.restore();
    circle(c, outer, 'rgba(84,117,232,.28)', 1, null, [5, 5]);
    if (inner > 2) circle(c, inner, 'rgba(84,117,232,.2)', 1, null, [4, 5]);
  }
  function drawAxes() {
    const w = parseFloat(canvas.style.width); const h = parseFloat(getComputedStyle(canvas).height);
    line({ x: 15, y: transform.oy }, { x: w - 15, y: transform.oy }, '#d9dce1');
    line({ x: transform.ox, y: 15 }, { x: transform.ox, y: h - 15 }, '#d9dce1');
    label('x', { x: w - 22, y: transform.oy - 8 }); label('y', { x: transform.ox + 10, y: 23 }, '#6d727b', 'left');
  }
  function drawGeometry(target, result) {
    if (!$('showGeometry').checked || state.mode !== 'ik') return;
    const base = worldToScreen({ x: 0, y: 0 }); const t = worldToScreen(target);
    circle(base, state.l1 * transform.scale, 'rgba(84,117,232,.62)', 1.5, null, [6, 5]);
    circle(t, state.l2 * transform.scale, 'rgba(255,90,54,.62)', 1.5, null, [6, 5]);
    line(base, t, '#aeb3bb', 1, [4, 5]);
    label(`r = ${format(Math.hypot(target.x, target.y), 2)}`, { x: (base.x + t.x) / 2, y: (base.y + t.y) / 2 - 9 });
    result.solutions.forEach((s, i) => {
      const e = worldToScreen(s.elbow); circle(e, 5, '#5475e8', 1.5, '#fff'); label(i === 0 ? 'E₁' : 'E₂', { x: e.x + 9, y: e.y - 8 }, '#5475e8', 'left');
    });
  }
  function roundedSegment(a, b, width, fill, edge) {
    ctx.save(); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = edge; ctx.lineWidth = width + 6; ctx.stroke(); ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.stroke();
    ctx.globalAlpha = .35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y - 4); ctx.lineTo(b.x, b.y - 4); ctx.stroke(); ctx.restore();
  }
  function drawJoint(point, radius, accent = false) {
    circle(point, radius + 4, '#202329', 2, '#fff'); circle(point, radius, '#9ba2ad', 2, accent ? '#ff6c4d' : '#d9dde3'); circle(point, radius * .34, '#69707a', 1, '#f8f8f8');
  }
  function drawGripper(end, angle) {
    ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(-angle); ctx.fillStyle = '#2d3137'; ctx.fillRect(-9, -10, 18, 20); ctx.strokeStyle = '#2d3137'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(17, -14); ctx.lineTo(23, -14); ctx.moveTo(7, 7); ctx.lineTo(17, 14); ctx.lineTo(23, 14); ctx.stroke(); ctx.restore();
  }
  function drawBase(base) {
    ctx.save(); ctx.fillStyle = '#353941'; ctx.beginPath(); ctx.roundRect(base.x - 33, base.y + 17, 66, 25, 6); ctx.fill(); ctx.fillStyle = '#737b86'; ctx.fillRect(base.x - 22, base.y + 6, 44, 15); ctx.restore();
  }
  function drawRobot(solution, ghost = false) {
    const base = worldToScreen({ x: 0, y: 0 }); const elbow = worldToScreen(solution.elbow); const end = worldToScreen(solution.end);
    ctx.save(); if (ghost) ctx.globalAlpha = .14;
    drawBase(base); roundedSegment(base, elbow, 27, '#dce1e7', '#363a41'); roundedSegment(elbow, end, 23, '#eef0f3', '#363a41'); drawJoint(base, 16, true); drawJoint(elbow, 14, false); drawGripper(end, solution.theta1 + solution.theta2); ctx.restore();
  }
  function drawTarget(target, reachable) {
    const p = worldToScreen(target); ctx.save(); ctx.strokeStyle = reachable ? '#ff5a36' : '#c94120'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x - 17, p.y); ctx.lineTo(p.x + 17, p.y); ctx.moveTo(p.x, p.y - 17); ctx.lineTo(p.x, p.y + 17); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); label(`T (${format(target.x, 2)}, ${format(target.y, 2)})`, { x: p.x + 18, y: p.y - 20 }, reachable ? '#d94a2c' : '#c94120', 'left');
  }
  function draw() {
    const width = parseFloat(canvas.style.width) || wrap.clientWidth; const height = parseFloat(getComputedStyle(canvas).height);
    ctx.clearRect(0, 0, width, height); drawAxes(); drawWorkspace();
    let solution, result, target;
    if (state.mode === 'ik') {
      target = state.target; result = K.inverse(target.x, target.y, state.l1, state.l2); drawGeometry(target, result);
      if (result.solutions.length) { solution = result.solutions[Math.min(state.branch, result.solutions.length - 1)]; if (result.solutions.length > 1) drawRobot(result.solutions[1 - state.branch], true); drawRobot(solution); }
      else { const r = Math.hypot(target.x, target.y) || 1; const reach = result.r > result.outer ? result.outer : result.inner; const angle = Math.atan2(target.y, target.x); const end = { x: reach * Math.cos(angle), y: reach * Math.sin(angle) }; const theta2 = result.r > result.outer ? 0 : Math.PI; const theta1 = Math.atan2(end.y, end.x) - (theta2 === Math.PI ? 0 : 0); solution = { theta1, theta2, ...K.forward(theta1, theta2, state.l1, state.l2) }; drawRobot(solution); }
      drawTarget(target, result.reachable);
    } else {
      solution = { theta1: state.theta1, theta2: state.theta2, ...K.forward(state.theta1, state.theta2, state.l1, state.l2) }; target = solution.end; drawRobot(solution); drawTarget(target, true);
    }
  }

  function updateUI() {
    const result = K.inverse(state.target.x, state.target.y, state.l1, state.l2);
    const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
    const t = translations[lang];
    $('targetX').value = state.target.x; $('targetY').value = state.target.y;
    $('targetXValue').textContent = format(state.target.x, 2); $('targetYValue').textContent = format(state.target.y, 2); $('targetPair').textContent = `(${format(state.target.x, 2)}, ${format(state.target.y, 2)})`;
    $('theta1').value = K.toDegrees(state.theta1); $('theta2').value = K.toDegrees(state.theta2); $('theta1Value').textContent = deg(state.theta1); $('theta2Value').textContent = deg(state.theta2); $('anglePair').textContent = `(${deg(state.theta1)}, ${deg(state.theta2)})`;
    $('length1').value = state.l1; $('length2').value = state.l2; $('length1Value').textContent = state.l1.toFixed(1); $('length2Value').textContent = state.l2.toFixed(1); $('lengthPair').textContent = `${state.l1.toFixed(1)} + ${state.l2.toFixed(1)}`;
    const status = $('reachStatus'); status.className = 'status-pill';
    if (!result.reachable) { status.classList.add('unreachable'); status.textContent = t.unreachable; }
    else if (result.count === Infinity) { status.classList.add('tangent'); status.textContent = t.infinite; }
    else if (result.count === 1) { status.classList.add('tangent'); status.textContent = t.tangent; }
    else status.textContent = t.reachable;
    $('elbowUp').disabled = !result.reachable; $('elbowDown').disabled = result.solutions.length < 2;
    if (result.solutions.length) {
      const up = result.solutions[0]; const down = result.solutions[result.solutions.length - 1];
      $('upAngles').textContent = `θ₁ ${deg(up.theta1)} · θ₂ ${deg(up.theta2)}`; $('downAngles').textContent = `θ₁ ${deg(down.theta1)} · θ₂ ${deg(down.theta2)}`;
      const s = result.solutions[Math.min(state.branch, result.solutions.length - 1)];
      $('theta1Result').textContent = deg(s.theta1); $('theta2Result').textContent = deg(s.theta2);
    } else { $('theta1Result').textContent = '—'; $('theta2Result').textContent = '—'; }
    $('c2Substitution').textContent = `= (${format(state.target.x ** 2 + state.target.y ** 2, 2)} − ${format(state.l1 ** 2, 2)} − ${format(state.l2 ** 2, 2)}) / ${format(2 * state.l1 * state.l2, 2)}`;
    const fk = K.forward(state.theta1, state.theta2, state.l1, state.l2);
    $('xSubstitution').textContent = `= ${state.l1.toFixed(1)}cos(${deg(state.theta1)}) + ${state.l2.toFixed(1)}cos(${deg(state.theta1 + state.theta2)})`;
    $('xyResult').textContent = `(${format(fk.end.x, 2)}, ${format(fk.end.y, 2)})`;
    draw();
  }
  function setMode(mode) {
    state.mode = mode; $('modeIK').classList.toggle('active', mode === 'ik'); $('modeFK').classList.toggle('active', mode === 'fk');
    document.querySelectorAll('.ik-controls').forEach(el => el.hidden = mode !== 'ik'); document.querySelectorAll('.fk-controls').forEach(el => el.hidden = mode !== 'fk');
    $('ikFormula').hidden = mode !== 'ik'; $('fkFormula').hidden = mode !== 'fk'; $('formulaMode').textContent = mode.toUpperCase(); $('modeDescriptor').textContent = mode.toUpperCase(); $('dragHint').hidden = mode !== 'ik';
    if (mode === 'fk') { const result = K.inverse(state.target.x, state.target.y, state.l1, state.l2); if (result.solutions.length) { state.theta1 = result.solutions[state.branch].theta1; state.theta2 = result.solutions[state.branch].theta2; } }
    else { state.target = K.forward(state.theta1, state.theta2, state.l1, state.l2).end; }
    updateUI();
  }
  function pointerPosition(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function updateTargetFromPointer(event) { const p = screenToWorld(pointerPosition(event)); state.target.x = K.clamp(p.x, -4.8, 4.8); state.target.y = K.clamp(p.y, -4.2, 4.8); updateUI(); }
  canvas.addEventListener('pointerdown', event => { if (state.mode !== 'ik') return; state.dragging = true; canvas.setPointerCapture(event.pointerId); updateTargetFromPointer(event); });
  canvas.addEventListener('pointermove', event => { if (state.dragging) updateTargetFromPointer(event); });
  canvas.addEventListener('pointerup', event => { state.dragging = false; canvas.releasePointerCapture(event.pointerId); });
  $('modeIK').addEventListener('click', () => setMode('ik')); $('modeFK').addEventListener('click', () => setMode('fk'));
  $('targetX').addEventListener('input', e => { state.target.x = +e.target.value; updateUI(); }); $('targetY').addEventListener('input', e => { state.target.y = +e.target.value; updateUI(); });
  $('theta1').addEventListener('input', e => { state.theta1 = K.toRadians(+e.target.value); updateUI(); }); $('theta2').addEventListener('input', e => { state.theta2 = K.toRadians(+e.target.value); updateUI(); });
  $('length1').addEventListener('input', e => { state.l1 = +e.target.value; updateUI(); }); $('length2').addEventListener('input', e => { state.l2 = +e.target.value; updateUI(); });
  $('elbowUp').addEventListener('click', () => { state.branch = 0; $('elbowUp').classList.add('active'); $('elbowDown').classList.remove('active'); updateUI(); });
  $('elbowDown').addEventListener('click', () => { state.branch = 1; $('elbowDown').classList.add('active'); $('elbowUp').classList.remove('active'); updateUI(); });
  $('showGeometry').addEventListener('change', draw); $('showWorkspace').addEventListener('change', draw);
  $('resetButton').addEventListener('click', () => { Object.assign(state, { mode: 'ik', branch: 0, target: { x: 3.2, y: 1.6 }, theta1: K.toRadians(-20), theta2: K.toRadians(75), l1: 2.7, l2: 2.0 }); $('elbowUp').classList.add('active'); $('elbowDown').classList.remove('active'); setMode('ik'); });
  window.addEventListener('resize', resize); window.addEventListener('languagechange', updateUI); resize(); updateUI();
});
