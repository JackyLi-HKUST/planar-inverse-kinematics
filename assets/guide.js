document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const state = { x: 3.2, y: 1.6, l1: 2.7, l2: 2.0, branch: 0, theta1: 38, theta2: 72, baseAngle: 36, targetAngle: 143 };
  const $ = id => document.getElementById(id);
  const ids = ['theta1DefinitionCanvas', 'theta2DefinitionCanvas', 'problemCanvas', 'triangleCanvas', 'betaCanvas', 'theta2Canvas', 'radiusBaseCanvas', 'radiusTargetCanvas', 'intersectionsCanvas', 'phiCanvas', 'alphaCanvas', 'shoulderCanvas', 'solutionsCanvas'];
  const canvases = Object.fromEntries(ids.map(id => [id, $(id)]));
  const sizes = new Map(Object.values(canvases).map(canvas => [canvas, canvas.width / canvas.height]));
  const frames = new Map();
  const origin = { x: 0, y: 0 };
  let drag = null;

  const fmt = (number, digits = 1) => {
    const value = Number(number).toFixed(digits);
    return value.startsWith('-') ? '−' + value.slice(1) : value;
  };
  const deg = radians => `${fmt(K.toDegrees(radians), 1)}°`;
  const chinese = () => document.documentElement.lang.startsWith('zh');
  const trText = (en, zh) => chinese() ? zh : en;
  const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;

  function setup(canvas, view = 'world') {
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth || 520;
    const ratio = sizes.get(canvas);
    const height = width / ratio;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = { x: state.x, y: state.y };
    const { solution } = activeSolution();
    const bounds = canvas === canvases.problemCanvas
      ? [{ x: -6.5, y: -5.5 }, { x: 6.5, y: 5.5 }, target]
      : view === 'intersections'
      ? [{ x: -state.l1, y: -state.l1 }, { x: state.l1, y: state.l1 },
        { x: target.x - state.l2, y: target.y - state.l2 }, { x: target.x + state.l2, y: target.y + state.l2 }]
      : [origin, target, { x: target.x, y: 0 }, ...(solution ? [solution.elbow] : [])];
    const minX = Math.min(...bounds.map(p => p.x)), maxX = Math.max(...bounds.map(p => p.x));
    const minY = Math.min(...bounds.map(p => p.y)), maxY = Math.max(...bounds.map(p => p.y));
    const tr = drag?.canvas === canvas && drag.world ? drag.frame : {
      width, height,
      scale: Math.min((width - 68) / Math.max(5.4, maxX - minX), (height - 70) / Math.max(3.5, maxY - minY)),
      ox: width / 2, oy: height / 2
    };
    if (!(drag?.canvas === canvas && drag.world)) {
      tr.ox -= (minX + maxX) / 2 * tr.scale;
      tr.oy += (minY + maxY) / 2 * tr.scale;
    }
    frames.set(canvas, tr);
    return { ctx, tr };
  }

  function drawing(ctx, tr) {
    const point = p => ({ x: tr.ox + p.x * tr.scale, y: tr.oy - p.y * tr.scale });
    const line = (a, b, color = '#aeb3bb', width = 1, dash = []) => {
      ctx.save(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
    };
    const circle = (center, radius, stroke = '#aeb3bb', fill = null, width = 1, dash = []) => {
      ctx.save(); ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
    };
    const text = (value, at, color = '#6d727b', align = 'center', size = 11, weight = 500) => {
      ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px ui-monospace, monospace`;
      ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, at.x, at.y); ctx.restore();
    };
    const label = (value, at, color = '#17191d') => {
      ctx.save(); ctx.font = '600 10px ui-monospace, monospace';
      const width = ctx.measureText(value).width + 12;
      ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fillRect(at.x - width / 2, at.y - 10, width, 20);
      ctx.strokeStyle = '#e2e4e8'; ctx.lineWidth = 1; ctx.strokeRect(at.x - width / 2, at.y - 10, width, 20);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(value, at.x, at.y); ctx.restore();
    };
    return { point, line, circle, text, label };
  }

  function clear(ctx, tr) {
    ctx.clearRect(0, 0, tr.width, tr.height);
    ctx.fillStyle = '#fcfcfd'; ctx.fillRect(0, 0, tr.width, tr.height);
  }
  function axes(h, tr) {
    h.line({ x: 18, y: tr.oy }, { x: tr.width - 18, y: tr.oy }, '#e4e6e9');
    h.line({ x: tr.ox, y: 18 }, { x: tr.ox, y: tr.height - 18 }, '#e4e6e9');
    h.text('x', { x: tr.width - 25, y: tr.oy - 12 }, '#9ba0a8');
    h.text('y', { x: tr.ox + 13, y: 24 }, '#9ba0a8');
  }
  function midpoint(a, b, offsetX = 0, offsetY = 0) {
    return { x: (a.x + b.x) / 2 + offsetX, y: (a.y + b.y) / 2 + offsetY };
  }
  function activeSolution() {
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    return { result, solution: result.solutions[state.branch] || result.solutions[0] };
  }
  function displayPose(result) {
    if (result.solutions.length) return result.solutions[0];
    const targetAngle = Math.atan2(state.y, state.x);
    if (result.r > result.outer) {
      return { theta1: targetAngle, theta2: 0, ...K.forward(targetAngle, 0, state.l1, state.l2) };
    }
    const theta1 = state.l1 >= state.l2 ? targetAngle : targetAngle + Math.PI;
    return { theta1, theta2: Math.PI, ...K.forward(theta1, Math.PI, state.l1, state.l2) };
  }
  function segment(ctx, a, b, width, fill) {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#30343a'; ctx.lineWidth = width + 5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = width; ctx.stroke(); ctx.restore();
  }
  function joint(h, point, fill, radius = 9) {
    h.circle(point, radius + 3, '#30343a', '#fff', 2);
    h.circle(point, radius, '#30343a', fill, 2);
  }
  function robot(ctx, h, solution, opacity = 1) {
    const o = h.point({ x: 0, y: 0 });
    const e = h.point(solution.elbow);
    const t = h.point(solution.end);
    ctx.save(); ctx.globalAlpha = opacity;
    segment(ctx, o, e, 18, '#dce1e7');
    segment(ctx, e, t, 15, '#eef0f3');
    joint(h, o, '#ff6c4d', 10); joint(h, e, '#d6dbe1', 9);
    ctx.restore();
  }
  function sideLabel(h, a, b, value, color, normalOffset, fraction = .5) {
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
    const at = {
      x: a.x + dx * fraction - dy / length * normalOffset,
      y: a.y + dy * fraction + dx / length * normalOffset
    };
    h.text(value, at, color, 'center', 12, 750);
  }
  function arcBetween(ctx, center, radius, fromPoint, toPoint, color, width = 3) {
    const a1 = Math.atan2(fromPoint.y - center.y, fromPoint.x - center.x);
    const a2 = Math.atan2(toPoint.y - center.y, toPoint.x - center.x);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ctx.save(); ctx.beginPath(); ctx.arc(center.x, center.y, radius, a1, a1 + diff, diff < 0);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.restore();
    const mid = a1 + diff / 2;
    return { x: center.x + (radius + 14) * Math.cos(mid), y: center.y + (radius + 14) * Math.sin(mid) };
  }

  function directedArc(ctx, center, radius, startAngle, sweep, color) {
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    if (Math.abs(sweep) < 1e-8) return { x: center.x + radius, y: center.y - 17 };
    const counterClockwise = sweep < 0;
    ctx.save();
    ctx.beginPath(); ctx.arc(center.x, center.y, radius, startAngle, startAngle + sweep, counterClockwise);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    const end = startAngle + sweep;
    const tip = { x: center.x + radius * Math.cos(end), y: center.y + radius * Math.sin(end) };
    const travel = counterClockwise ? -1 : 1;
    const tangent = end + travel * Math.PI / 2;
    const back = { x: tip.x - 9 * Math.cos(tangent), y: tip.y - 9 * Math.sin(tangent) };
    const normal = tangent + Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(back.x + 4 * Math.cos(normal), back.y + 4 * Math.sin(normal));
    ctx.lineTo(back.x - 4 * Math.cos(normal), back.y - 4 * Math.sin(normal));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
    const mid = startAngle + sweep / 2;
    return { x: center.x + (radius + 17) * Math.cos(mid), y: center.y + (radius + 17) * Math.sin(mid) };
  }

  function drawAngleDefinitions() {
    {
      const { ctx, tr } = setup(canvases.theta1DefinitionCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
      const o = { x: tr.width * .5, y: tr.height * .53 };
      const length = Math.min(tr.width * .34, tr.height * .32);
      const endAngle = -K.toRadians(state.theta1);
      tr.pivot = o;
      const xEnd = { x: o.x + length * 1.15, y: o.y };
      const e = { x: o.x + length * Math.cos(endAngle), y: o.y + length * Math.sin(endAngle) };
      h.line(o, xEnd, '#9da3ad', 2, [7, 5]);
      h.line(o, e, '#5475e8', 7);
      h.circle(o, 8, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2);
      const labelAt = directedArc(ctx, o, Math.min(44, length * .52), 0, endAngle, '#5475e8');
      if (Math.abs(state.theta1) >= 14) h.text('θ₁', labelAt, '#3f61d6', 'center', 13, 800);
      h.text('O', { x: o.x - 13, y: o.y + 15 }, '#17191d', 'right', 11, 700);
      h.text('E', { x: e.x + 11, y: e.y - 10 }, '#5475e8', 'left', 11, 700);
      h.text(chinese() ? '起始：正 x 軸' : 'START · +x axis', { x: xEnd.x, y: xEnd.y + 17 }, '#7d828a', 'right', 10, 700);
    }
    {
      const { ctx, tr } = setup(canvases.theta2DefinitionCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
      const e = { x: tr.width * .5, y: tr.height * .53 };
      const length = Math.min(tr.width * .37, tr.height * .37);
      const startAngle = -K.toRadians(state.theta1);
      const endAngle = startAngle - K.toRadians(state.theta2);
      tr.pivot = e;
      tr.start = state.theta1;
      const behind = { x: e.x - length * .60 * Math.cos(startAngle), y: e.y - length * .60 * Math.sin(startAngle) };
      const forward = { x: e.x + length * 1.02 * Math.cos(startAngle), y: e.y + length * 1.02 * Math.sin(startAngle) };
      const t = { x: e.x + length * .84 * Math.cos(endAngle), y: e.y + length * .84 * Math.sin(endAngle) };
      h.line(behind, e, '#5475e8', 7);
      h.line(e, forward, '#9da3ad', 2, [7, 5]);
      h.line(e, t, '#ff5a36', 7);
      h.circle(e, 8, '#17191d', '#fff', 2); h.circle(t, 7, '#ff5a36', '#fff', 2);
      const labelAt = directedArc(ctx, e, Math.min(44, length * .45), startAngle, -K.toRadians(state.theta2), '#ff5a36');
      if (Math.abs(state.theta2) >= 14) h.text('θ₂', labelAt, '#e24a2b', 'center', 13, 800);
      h.text('E', { x: e.x - 13, y: e.y + 15 }, '#17191d', 'right', 11, 700);
      h.text('T', { x: t.x + 11, y: t.y - 9 }, '#ff5a36', 'left', 11, 700);
      h.text(chinese() ? '第一段連桿' : 'link 1', midpoint(behind, e, -5, 17), '#5475e8', 'center', 10, 700);
      h.text(chinese() ? '起始' : 'START', { x: forward.x - 10, y: forward.y + 20 }, '#7d828a', 'center', 10, 700);
    }
  }

  function drawProblem() {
    const { ctx, tr } = setup(canvases.problemCanvas); const h = drawing(ctx, tr); clear(ctx, tr); axes(h, tr);
    const { result, solution } = activeSolution();
    const pose = solution || displayPose(result);
    robot(ctx, h, pose, solution ? 1 : .45);
    const o = h.point({ x: 0, y: 0 }), e = h.point(pose.elbow), end = h.point(pose.end);
    const target = h.point({ x: state.x, y: state.y });
    h.text(chinese() ? 'O  底座' : 'O  base', { x: o.x - 17, y: o.y + 28 }, '#17191d', 'right');
    h.text(chinese() ? 'E  肘部' : 'E  elbow', { x: e.x + 15, y: e.y - 22 }, '#5475e8', 'left');
    h.circle(target, 13, '#ff5a36', '#fff', 2); h.line({ x: target.x - 18, y: target.y }, { x: target.x + 18, y: target.y }, '#ff5a36', 2);
    h.line({ x: target.x, y: target.y - 18 }, { x: target.x, y: target.y + 18 }, '#ff5a36', 2);
    h.text('T', { x: target.x + 18, y: target.y - 22 }, '#ff5a36', 'left', 12, 700);
    sideLabel(h, o, e, 'L₁', '#5475e8', -22);
    sideLabel(h, e, end, 'L₂', '#ff5a36', -22);
    if (!result.reachable) {
      h.line(end, target, '#c94120', 2, [6, 5]);
      h.label(chinese() ? '無法到達' : 'OUT OF REACH', midpoint(end, target, 0, -17), '#c94120');
    }
  }

  function drawTriangle() {
    const { ctx, tr } = setup(canvases.triangleCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
    axes(h, tr);
    const { solution } = activeSolution(); if (!solution) return;
    const o = h.point({ x: 0, y: 0 });
    const p = h.point({ x: state.x, y: 0 });
    const t = h.point({ x: state.x, y: state.y });
    const e = h.point(solution.elbow);
    const r = Math.hypot(state.x, state.y);

    // Keep the physical two-link arm visible as context, but subordinate it
    // to the right-triangle construction that explains r.
    h.line(o, e, 'rgba(84,117,232,.58)', 7);
    h.line(e, t, 'rgba(255,90,54,.58)', 7);
    h.circle(e, 6, '#7b5bc7', '#fff', 2);
    sideLabel(h, o, e, 'L₁', '#5475e8', -18);
    sideLabel(h, e, t, 'L₂', '#ff5a36', -18);

    // Coordinate projections form the right triangle used by Pythagoras.
    h.line(o, p, '#9da3ad', 2.5, [7, 5]);
    h.line(p, t, '#9da3ad', 2.5, [7, 5]);
    h.line(o, t, '#7b5bc7', 4);

    // Draw a true right-angle marker at P, oriented toward O and T.
    const horizontalLength = Math.hypot(o.x - p.x, o.y - p.y);
    const verticalLength = Math.hypot(t.x - p.x, t.y - p.y);
    if (horizontalLength > 2 && verticalLength > 2) {
      const size = 13;
      const ux = (o.x - p.x) / horizontalLength, uy = (o.y - p.y) / horizontalLength;
      const vx = (t.x - p.x) / verticalLength, vy = (t.y - p.y) / verticalLength;
      const q1 = { x: p.x + ux * size, y: p.y + uy * size };
      const q2 = { x: q1.x + vx * size, y: q1.y + vy * size };
      const q3 = { x: p.x + vx * size, y: p.y + vy * size };
      h.line(q1, q2, '#6d727b', 2); h.line(q2, q3, '#6d727b', 2);
    }

    h.circle(o, 7, '#17191d', '#fff', 2);
    h.circle(p, 5, '#a2a7af', '#fff', 1.5);
    h.circle(t, 8, '#ff5a36', '#fff', 2);
    h.text('O = (0,0)', { x: o.x - 12, y: o.y + (state.y >= 0 ? 22 : -22) }, '#17191d', 'right');
    h.text('P', { x: p.x + (state.x >= 0 ? 12 : -12), y: p.y + (state.y >= 0 ? 20 : -20) }, '#7d828a', state.x >= 0 ? 'left' : 'right');
    h.text('T', { x: t.x + (state.x >= 0 ? 14 : -14), y: t.y - (state.y >= 0 ? 16 : -16) }, '#ff5a36', state.x >= 0 ? 'left' : 'right', 12, 700);
    h.text('|x|', midpoint(o, p, 0, state.y >= 0 ? 20 : -20), '#7d828a', 'center', 12, 700);
    h.text('|y|', midpoint(p, t, state.x >= 0 ? 23 : -23, 0), '#7d828a', 'center', 12, 700);
    const outside = state.x * state.y >= 0 ? -27 : 27;
    sideLabel(h, o, t, 'r', '#6e4eb6', outside);
  }

  function drawBeta() {
    const { ctx, tr } = setup(canvases.betaCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
    const { solution } = activeSolution(); if (!solution) return;
    const o = h.point({ x: 0, y: 0 }), e = h.point(solution.elbow), t = h.point(solution.end);
    h.line(o, e, '#5475e8', 4); h.line(e, t, '#ff5a36', 4); h.line(o, t, '#aeb3bb', 2);
    h.circle(o, 6, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2); h.circle(t, 6, '#ff5a36', '#fff', 2);
    const labelAt = arcBetween(ctx, e, 34, o, t, '#7b5bc7');
    h.text('β', labelAt, '#6e4eb6', 'center', 13, 800);
    h.text('O', { x: o.x - 13, y: o.y + 15 }); h.text('E', { x: e.x, y: e.y - 18 }, '#5475e8'); h.text('T', { x: t.x + 13, y: t.y + 12 }, '#ff5a36');
    sideLabel(h, o, t, 'r', '#17191d', 18);
  }

  function drawTheta2() {
    const { ctx, tr } = setup(canvases.theta2Canvas); const h = drawing(ctx, tr); clear(ctx, tr);
    const { solution } = activeSolution(); if (!solution) return;
    const o = h.point({ x: 0, y: 0 }), e = h.point(solution.elbow), t = h.point(solution.end);
    const dx = e.x - o.x, dy = e.y - o.y, length = Math.hypot(dx, dy);
    const extension = Math.min(57, tr.scale * 1.2);
    const forward = { x: e.x + dx / length * extension, y: e.y + dy / length * extension };
    h.line(o, e, '#5475e8', 6); h.line(e, t, '#ff5a36', 6); h.line(e, forward, '#7f858e', 2, [6, 5]);
    h.circle(o, 6, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2); h.circle(t, 6, '#ff5a36', '#fff', 2);
    const start = -solution.theta1;
    const labelAt = directedArc(ctx, e, Math.min(30, extension * .55), start, -solution.theta2, '#ff5a36');
    if (Math.abs(solution.theta2) > .2) h.text('θ₂', labelAt, '#e24a2b', 'center', 12, 800);
  }

  function drawSingleRadius(canvas, type) {
    const { ctx, tr } = setup(canvas); clear(ctx, tr);
    const h = drawing(ctx, tr);
    const center = { x: tr.width * .5, y: tr.height * .53 };
    const radius = Math.min(tr.width, tr.height) * .32 * (type === 'base' ? state.l1 : state.l2) / 3.2;
    const angle = -K.toRadians(type === 'base' ? state.baseAngle : state.targetAngle);
    tr.pivot = center;
    const end = { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
    const color = type === 'base' ? '#5475e8' : '#ff5a36';
    const fill = type === 'base' ? 'rgba(84,117,232,.05)' : 'rgba(255,90,54,.045)';
    const symbol = type === 'base' ? 'L₁' : 'L₂';
    h.circle(center, radius, color, fill, 2, [6, 5]); h.line(center, end, color, 5);
    h.circle(center, 8, color, '#fff', 2); h.circle(end, 7, color, '#fff', 2);
    h.text(type === 'base' ? 'O' : 'T', { x: center.x, y: center.y + 22 }, color, 'center', 12, 700);
    h.text('E', { x: end.x + (type === 'base' ? 13 : -13), y: end.y - 12 }, color, type === 'base' ? 'left' : 'right', 12, 700);
    sideLabel(h, center, end, symbol, color, -18);
    h.text(chinese() ? `圓心：${type === 'base' ? '底座 O' : '目標 T'}` : `centre: ${type === 'base' ? 'base O' : 'target T'}`, { x: center.x, y: tr.height - 20 }, '#6d727b');
  }

  function drawIntersections() {
    const { ctx, tr } = setup(canvases.intersectionsCanvas, 'intersections'); const h = drawing(ctx, tr); clear(ctx, tr);
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    const o = h.point({ x: 0, y: 0 }), t = h.point({ x: state.x, y: state.y });
    h.circle(o, state.l1 * tr.scale, '#5475e8', 'rgba(84,117,232,.04)', 2, [6, 5]);
    h.circle(t, state.l2 * tr.scale, '#ff5a36', 'rgba(255,90,54,.035)', 2, [6, 5]);
    result.solutions.forEach((solution, index) => {
      const e = h.point(solution.elbow);
      ctx.save(); ctx.globalAlpha = index === 0 ? .78 : .42;
      h.line(o, e, '#5475e8', 4); h.line(e, t, '#ff5a36', 4);
      ctx.restore();
    });
    h.circle(o, 7, '#17191d', '#fff', 2); h.circle(t, 7, '#ff5a36', '#fff', 2);
    h.text('O', { x: o.x - 13, y: o.y + 14 }, '#17191d'); h.text('T', { x: t.x + 13, y: t.y + 12 }, '#ff5a36');
    result.solutions.forEach((solution, index) => {
      const e = h.point(solution.elbow); h.circle(e, 8, '#7b5bc7', '#fff', 2);
      h.text(result.count === 1 ? 'E' : index === 0 ? 'E₊' : 'E₋', { x: e.x + 13, y: e.y + (index === 0 ? -12 : 13) }, '#6e4eb6', 'left', 12, 700);
    });
  }

  function drawPhi() {
    const { ctx, tr } = setup(canvases.phiCanvas); const h = drawing(ctx, tr); clear(ctx, tr); axes(h, tr);
    const o = h.point({ x: 0, y: 0 });
    const p = h.point({ x: state.x, y: 0 });
    const t = h.point({ x: state.x, y: state.y });
    h.line(o, p, '#a5aab2', 2, [6, 5]);
    h.line(p, t, '#a5aab2', 2, [6, 5]);
    h.line(o, t, '#7b5bc7', 4);
    h.circle(o, 7, '#17191d', '#fff', 2); h.circle(p, 4, '#a2a7af', '#fff', 1.5); h.circle(t, 8, '#ff5a36', '#fff', 2);
    const phiAt = directedArc(ctx, o, 35, 0, Math.atan2(t.y - o.y, t.x - o.x), '#7b5bc7');
    h.text('φ', phiAt, '#6e4eb6', 'center', 13, 800);
    h.text('x', midpoint(o, p, 0, state.y >= 0 ? 18 : -18), '#7d828a', 'center', 12, 700);
    h.text('y', midpoint(p, t, state.x >= 0 ? 20 : -20, 0), '#7d828a', 'center', 12, 700);
    h.text('O', { x: o.x - 13, y: o.y + 15 }, '#17191d'); h.text('T', { x: t.x + 13, y: t.y - 13 }, '#ff5a36', 'left');
  }

  function drawAlpha() {
    const { ctx, tr } = setup(canvases.alphaCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
    const { solution } = activeSolution(); if (!solution) return;
    const o = h.point({ x: 0, y: 0 }), e = h.point(solution.elbow), t = h.point(solution.end);
    h.line(o, e, '#5475e8', 5); h.line(e, t, '#ff5a36', 5); h.line(o, t, '#7b5bc7', 2.5, [7, 5]);
    h.circle(o, 8, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2); h.circle(t, 7, '#ff5a36', '#fff', 2);
    const alphaAt = arcBetween(ctx, o, 43, t, e, '#ff5a36');
    h.text('α', alphaAt, '#e24a2b', 'center', 13, 800);
    sideLabel(h, o, e, 'L₁', '#5475e8', -20, .70);
    sideLabel(h, e, t, 'L₂', '#ff5a36', -20);
    sideLabel(h, o, t, 'r', '#6e4eb6', 22, .68);
    h.text('O', { x: o.x - 13, y: o.y + 15 }, '#17191d'); h.text('E', { x: e.x, y: e.y - 16 }, '#5475e8'); h.text('T', { x: t.x + 13, y: t.y + 12 }, '#ff5a36');
  }

  function drawShoulder() {
    const { ctx, tr } = setup(canvases.shoulderCanvas); const h = drawing(ctx, tr); clear(ctx, tr); axes(h, tr);
    const { solution } = activeSolution(); if (!solution) return;
    const o = h.point({ x: 0, y: 0 }), e = h.point(solution.elbow), t = h.point(solution.end);
    h.line(o, t, 'rgba(123,91,199,.38)', 2, [7, 5]);
    h.line(o, e, '#5475e8', 7);
    h.line(e, t, 'rgba(255,90,54,.22)', 5);
    h.circle(o, 8, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2); h.circle(t, 6, '#ff5a36', '#fff', 2);
    const thetaAt = directedArc(ctx, o, 37, 0, -solution.theta1, '#5475e8');
    h.text('θ₁', thetaAt, '#3f61d6', 'center', 13, 800);
    h.text(chinese() ? '第一段連桿 OE' : 'link 1 · OE', midpoint(o, e, 0, 22), '#5475e8');
    h.text(chinese() ? '目標方向 OT' : 'target direction · OT', midpoint(o, t, 0, -18), '#6e4eb6');
  }

  function drawSolutions() {
    const { ctx, tr } = setup(canvases.solutionsCanvas); const h = drawing(ctx, tr); clear(ctx, tr); axes(h, tr);
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    const selected = result.solutions[state.branch] || result.solutions[0];
    result.solutions.filter(solution => solution !== selected).forEach(solution => robot(ctx, h, solution, .16));
    if (selected) robot(ctx, h, selected);
    const target = h.point({ x: state.x, y: state.y });
    h.circle(target, 12, '#ff5a36', '#fff', 2);
    h.text('T', { x: target.x + 16, y: target.y - 20 }, '#ff5a36', 'left', 12, 700);
  }

  function update() {
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    const r = Math.hypot(state.x, state.y);
    const derivation = $('derivationContent');
    const regular = result.reachable && result.count !== Infinity;
    derivation.hidden = !regular;
    document.querySelectorAll('[data-derivation-nav]').forEach(link => { link.hidden = !regular; });
    document.querySelectorAll('[data-guide-x]').forEach(node => node.textContent = fmt(state.x, 2));
    document.querySelectorAll('[data-guide-y]').forEach(node => node.textContent = fmt(state.y, 2));
    $('guideLength1').textContent = fmt(state.l1);
    $('guideLength2').textContent = fmt(state.l2);
    $('guideR').textContent = fmt(r, 2);
    $('targetReadout').textContent = `T = (${fmt(state.x, 2)}, ${fmt(state.y, 2)})`;
    const statusBox = $('reachStatusBox');
    statusBox.classList.toggle('unreachable', !result.reachable);
    statusBox.classList.toggle('reachable', result.reachable);
    if (result.reachable) {
      $('reachHeadline').textContent = result.count === Infinity
        ? trText('Infinitely many folded poses.', '有無限多種折疊姿態。')
        : result.count === 1
        ? (chinese() ? '可以——但只是在邊界相切。' : 'Yes — but only at the boundary.')
        : (chinese() ? '可以組成三角形。' : 'Yes — they can form a triangle.');
      $('reachReason').textContent = result.count === Infinity
        ? trText('The circles coincide. With equal links and T at O, θ₂ = 180° and every θ₁ works. The ray OT has no direction.', '兩圓重合。兩段等長且 T 位於 O 時，θ₂ = 180°，而 θ₁ 可以是任何角度。此時 OT 沒有方向。')
        : result.count === 1
          ? trText('The links are collinear. The two branches meet in one pose.', '兩段連桿共線，兩個分支合併成一組解。')
          : trText('The target distance r lies inside the arm’s reachable interval, so we can continue to the angles.', '目標距離 r 位於機械臂可達的長度範圍內，因此可以繼續求角度。');
      $('reachCheck').textContent = `${fmt(result.inner, 1)} ≤ ${fmt(r, 2)} ≤ ${fmt(result.outer, 1)}  ✓`;
    } else if (r > result.outer) {
      $('reachHeadline').textContent = chinese() ? '不能組成三角形——目標太遠。' : 'Cannot form a triangle — the target is too far away.';
      $('reachReason').textContent = chinese()
        ? `即使兩段連桿完全伸直，最長也只有 ${fmt(result.outer, 1)}，但 r = ${fmt(r, 2)}。`
        : `Even fully extended, the links reach only ${fmt(result.outer, 1)}, but r = ${fmt(r, 2)}.`;
      $('reachCheck').textContent = `${fmt(r, 2)} > L₁ + L₂ = ${fmt(result.outer, 1)}  ✕`;
    } else {
      $('reachHeadline').textContent = chinese() ? '不能組成三角形——目標太近。' : 'Cannot form a triangle — the target is too close.';
      $('reachReason').textContent = chinese()
        ? `兩段連桿完全折疊後仍相差 ${fmt(result.inner, 1)}，但 r 只有 ${fmt(r, 2)}。`
        : `Even fully folded, the unequal links differ by ${fmt(result.inner, 1)}, but r is only ${fmt(r, 2)}.`;
      $('reachCheck').textContent = `${fmt(r, 2)} < |L₁ − L₂| = ${fmt(result.inner, 1)}  ✕`;
    }
    if (regular) {
      $('guideC2Calc').textContent = `= (${fmt(r * r, 2)} − ${fmt(state.l1 ** 2, 2)} − ${fmt(state.l2 ** 2, 2)}) / ${fmt(2 * state.l1 * state.l2, 2)}`;
      $('guideC2').textContent = fmt(result.c2, 3);
      $('intersectionCount').textContent = chinese() ? `${result.count} 個交點` : `${result.count} intersection${result.count === 1 ? '' : 's'}`;
      const [up, down] = result.solutions;
      const selected = result.solutions[state.branch] || up;
      const beta = Math.PI - Math.abs(up.theta2);
      const phi = Math.atan2(state.y, state.x);
      const alpha = Math.abs(Math.atan2(state.l2 * Math.sin(up.theta2), state.l1 + state.l2 * Math.cos(up.theta2)));
      $('betaValue').textContent = deg(beta); $('guideTheta2').textContent = deg(Math.abs(up.theta2));
      $('theta2Sign').textContent = result.count === 2 ? '± ' : '';
      $('theta2ResultSign').textContent = result.count === 2 ? '±' : '';
      $('guideTheta1').textContent = `${fmt(wrap(K.toDegrees(selected.theta1)))}°`; $('phiInline').textContent = deg(phi);
      $('alphaCosCalc').textContent = `= (${fmt(state.l1 ** 2, 2)} + ${fmt(r ** 2, 2)} − ${fmt(state.l2 ** 2, 2)}) / ${fmt(2 * state.l1 * r, 2)}`;
      $('alphaInline').textContent = deg(alpha); $('thetaPhi').textContent = deg(phi); $('thetaAlpha').textContent = deg(alpha);
      document.querySelectorAll('[data-guide-offset-sign]').forEach(node => { node.textContent = selected.theta2 < 0 ? '+' : '−'; });
      $('guideUpPair').textContent = `(θ₁, θ₂) = (${fmt(wrap(K.toDegrees(up.theta1)))}°, ${deg(up.theta2)})`;
      $('guideDownPair').parentElement.hidden = !down;
      if (down) $('guideDownPair').textContent = `(θ₁, θ₂) = (${fmt(wrap(K.toDegrees(down.theta1)))}°, ${deg(down.theta2)})`;
      $('intersectionSet').textContent = down ? '{ E₊, E₋ }' : '{ E }';
      $('intersectionSummary').textContent = down
        ? trText('The two intersections E₊ and E₋ give two poses that reach the same T.', '兩個交點 E₊、E₋ 對應兩種到達同一個 T 的姿態。')
        : trText('The circles touch at E, so only one pose reaches T.', '兩圓在 E 點相切，因此只有一種姿態能到達 T。');
      $('intersectionExplanation').textContent = down
        ? trText('The ± sign describes mirror triangles on opposite sides of OT.', '± 代表位於 OT 兩側、互為鏡像的三角形。')
        : trText('At tangency, the mirror triangles collapse onto the same line.', '兩圓相切時，鏡像三角形都退化在同一直線上。');
      $('solutionHeading').textContent = down
        ? trText('Two angle pairs, one target.', '兩組角度，同一個目標。')
        : trText('One angle pair at the boundary.', '邊界上只有一組角度。');
      $('solutionsCaption').textContent = down ? trText('Both poses land on the same target.', '兩種姿態都到達同一目標。') : trText('At the boundary, the two poses coincide.', '在邊界上，兩種姿態重合。');
    }
    drawAngleDefinitions(); drawProblem();
    if (regular) {
      drawTriangle(); drawBeta(); drawTheta2();
      drawSingleRadius(canvases.radiusBaseCanvas, 'base'); drawSingleRadius(canvases.radiusTargetCanvas, 'target');
      drawIntersections(); drawPhi(); drawAlpha(); drawShoulder(); drawSolutions();
    }
    syncControls(result);
  }

  const controls = [];
  const panels = new Map();
  const localAngles = {
    theta1DefinitionCanvas: 'theta1', theta2DefinitionCanvas: 'theta2',
    radiusBaseCanvas: 'baseAngle', radiusTargetCanvas: 'targetAngle'
  };
  const targetAngle = () => Math.atan2(state.y, state.x);
  const distance = () => Math.hypot(state.x, state.y);
  const inner = () => Math.abs(state.l1 - state.l2);
  const outer = () => state.l1 + state.l2;
  const distanceMin = () => inner() || .01;
  const setPolar = (r, angle = targetAngle()) => {
    state.x = r * Math.cos(angle);
    state.y = r * Math.sin(angle);
  };
  const setDistance = value => setPolar(K.clamp(value, distanceMin(), outer()));

  function panel(id) {
    if (panels.has(id)) return panels.get(id);
    const canvas = canvases[id];
    const element = document.createElement('div');
    element.className = 'guide-controls';
    const hint = document.createElement('p');
    hint.className = 'guide-control-hint';
    element.append(hint);
    canvas.after(element);
    panels.set(id, element);
    return element;
  }

  function slider(id, names, get, set, min, max, step, format) {
    const label = document.createElement('label');
    label.className = 'guide-slider';
    const name = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'range';
    input.step = step;
    const value = document.createElement('span');
    value.className = 'guide-slider-value';
    value.setAttribute('aria-hidden', 'true');
    label.append(name, input, value);
    panel(id).append(label);
    input.addEventListener('input', () => { set(Number(input.value)); update(); });
    controls.push(result => {
      name.textContent = trText(...names);
      input.min = typeof min === 'function' ? min() : min;
      input.max = typeof max === 'function' ? max() : max;
      const current = get(result);
      input.value = current;
      value.textContent = format(current);
      input.setAttribute('aria-valuetext', value.textContent);
    });
  }

  function button(container, names, action) {
    const control = document.createElement('button');
    control.type = 'button';
    container.append(control);
    control.addEventListener('click', action);
    controls.push(() => { control.textContent = trText(...names); });
    return control;
  }

  function syncControls(result) {
    controls.forEach(sync => sync(result));
    panels.forEach((element, id) => {
      const hint = id.startsWith('theta') && id.endsWith('DefinitionCanvas')
        ? trText('Drag the link endpoint or use the slider.', '拖動連桿端點，或使用滑桿。')
        : localAngles[id] ? trText('Drag E around the circle or use the slider.', '沿圓周拖動 E，或使用滑桿。')
          : id === 'problemCanvas' ? trText('Drag T or use the sliders. All steps share this target and these lengths.', '拖動 T 或使用滑桿。各步驟共用這個目標及連桿長度。')
            : trText('Drag T within reach, or use the controls below.', '在可達範圍內拖動 T，或使用下方控制。');
      element.firstElementChild.textContent = hint;
    });
    $('theta1DefinitionValue').textContent = `θ₁ = ${fmt(state.theta1, 0)}°`;
    $('theta2DefinitionValue').textContent = `θ₂ = ${fmt(state.theta2, 0)}°`;
    $('absoluteDirectionValue').textContent = `${fmt(state.theta1, 0)}° + (${fmt(state.theta2, 0)}°) = ${fmt(state.theta1 + state.theta2, 0)}°`;
    const active = result.solutions[state.branch] || result.solutions[0];
    const branchText = active?.theta2 < 0 ? 'θ₂ < 0' : 'θ₂ > 0';
    [$('animateSolutions'), shoulderBranch].forEach(control => {
      control.disabled = result.count !== 2;
      control.textContent = result.count === 2
        ? trText(`Switch branch · ${branchText}`, `切換分支 · ${branchText}`)
        : trText('One branch at the boundary', '邊界上只有一組解');
    });
  }

  const angleFmt = value => `${fmt(value, 0)}°`;
  const addAngle = (id, key, names) => slider(id, names, () => state[key], value => { state[key] = value; }, -180, 180, 1, angleFmt);
  addAngle('theta1DefinitionCanvas', 'theta1', ['θ₁ · shoulder', 'θ₁ · 肩角']);
  addAngle('theta2DefinitionCanvas', 'theta2', ['θ₂ · elbow', 'θ₂ · 肘角']);
  addAngle('radiusBaseCanvas', 'baseAngle', ['Turn around O', '繞 O 旋轉']);
  addAngle('radiusTargetCanvas', 'targetAngle', ['Turn around T', '繞 T 旋轉']);
  for (const axis of ['x', 'y']) {
    slider('problemCanvas', [axis, axis], () => state[axis], value => { state[axis] = value; }, -8, 8, .01, v => fmt(v, 2));
  }
  for (const [key, label] of [['l1', 'L₁'], ['l2', 'L₂']]) {
    slider('problemCanvas', [label, label], () => state[key], value => { state[key] = value; }, 1, 3.2, .1, fmt);
  }
  const examples = document.createElement('div');
  examples.className = 'guide-demo-buttons';
  panel('problemCanvas').append(examples);
  const presets = [
    [['Two solutions', '兩個解'], () => setPolar((inner() + outer()) / 2, Math.PI / 6)],
    [['One solution', '一個解'], () => setPolar(outer(), Math.PI / 6)],
    [['Too far', '太遠'], () => setPolar(outer() + .8, Math.PI / 6)],
    [['Too close / centre', '太近／圓心'], () => setPolar(0, 0)],
    [['Reset', '重設'], () => Object.assign(state, { x: 3.2, y: 1.6, l1: 2.7, l2: 2, branch: 0 })]
  ];
  presets.forEach(([names, choose]) => button(examples, names, () => { choose(); update(); }));
  document.querySelectorAll('[data-guide-case]').forEach(control => {
    control.addEventListener('click', () => {
      presets[Number(control.dataset.guideCase)][1]();
      $('reachability').focus();
      update();
      $('reachability').scrollIntoView({ block: 'center' });
    });
  });
  for (const id of ['triangleCanvas', 'intersectionsCanvas', 'alphaCanvas', 'solutionsCanvas']) {
    slider(id, ['Distance r', '距離 r'], distance, setDistance, distanceMin, outer, 'any', value => fmt(value, 2));
  }
  for (const id of ['betaCanvas', 'theta2Canvas']) {
    slider(id, id === 'betaCanvas' ? ['Internal angle β', '內角 β'] : ['Bend |θ₂|', '彎曲幅度 |θ₂|'],
      result => id === 'betaCanvas' ? 180 - K.toDegrees(Math.acos(result.c2)) : K.toDegrees(Math.acos(result.c2)),
      value => {
        const bend = K.toRadians(id === 'betaCanvas' ? 180 - value : value);
        setDistance(Math.sqrt(Math.max(0, state.l1 ** 2 + state.l2 ** 2 + 2 * state.l1 * state.l2 * Math.cos(bend))));
      }, 0, 180, 'any', angleFmt);
  }
  slider('phiCanvas', ['Direction φ', '目標方向 φ'], () => K.toDegrees(targetAngle()),
    value => setPolar(distance(), K.toRadians(value)), -180, 180, 1, angleFmt);
  const switchBranch = () => { state.branch = 1 - state.branch; update(); };
  const shoulderBranch = button(panel('shoulderCanvas'), ['', ''], switchBranch);
  $('animateSolutions').addEventListener('click', switchBranch);

  function movePoint(event) {
    const { canvas, frame, world } = drag;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (!world) {
      const angle = K.toDegrees(Math.atan2(frame.pivot.y - y, x - frame.pivot.x));
      state[localAngles[canvas.id]] = Math.round(wrap(angle - (frame.start || 0)));
    } else {
      const xWorld = K.clamp((x - frame.ox) / frame.scale, -8, 8);
      const yWorld = K.clamp((frame.oy - y) / frame.scale, -8, 8);
      if (canvas === canvases.problemCanvas) {
        state.x = xWorld; state.y = yWorld;
      } else {
        setPolar(K.clamp(Math.hypot(xWorld, yWorld), distanceMin(), outer()), Math.atan2(yWorld, xWorld));
      }
    }
    update();
  }

  for (const canvas of Object.values(canvases)) {
    canvas.classList.add('guide-draggable');
    canvas.addEventListener('pointerdown', event => {
      if (drag || event.button !== 0) return;
      drag = { canvas, frame: frames.get(canvas), world: !localAngles[canvas.id], pointer: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      movePoint(event);
    });
    canvas.addEventListener('pointermove', event => {
      if (drag?.canvas === canvas && drag.pointer === event.pointerId) movePoint(event);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(type, event => {
        if (drag?.canvas !== canvas || drag.pointer !== event.pointerId) return;
        drag = null;
        update();
      });
    }
  }
  window.addEventListener('resize', update);
  window.addEventListener('languagechange', update);
  update();
});
