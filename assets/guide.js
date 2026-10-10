document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const state = { x: 3.2, y: 1.6, l1: 2.7, l2: 2.0, branch: 0, dragging: false };
  const $ = id => document.getElementById(id);
  const ids = ['theta1DefinitionCanvas', 'theta2DefinitionCanvas', 'problemCanvas', 'triangleCanvas', 'betaCanvas', 'theta2Canvas', 'radiusBaseCanvas', 'radiusTargetCanvas', 'intersectionsCanvas', 'phiCanvas', 'alphaCanvas', 'shoulderCanvas', 'solutionsCanvas'];
  const canvases = Object.fromEntries(ids.map(id => [id, $(id)]));

  const fmt = (number, digits = 1) => {
    const value = Number(number).toFixed(digits);
    return value.startsWith('-') ? '−' + value.slice(1) : value;
  };
  const deg = radians => `${fmt(K.toDegrees(radians), 1)}°`;
  const chinese = () => document.documentElement.lang.startsWith('zh');

  function setup(canvas, view = 'world') {
    const ctx = canvas.getContext('2d');
    const width = canvas.getBoundingClientRect().width || 520;
    const ratio = Number(canvas.getAttribute('width')) / Number(canvas.getAttribute('height'));
    const height = width / ratio;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tr = view === 'intersections'
      ? { width, height, scale: Math.min(width / 9.1, height / 6.8), ox: width * .31, oy: height * .59 }
      : { width, height, scale: Math.min(width / 10.5, height / 7.2), ox: width * .40, oy: height * .67 };
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
    return { result, solution: result.solutions[0] };
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

  function directedArc(ctx, center, radius, startAngle, endAngle, color) {
    let sweep = endAngle - startAngle;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
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
      const o = { x: tr.width * .27, y: tr.height * .68 };
      const length = Math.min(tr.width * .52, tr.height * .48);
      const endAngle = -38 * Math.PI / 180;
      const xEnd = { x: o.x + length * 1.15, y: o.y };
      const e = { x: o.x + length * Math.cos(endAngle), y: o.y + length * Math.sin(endAngle) };
      h.line(o, xEnd, '#9da3ad', 2, [7, 5]);
      h.line(o, e, '#5475e8', 7);
      h.circle(o, 8, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2);
      const labelAt = directedArc(ctx, o, 48, 0, endAngle, '#5475e8');
      h.text('θ₁', labelAt, '#3f61d6', 'center', 13, 800);
      h.text('O', { x: o.x - 13, y: o.y + 15 }, '#17191d', 'right', 11, 700);
      h.text('E', { x: e.x + 11, y: e.y - 10 }, '#5475e8', 'left', 11, 700);
      h.text(chinese() ? '起始：正 x 軸' : 'START · +x axis', { x: xEnd.x, y: xEnd.y + 17 }, '#7d828a', 'right', 10, 700);
      h.text(chinese() ? '終止' : 'END', midpoint(o, e, 12, -17), '#3f61d6', 'center', 10, 700);
      h.text(chinese() ? '逆時針為正' : 'counter-clockwise is +', { x: tr.width * .74, y: 30 }, '#6d727b', 'center', 10, 600);
    }
    {
      const { ctx, tr } = setup(canvases.theta2DefinitionCanvas); const h = drawing(ctx, tr); clear(ctx, tr);
      const e = { x: tr.width * .36, y: tr.height * .68 };
      const length = Math.min(tr.width * .46, tr.height * .46);
      const startAngle = -20 * Math.PI / 180;
      const endAngle = startAngle - 72 * Math.PI / 180;
      const behind = { x: e.x - length * .60 * Math.cos(startAngle), y: e.y - length * .60 * Math.sin(startAngle) };
      const forward = { x: e.x + length * 1.02 * Math.cos(startAngle), y: e.y + length * 1.02 * Math.sin(startAngle) };
      const t = { x: e.x + length * .84 * Math.cos(endAngle), y: e.y + length * .84 * Math.sin(endAngle) };
      h.line(behind, e, '#5475e8', 7);
      h.line(e, forward, '#9da3ad', 2, [7, 5]);
      h.line(e, t, '#ff5a36', 7);
      h.circle(e, 8, '#17191d', '#fff', 2); h.circle(t, 7, '#ff5a36', '#fff', 2);
      const labelAt = directedArc(ctx, e, 47, startAngle, endAngle, '#ff5a36');
      h.text('θ₂', labelAt, '#e24a2b', 'center', 13, 800);
      h.text('E', { x: e.x - 13, y: e.y + 15 }, '#17191d', 'right', 11, 700);
      h.text('T', { x: t.x + 11, y: t.y - 9 }, '#ff5a36', 'left', 11, 700);
      h.text(chinese() ? '第一段連桿' : 'link 1', midpoint(behind, e, -5, 17), '#5475e8', 'center', 10, 700);
      h.text(chinese() ? '起始' : 'START', { x: forward.x - 10, y: forward.y + 20 }, '#7d828a', 'center', 10, 700);
      h.text(chinese() ? '終止' : 'END', { x: t.x + 15, y: t.y + 17 }, '#e24a2b', 'left', 10, 700);
      h.text(chinese() ? '逆時針為正' : 'counter-clockwise is +', { x: tr.width * .75, y: 30 }, '#6d727b', 'center', 10, 600);
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
    const forward = { x: e.x + dx / length * 100, y: e.y + dy / length * 100 };
    h.line(o, e, '#5475e8', 6); h.line(e, t, '#ff5a36', 6); h.line(e, forward, '#7f858e', 2, [6, 5]);
    h.circle(o, 6, '#17191d', '#fff', 2); h.circle(e, 7, '#5475e8', '#fff', 2); h.circle(t, 6, '#ff5a36', '#fff', 2);
    const labelAt = arcBetween(ctx, e, 34, forward, t, '#ff5a36');
    h.text('|θ₂|', labelAt, '#e24a2b', 'center', 12, 800);
    h.text(chinese() ? '連桿 1 延伸線' : 'link 1 forward', { x: forward.x, y: forward.y - 13 }, '#7f858e');
  }

  function drawSingleRadius(canvas, type) {
    const { ctx, tr } = setup(canvas); clear(ctx, tr);
    const h = drawing(ctx, tr);
    const center = { x: tr.width * .5, y: tr.height * .53 };
    const radius = Math.min(tr.width, tr.height) * .29;
    const angle = type === 'base' ? -0.62 : -2.50;
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
      h.text(index === 0 ? 'E₊' : 'E₋', { x: e.x + 13, y: e.y + (index === 0 ? -12 : 13) }, '#6e4eb6', 'left', 12, 700);
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
    const xRef = { x: o.x + 100, y: o.y };
    const phiAt = arcBetween(ctx, o, 48, xRef, t, '#7b5bc7');
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
    const alpha = Math.acos(K.clamp((state.l1 ** 2 + Math.hypot(state.x, state.y) ** 2 - state.l2 ** 2) / (2 * state.l1 * Math.hypot(state.x, state.y)), -1, 1));
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
    const xRef = { x: o.x + 100, y: o.y };
    const thetaAt = arcBetween(ctx, o, 55, xRef, e, '#5475e8');
    h.text('θ₁', thetaAt, '#3f61d6', 'center', 13, 800);
    h.text(chinese() ? '第一段連桿 OE' : 'link 1 · OE', midpoint(o, e, 0, 22), '#5475e8');
    h.text(chinese() ? '目標方向 OT' : 'target direction · OT', midpoint(o, t, 0, -18), '#6e4eb6');
  }

  function drawSolutions() {
    const { ctx, tr } = setup(canvases.solutionsCanvas); const h = drawing(ctx, tr); clear(ctx, tr); axes(h, tr);
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    result.solutions.forEach((solution, index) => robot(ctx, h, solution, index === state.branch ? 1 : .16));
    const target = h.point({ x: state.x, y: state.y });
    h.circle(target, 12, '#ff5a36', '#fff', 2);
    h.text('T', { x: target.x + 16, y: target.y - 20 }, '#ff5a36', 'left', 12, 700);
  }

  function update() {
    const result = K.inverse(state.x, state.y, state.l1, state.l2);
    const r = Math.hypot(state.x, state.y);
    const derivation = $('derivationContent');
    derivation.hidden = !result.reachable;
    document.querySelectorAll('[data-derivation-nav]').forEach(link => { link.hidden = !result.reachable; });
    document.querySelectorAll('[data-guide-x]').forEach(node => node.textContent = fmt(state.x, 1));
    document.querySelectorAll('[data-guide-y]').forEach(node => node.textContent = fmt(state.y, 1));
    $('guideR').textContent = fmt(r, 2);
    $('targetReadout').textContent = `T = (${fmt(state.x, 2)}, ${fmt(state.y, 2)})`;
    const statusBox = $('reachStatusBox');
    statusBox.classList.toggle('unreachable', !result.reachable);
    statusBox.classList.toggle('reachable', result.reachable);
    if (result.reachable) {
      $('reachHeadline').textContent = result.count === 1
        ? (chinese() ? '可以——但只是在邊界相切。' : 'Yes — but only at the boundary.')
        : (chinese() ? '可以組成三角形。' : 'Yes — they can form a triangle.');
      $('reachReason').textContent = chinese()
        ? '目標距離 r 位於機械臂可達的長度範圍內，因此可以繼續求角度。'
        : 'The target distance r lies inside the arm’s reachable interval, so we can continue to the angles.';
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
    if (result.solutions.length) {
      $('guideC2Calc').textContent = `= (${fmt(r * r, 2)} − ${fmt(state.l1 ** 2, 2)} − ${fmt(state.l2 ** 2, 2)}) / ${fmt(2 * state.l1 * state.l2, 2)}`;
      $('guideC2').textContent = fmt(result.c2, 3);
      $('intersectionCount').textContent = chinese() ? `${result.count} 個交點` : `${result.count} intersection${result.count === 1 ? '' : 's'}`;
      const up = result.solutions[0], down = result.solutions[result.solutions.length - 1];
      const beta = Math.PI - Math.abs(up.theta2);
      const phi = Math.atan2(state.y, state.x);
      const alpha = Math.acos(K.clamp((state.l1 ** 2 + r ** 2 - state.l2 ** 2) / (2 * state.l1 * r), -1, 1));
      $('betaValue').textContent = deg(beta); $('guideTheta2').textContent = deg(Math.abs(up.theta2));
      $('guideTheta1').textContent = deg(up.theta1); $('phiInline').textContent = deg(phi);
      $('alphaCosCalc').textContent = `= (${fmt(state.l1 ** 2, 2)} + ${fmt(r ** 2, 2)} − ${fmt(state.l2 ** 2, 2)}) / ${fmt(2 * state.l1 * r, 2)}`;
      $('alphaInline').textContent = deg(alpha); $('thetaPhi').textContent = deg(phi); $('thetaAlpha').textContent = deg(alpha);
      $('guideUpPair').textContent = `(θ₁, θ₂) = (${deg(up.theta1)}, ${deg(up.theta2)})`;
      $('guideDownPair').textContent = `(θ₁, θ₂) = (${deg(down.theta1)}, ${deg(down.theta2)})`;
    }
    drawAngleDefinitions(); drawProblem();
    if (result.reachable) {
      drawTriangle(); drawBeta(); drawTheta2();
      drawSingleRadius(canvases.radiusBaseCanvas, 'base'); drawSingleRadius(canvases.radiusTargetCanvas, 'target');
      drawIntersections(); drawPhi(); drawAlpha(); drawShoulder(); drawSolutions();
    }
  }

  function pointerWorld(event) {
    const canvas = canvases.problemCanvas;
    const rect = canvas.getBoundingClientRect();
    const tr = { width: rect.width, height: rect.height, scale: Math.min(rect.width / 10.5, rect.height / 7.2), ox: rect.width * .40, oy: rect.height * .67 };
    return { x: (event.clientX - rect.left - tr.ox) / tr.scale, y: (tr.oy - (event.clientY - rect.top)) / tr.scale };
  }
  function moveTarget(event) {
    let p = pointerWorld(event);
    state.x = K.clamp(p.x, -4.2, 5.8);
    state.y = K.clamp(p.y, -2.2, 4.5);
    update();
  }
  canvases.problemCanvas.addEventListener('pointerdown', event => {
    state.dragging = true; canvases.problemCanvas.setPointerCapture(event.pointerId); moveTarget(event);
  });
  canvases.problemCanvas.addEventListener('pointermove', event => { if (state.dragging) moveTarget(event); });
  canvases.problemCanvas.addEventListener('pointerup', event => {
    state.dragging = false; canvases.problemCanvas.releasePointerCapture(event.pointerId);
  });
  $('animateSolutions').addEventListener('click', () => { state.branch = state.branch ? 0 : 1; drawSolutions(); });
  window.addEventListener('resize', update);
  window.addEventListener('languagechange', update);
  update();
});
