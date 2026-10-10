(() => {
  const K = window.Kinematics;
  const controls = {
    x: document.getElementById('proofX'),
    y: document.getElementById('proofY'),
    l1: document.getElementById('proofL1'),
    l2: document.getElementById('proofL2')
  };
  const outputs = {
    x: document.getElementById('proofXValue'),
    y: document.getElementById('proofYValue'),
    l1: document.getElementById('proofL1Value'),
    l2: document.getElementById('proofL2Value')
  };
  const workspace = document.getElementById('proofWorkspaceCanvas');
  const jacobian = document.getElementById('jacobianCanvas');
  if (!K || !workspace || !jacobian || Object.values(controls).some(control => !control)) return;

  const state = { x: 3.2, y: 1.6, l1: 2.7, l2: 2, dragging: false, view: null, result: null };
  const palette = { ink: '#17191d', muted: '#7b8089', line: '#e5e7eb', blue: '#5475e8', orange: '#ff5a36', purple: '#7b5bc7', paper: '#fcfcfd' };

  function isChinese() { return document.documentElement.lang.startsWith('zh'); }
  function readControls() {
    state.x = Number(controls.x.value);
    state.y = Number(controls.y.value);
    state.l1 = Number(controls.l1.value);
    state.l2 = Number(controls.l2.value);
  }
  function writeControls() {
    controls.x.value = String(state.x);
    controls.y.value = String(state.y);
    controls.l1.value = String(state.l1);
    controls.l2.value = String(state.l2);
  }
  function fitCanvas(canvas, aspectHeight) {
    const width = Math.max(320, Math.round(canvas.clientWidth || 660));
    const height = Math.round(width * aspectHeight / 660);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }
  function circle(ctx, x, y, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function line(ctx, ax, ay, bx, by, color, width = 1, dash = []) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
  function label(ctx, text, x, y, color = palette.muted, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function classification(result) {
    const close = (a, b) => Math.abs(a - b) <= 1e-7;
    if (result.count === Infinity) return {
      count: '∞', en: 'equal links fold back to the origin; θ₁ is arbitrary', zh: '等長連桿折回原點；θ₁ 可任意選擇', statusEn: 'singular · infinitely many', statusZh: '奇異點 · 無限多解'
    };
    if (!result.reachable) {
      const tooFar = result.r > result.outer;
      return { count: '0', en: tooFar ? 'outside the outer boundary' : 'inside the unreachable central hole', zh: tooFar ? '位於外邊界之外' : '位於不可達的中央空洞內', statusEn: 'unreachable', statusZh: '不可達' };
    }
    if (result.count === 2) return { count: '2', en: 'strictly inside the reachable annulus', zh: '嚴格位於可達圓環內部', statusEn: 'regular · two branches', statusZh: '正則 · 兩個分支' };
    const outer = close(result.r, result.outer);
    return { count: '1', en: outer ? 'outer boundary: the links are fully extended' : 'inner boundary: the links are fully folded', zh: outer ? '外邊界：兩連桿完全伸直' : '內邊界：兩連桿完全折疊', statusEn: 'singular · branches meet', statusZh: '奇異點 · 分支合併' };
  }

  function drawArm(ctx, toScreen, solution, color, alpha = 1) {
    const base = toScreen(0, 0);
    const elbow = toScreen(solution.elbow.x, solution.elbow.y);
    const end = toScreen(solution.end.x, solution.end.y);
    ctx.save();
    ctx.globalAlpha = alpha;
    line(ctx, base.x, base.y, elbow.x, elbow.y, color, 9);
    line(ctx, elbow.x, elbow.y, end.x, end.y, color, 7);
    circle(ctx, elbow.x, elbow.y, 7, '#fff', color, 3);
    ctx.restore();
  }

  function drawWorkspace() {
    const { ctx, width, height } = fitCanvas(workspace, 520);
    const result = state.result;
    const margin = 42;
    const span = Math.max(5.4, result.outer * 1.2, Math.abs(state.x) * 1.18, Math.abs(state.y) * 1.18);
    const scale = Math.min((width - margin * 2) / (span * 2), (height - margin * 2) / (span * 2));
    const cx = width / 2, cy = height / 2;
    const toScreen = (x, y) => ({ x: cx + x * scale, y: cy - y * scale });
    state.view = { cx, cy, scale };
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, width, height);

    line(ctx, margin, cy, width - margin, cy, '#e8e9ec');
    line(ctx, cx, margin, cx, height - margin, '#e8e9ec');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, result.outer * scale, 0, Math.PI * 2);
    if (result.inner > 1e-7) ctx.arc(cx, cy, result.inner * scale, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(84,117,232,.09)';
    ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    ctx.setLineDash([6, 6]);
    circle(ctx, cx, cy, result.outer * scale, null, '#8ca2f0', 1.5);
    if (result.inner > 1e-7) circle(ctx, cx, cy, result.inner * scale, null, '#b6c3f5', 1.5);
    ctx.restore();

    if (result.count === Infinity) {
      for (let i = 0; i < 8; i += 1) {
        const theta1 = i * Math.PI / 4;
        const pose = K.forward(theta1, Math.PI, state.l1, state.l2);
        drawArm(ctx, toScreen, pose, i % 2 ? palette.orange : palette.blue, .27);
      }
    } else {
      result.solutions.forEach((solution, index) => drawArm(ctx, toScreen, solution, index ? palette.orange : palette.blue, result.count === 1 ? .92 : .72));
    }

    const base = toScreen(0, 0);
    const target = toScreen(state.x, state.y);
    circle(ctx, base.x, base.y, 7, '#fff', palette.ink, 2);
    circle(ctx, target.x, target.y, 12, 'rgba(255,90,54,.12)', null);
    circle(ctx, target.x, target.y, 6, palette.orange, '#fff', 2);
    label(ctx, 'O', base.x - 13, base.y + 16, palette.ink);
    label(ctx, 'T', target.x + 12, target.y - 13, palette.orange, 'left');
  }

  function drawJacobian() {
    const { ctx, width, height } = fitCanvas(jacobian, 420);
    const pad = { left: 48, right: 24, top: 31, bottom: 40 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const sx = theta => pad.left + (theta + Math.PI) / (Math.PI * 2) * plotW;
    const sy = value => pad.top + (1.15 - value) / 2.3 * plotH;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, width, height);
    line(ctx, pad.left, sy(0), width - pad.right, sy(0), '#cfd2d7');
    line(ctx, sx(0), pad.top, sx(0), height - pad.bottom, '#e3e4e7');
    [-Math.PI, 0, Math.PI].forEach((theta, i) => label(ctx, i === 0 ? '−π' : i === 1 ? '0' : 'π', sx(theta), height - 20, palette.muted));
    [-1, 1].forEach(value => label(ctx, String(value), pad.left - 17, sy(value), palette.muted));

    const drawBranch = (start, end, color) => {
      ctx.beginPath();
      for (let i = 0; i <= 180; i += 1) {
        const theta = start + (end - start) * i / 180;
        const x = sx(theta), y = sy(Math.sin(theta));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    drawBranch(-Math.PI, 0, palette.orange);
    drawBranch(0, Math.PI, palette.blue);
    [-Math.PI, 0, Math.PI].forEach(theta => circle(ctx, sx(theta), sy(0), 4, '#fff', palette.ink, 1.5));

    if (state.result.reachable && state.result.count !== Infinity) {
      state.result.solutions.forEach((solution, index) => {
        const theta = Math.max(-Math.PI, Math.min(Math.PI, solution.theta2));
        line(ctx, sx(theta), sy(0), sx(theta), sy(Math.sin(theta)), index ? palette.orange : palette.blue, 1, [4, 4]);
        circle(ctx, sx(theta), sy(Math.sin(theta)), 6, index ? palette.orange : palette.blue, '#fff', 2);
      });
    }
    label(ctx, 'θ₂', width - 12, sy(0) - 13, palette.ink, 'right');
    label(ctx, 'sin θ₂', pad.left + 4, 14, palette.purple, 'left');
  }

  function update() {
    readControls();
    state.result = K.inverse(state.x, state.y, state.l1, state.l2);
    const info = classification(state.result);
    outputs.x.textContent = state.x.toFixed(2);
    outputs.y.textContent = state.y.toFixed(2);
    outputs.l1.textContent = state.l1.toFixed(1);
    outputs.l2.textContent = state.l2.toFixed(1);
    document.getElementById('proofCount').textContent = info.count;
    document.getElementById('proofReason').textContent = isChinese() ? info.zh : info.en;
    const dText = Number.isFinite(state.result.c2) ? ` · D = ${state.result.c2.toFixed(3)}` : '';
    document.getElementById('proofReadout').textContent = `r = ${state.result.r.toFixed(2)}${dText}`;
    document.getElementById('jacobianStatus').textContent = isChinese() ? info.statusZh : info.statusEn;
    document.querySelectorAll('[data-proof-preset]').forEach(button => button.classList.remove('active'));
    drawWorkspace();
    drawJacobian();
  }

  const presets = {
    interior: { x: 3.2, y: 1.6, l1: 2.7, l2: 2 },
    boundary: { x: 4.7, y: 0, l1: 2.7, l2: 2 },
    outside: { x: 5, y: 1, l1: 2.7, l2: 2 },
    infinite: { x: 0, y: 0, l1: 2, l2: 2 }
  };
  Object.values(controls).forEach(control => control.addEventListener('input', update));
  document.querySelectorAll('[data-proof-preset]').forEach(button => button.addEventListener('click', () => {
    Object.assign(state, presets[button.dataset.proofPreset]);
    writeControls();
    update();
    button.classList.add('active');
  }));

  function targetFromPointer(event) {
    const rect = workspace.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (workspace.clientWidth / rect.width);
    const py = (event.clientY - rect.top) * (workspace.clientHeight / rect.height);
    state.x = K.clamp((px - state.view.cx) / state.view.scale, -5, 5);
    state.y = K.clamp((state.view.cy - py) / state.view.scale, -5, 5);
    writeControls();
    update();
  }
  workspace.addEventListener('pointerdown', event => {
    state.dragging = true;
    workspace.setPointerCapture(event.pointerId);
    targetFromPointer(event);
  });
  workspace.addEventListener('pointermove', event => { if (state.dragging) targetFromPointer(event); });
  workspace.addEventListener('pointerup', () => { state.dragging = false; });
  workspace.addEventListener('pointercancel', () => { state.dragging = false; });
  window.addEventListener('resize', update);
  window.addEventListener('languagechange', update);
  document.addEventListener('DOMContentLoaded', update);
  update();
})();
