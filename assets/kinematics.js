(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Kinematics = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const EPSILON = 1e-9;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const toRadians = degrees => degrees * Math.PI / 180;
  const toDegrees = radians => radians * 180 / Math.PI;

  function forward(theta1, theta2, l1, l2) {
    const elbow = { x: l1 * Math.cos(theta1), y: l1 * Math.sin(theta1) };
    return {
      elbow,
      end: {
        x: elbow.x + l2 * Math.cos(theta1 + theta2),
        y: elbow.y + l2 * Math.sin(theta1 + theta2)
      }
    };
  }

  function reachability(x, y, l1, l2) {
    const r = Math.hypot(x, y);
    const inner = Math.abs(l1 - l2);
    const outer = l1 + l2;
    if (r > outer + EPSILON || r < inner - EPSILON) return { reachable: false, count: 0, r, inner, outer };
    if (r <= EPSILON && inner <= EPSILON) return { reachable: true, count: Infinity, r, inner, outer };
    const tangent = Math.abs(r - outer) <= EPSILON || Math.abs(r - inner) <= EPSILON || r <= EPSILON;
    return { reachable: true, count: tangent ? 1 : 2, r, inner, outer };
  }

  function inverse(x, y, l1, l2) {
    const reach = reachability(x, y, l1, l2);
    const rawC2 = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    if (!reach.reachable) return { ...reach, c2: rawC2, solutions: [] };
    const c2 = clamp(rawC2, -1, 1);
    const magnitude = Math.acos(c2);
    // At the origin with equal links there are infinitely many folded poses.
    // Return two representative poses so the renderer still has useful output.
    if (reach.count === Infinity) {
      const solutions = [0, Math.PI / 2].map(theta1 => ({ theta1, theta2: Math.PI, ...forward(theta1, Math.PI, l1, l2) }));
      return { ...reach, c2, solutions };
    }
    const signs = reach.count === 1 ? [1] : [1, -1];
    const solutions = signs.map(sign => {
      const theta2 = sign * magnitude;
      const theta1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(theta2), l1 + l2 * Math.cos(theta2));
      return { theta1, theta2, ...forward(theta1, theta2, l1, l2) };
    });
    return { ...reach, c2, solutions };
  }

  return { clamp, toRadians, toDegrees, forward, inverse, reachability };
});
