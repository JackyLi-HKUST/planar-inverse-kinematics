document.addEventListener('DOMContentLoaded', () => {
  const K = window.Kinematics;
  const $ = id => document.getElementById(id);
  const L1 = 2.7, L2 = 2;
  const point = (x, y) => ({ x, y });
  const triangle = [point(1, 1), point(3.5, 1), point(2, 3.5)];
  const square = [point(1, 1), point(3, 1), point(3, 3), point(1, 3)];
  const detour = [point(-2, 0), point(2, 0)];
  const strokes = [point(-2, -.5), point(-2, .5), point(2, .5), point(2, -.5)];
  const loopEdges = points => points.map((p, i) => [p, points[(i + 1) % points.length]]);
  const levels = [
    {
      title: ['Finish the triangle', '完成三角形'],
      task: ['Run the starter program to draw the first side. Add two DRAW lines to finish the triangle.',
        '先執行範例，畫出第一條邊。再加兩行 DRAW，完成三角形。'],
      hint: ['The first side ends at B. Draw to C, then draw back to A.', '第一條邊在 B 結束。先畫到 C，再畫回 A。'],
      points: triangle, edges: loopEdges(triangle), start: 'MOVE 1 1\nDRAW 3.5 1'
    },
    {
      title: ['Close the square', '畫出正方形'],
      task: ['Start at A. Read the four coordinates and trace all four sides with your program.',
        '從 A 出發。看清楚四個頂點的座標，寫程式畫出四條邊。'],
      hint: ['Follow the vertices in order. Finish where you started.', '順着頂點的次序畫，最後回到起點。'],
      points: square, edges: loopEdges(square), start: 'MOVE 1 1'
    },
    {
      title: ['Draw around the hole', '繞過中央圓洞'],
      task: ['Both A and B are reachable. Run the direct route and see where it fails. Draw from A to B in one stroke by adding a waypoint.',
        'A 和 B 都可達。先執行直線路徑，看看哪裏走不了。加入一個中途點，從 A 一筆畫到 B。'],
      hint: ['Check the whole segment between each pair of points. Every point must stay at least 0.70 units from the origin.',
        '檢查相鄰兩點之間的整條線段。線段上的每一點都要離原點至少 0.70 單位。'],
      points: detour, start: 'MOVE -2 0\nDRAW 2 0'
    },
    {
      title: ['Draw two separate strokes', '畫出兩條分開的線'],
      task: ['Draw AB and CD. The pen must travel between them without leaving ink or entering the unreachable centre.',
        '畫出 AB 和 CD。筆尖在兩條線之間移動時，不能留下筆跡，也不能進入中央不可達區。'],
      hint: ['A MOVE still uses IK. Add an intermediate MOVE to carry the pen around the hole before the second stroke.',
        '抬筆的 MOVE 也要用逆運動學。畫第二條線之前，試加一行 MOVE，讓筆尖繞過圓洞。'],
      points: strokes, edges: [[strokes[0], strokes[1]], [strokes[2], strokes[3]]],
      start: 'MOVE -2 -0.5\nDRAW -2 0.5\nMOVE 2 0.5\nDRAW 2 -0.5'
    },
    {
      title: ['Make your own drawing', '畫你自己的圖案'],
      task: ['Choose any coordinates in the ring. Lift the pen with MOVE to start a separate stroke.',
        '在可達圓環內自選座標。要開始另一筆，就用 MOVE 抬筆移動。'],
      hint: ['The pen can reach points with 0.70 ≤ √(x² + y²) ≤ 4.70. A straight segment must satisfy this inequality along its entire length.',
        '筆尖的可達範圍是 0.70 ≤ √(x² + y²) ≤ 4.70。一整條直線上的每個點都要符合這個不等式。'],
      points: [], start: 'MOVE 1 1\nDRAW 2 3\nDRAW 3 1'
    }
  ];

  const program = $('gameProgram'), runButton = $('gameRun'), nextButton = $('gameNext');
  const levelButtons = [...document.querySelectorAll('[data-game-level]')];
  const drafts = levels.map(level => level.start);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let levelIndex = 0, frame = 0, message = ['', ''];
  const tr = pair => pair[document.documentElement.lang.startsWith('zh') ? 1 : 0];
  const currentLevel = () => levels[levelIndex];
  const fixed = n => (Math.abs(n) < .005 ? 0 : n).toFixed(2);
  const coords = ({ x, y }) => `${x} ${-y}`;
  const pair = ({ x, y }) => `(${x}, ${y})`;
  const linePath = (a, b) => `M ${coords(a)} L ${coords(b)} `;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const samePoint = (a, b) => distance(a, b) < 1e-6;
  const letter = i => 'ABCD'[i];
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

  function closestPointToOrigin(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return a;
    const t = K.clamp(-(a.x * dx + a.y * dy) / lengthSquared, 0, 1);
    return point(a.x + t * dx, a.y + t * dy);
  }

  function compile(source) {
    const commands = [];
    const rows = source.replaceAll('−', '-').split(/\r?\n/);
    let previous;
    for (const [i, row] of rows.entries()) {
      const text = row.trim();
      if (!text) continue;
      const line = i + 1;
      const fail = (en, zh, blocked) => ({ error: [`Line ${line} · ${en}`, `第 ${line} 行 · ${zh}`], blocked });
      if (commands.length === 60) return fail('Use at most 60 commands.', '最多可使用 60 行指令。');
      const [name, x, y, extra] = text.split(/\s+/);
      const command = name.toUpperCase();
      if (!['MOVE', 'DRAW'].includes(command) || extra !== undefined ||
          ![x, y].every(n => decimal.test(n) && Number.isFinite(Number(n)))) {
        return fail('Enter MOVE x y or DRAW x y, with two numbers separated by spaces.',
          '請輸入 MOVE x y 或 DRAW x y，兩個數字用空格分開。');
      }
      if (!previous && command !== 'MOVE') {
        return fail('Start with MOVE to place the pen.', '第一行要用 MOVE 設定起點。');
      }
      const end = point(Number(x), Number(y));
      const reach = K.reachability(end.x, end.y, L1, L2);
      if (!reach.reachable) {
        const blocked = reach.r <= 8 ? (previous ? linePath(previous, end) : linePath(point(end.x - .15, end.y), point(end.x + .15, end.y))) : '';
        return fail(`${pair(end)} is outside the reachable ring (0.70 ≤ r ≤ 4.70).`,
          `${pair(end)} 不在可達圓環內（0.70 ≤ r ≤ 4.70）。`, blocked);
      }
      if (previous) {
        // With both endpoints inside the outer disc, only the inner hole can block the segment.
        const closest = closestPointToOrigin(previous, end);
        if (!K.reachability(closest.x, closest.y, L1, L2).reachable) {
          const radius = fixed(Math.hypot(closest.x, closest.y));
          return fail(`Both endpoints are reachable, but the line gets as close as ${radius} to the origin. It needs at least 0.70.`,
            `兩個端點都可達，但線段離原點最近只有 ${radius}，需要至少 0.70。`, linePath(previous, end));
        }
      }
      commands.push({ start: previous, end, draws: command === 'DRAW', line });
      previous = end;
    }
    return commands.length ? { commands } : { error: ['Write a MOVE command to get started.', '先寫一行 MOVE 設定起點。'] };
  }

  function score(commands) {
    const level = currentLevel();
    const ink = commands.filter(step => step.draws && !samePoint(step.start, step.end));
    if (levelIndex === levels.length - 1) {
      return ['done', [`Program finished · ${ink.length} drawn segments.`, `執行完成 · 共畫了 ${ink.length} 條線段。`]];
    }
    if (!level.edges) {
      const [a, b] = level.points;
      const continuous = commands.slice(1).every(step => step.draws);
      if (continuous && samePoint(commands[0].end, a) && samePoint(commands.at(-1).end, b)) return ['solved', ['You reached B in one stroke.', '成功一筆畫到 B。']];
      return ['incomplete', ['Start at A and finish at B using one continuous stroke.', '請從 A 出發，用一筆連續畫到 B。']];
    }
    const intervals = level.edges.map(() => []);
    let extra = false;
    for (const { start, end } of ink) {
      const edge = level.edges.findIndex(([a, b], index) => {
        const t0 = positionOnEdge(start, a, b), t1 = positionOnEdge(end, a, b);
        if (t0 === null || t1 === null) return false;
        intervals[index].push([Math.min(t0, t1), Math.max(t0, t1)]);
        return true;
      });
      if (edge === -1) extra = true;
    }
    const hits = intervals.filter(coversEdge).length;
    const progress = [`${hits} / ${level.edges.length} guide lines drawn.`, `已畫出 ${hits} / ${level.edges.length} 條指定線段。`];
    if (extra) return ['incomplete', [`${progress[0]} Check for strokes outside the guide.`, `${progress[1]} 請檢查有沒有多畫的線段。`]];
    return [hits === level.edges.length ? 'solved' : 'incomplete', progress];
  }

  function positionOnEdge(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = K.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return samePoint(p, point(a.x + t * dx, a.y + t * dy)) ? t : null;
  }

  function coversEdge(intervals) {
    let reached = 0;
    for (const [start, end] of intervals.sort(([a], [b]) => a - b)) {
      if (start > reached + 1e-6) return false;
      reached = Math.max(reached, end);
    }
    return reached >= 1 - 1e-6;
  }

  function place(id, p, x = 'cx', y = 'cy') {
    $(id).setAttribute(x, p.x);
    $(id).setAttribute(y, -p.y);
  }

  function drawArm(target) {
    const { elbow, end, theta1, theta2 } = K.inverse(target.x, target.y, L1, L2).solutions[0];
    place('gameLink1', elbow, 'x2', 'y2');
    place('gameLink2', elbow, 'x1', 'y1');
    place('gameLink2', end, 'x2', 'y2');
    place('gameElbow', elbow);
    place('gameElbowCore', elbow);
    place('gamePen', end);
    $('gamePosition').textContent = `(${fixed(end.x)}, ${fixed(end.y)})`;
    $('gameTheta1').textContent = `${fixed(K.toDegrees(theta1))}°`;
    $('gameTheta2').textContent = `${fixed(K.toDegrees(theta2))}°`;
  }

  function drawLabels() {
    $('gameTicks').innerHTML = [-4, -3, -2, -1, 1, 2, 3, 4].map(n =>
      `<text x="${n}" y=".3" text-anchor="middle">${n}</text><text x="-.12" y="${-n + .08}" text-anchor="end">${n}</text>`).join('');
    const { points, edges } = currentLevel();
    $('gameGuide').setAttribute('d', edges ? edges.map(([a, b]) => linePath(a, b)).join('') : '');
    $('gameWaypoints').innerHTML = points.map(({ x, y }, i) =>
      `<circle cx="${x}" cy="${-y}" r=".08"/><text x="${x + .13}" y="${-y - .15}">${letter(i)}</text>`).join('');
    $('gamePoints').innerHTML = points.map((p, i) => `<li><b>${letter(i)}</b> ${pair(p)}</li>`).join('');
    $('gamePoints').hidden = !points.length;
  }

  function setMessage(phase, text) {
    message = text;
    $('gameStatus').dataset.phase = phase;
    $('gameStatus').textContent = tr(message);
  }

  function setRunning(running) {
    runButton.disabled = running;
    program.readOnly = running;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    setRunning(false);
  }

  function translate() {
    const level = currentLevel();
    $('game-level-heading').textContent = tr(level.title);
    $('gameTask').textContent = tr(level.task);
    $('gameHintText').textContent = tr(level.hint);
    $('gameStatus').textContent = tr(message);
    $('gameBoardTitle').textContent = tr(['Two-link drawing arm and its reachable workspace', '雙連桿畫圖機械臂及其可達範圍']);
  }

  function loadLevel(index) {
    stop();
    levelIndex = index;
    program.value = drafts[index];
    $('gameLevelNumber').textContent = index < 4 ? `0${index + 1} / 04` : '✳';
    levelButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    $('gameInk').setAttribute('d', '');
    $('gameBlocked').setAttribute('d', '');
    nextButton.hidden = true;
    $('gameHint').open = false;
    drawLabels();
    drawArm(currentLevel().points[0] || point(1, 1));
    setMessage('ready', ['Ready to run.', '可以執行程式了。']);
    translate();
  }

  function finish(commands) {
    stop();
    const [phase, text] = score(commands);
    const solved = phase === 'solved';
    setMessage(phase, solved ? [`Level complete · ${text[0]}`, `過關 · ${text[1]}`] : text);
    if (solved) {
      levelButtons[levelIndex].classList.add('is-complete');
      nextButton.hidden = false;
    }
  }

  function run() {
    stop();
    nextButton.hidden = true;
    $('gameInk').setAttribute('d', '');
    const { commands, error, blocked } = compile(program.value);
    $('gameBlocked').setAttribute('d', blocked || '');
    if (error) {
      setMessage('error', error);
      return;
    }

    const [first, ...steps] = commands;
    drawArm(first.end);
    if (!steps.length || reduceMotion.matches) {
      $('gameInk').setAttribute('d', steps.filter(step => step.draws).map(step => linePath(step.start, step.end)).join(''));
      drawArm(commands.at(-1).end);
      finish(commands);
      return;
    }

    setRunning(true);
    if (window.matchMedia('(max-width: 760px)').matches) {
      $('gameBoard').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    let stepIndex = 0, started, ink = '';
    const showLine = () => {
      const step = steps[stepIndex];
      setMessage('running', [`Line ${step.line} · ${step.draws ? 'Drawing' : 'Pen up'} to ${pair(step.end)}`,
        `第 ${step.line} 行 · ${step.draws ? '畫線' : '抬筆移動'}到 ${pair(step.end)}`]);
    };
    showLine();
    function animate(now) {
      const { start, end, draws } = steps[stepIndex];
      started ??= now;
      const progress = Math.min(1, (now - started) / K.clamp(distance(start, end) * 230, 120, 1050));
      const target = point(start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress);
      drawArm(target);
      if (draws) $('gameInk').setAttribute('d', ink + linePath(start, target));
      if (progress === 1) {
        if (draws) ink += linePath(start, end);
        stepIndex++;
        if (stepIndex === steps.length) {
          finish(commands);
          return;
        }
        started = now;
        showLine();
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  }

  levelButtons.forEach((button, i) => button.addEventListener('click', () => loadLevel(i)));
  program.addEventListener('input', () => {
    drafts[levelIndex] = program.value;
    nextButton.hidden = true;
    $('gameBlocked').setAttribute('d', '');
    setMessage('ready', ['Ready to run.', '可以執行程式了。']);
  });
  runButton.addEventListener('click', run);
  $('gameReset').addEventListener('click', () => {
    drafts[levelIndex] = currentLevel().start;
    loadLevel(levelIndex);
  });
  nextButton.addEventListener('click', () => {
    loadLevel(levelIndex + 1);
    levelButtons[levelIndex].focus();
  });
  window.addEventListener('languagechange', translate);
  loadLevel(0);
});
