const assert = require('node:assert/strict');
const K = require('../assets/kinematics.js');

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);
}

const l1 = 2.7, l2 = 2.0;
const ik = K.inverse(3.2, 1.6, l1, l2);
assert.equal(ik.reachable, true);
assert.equal(ik.count, 2);
assert.equal(ik.solutions.length, 2);
for (const solution of ik.solutions) {
  close(solution.end.x, 3.2);
  close(solution.end.y, 1.6);
}
close(ik.solutions[0].theta2, -ik.solutions[1].theta2);

assert.equal(K.inverse(6, 0, l1, l2).count, 0);
assert.equal(K.inverse(0.1, 0, l1, l2).count, 0);
assert.equal(K.inverse(l1 + l2, 0, l1, l2).count, 1);
assert.equal(K.inverse(Math.abs(l1 - l2), 0, l1, l2).count, 1);
assert.equal(K.inverse(0, 0, 2, 2).count, Infinity);

// A target on an oblique outer boundary can produce a cosine just below 1
// after floating-point arithmetic. The unique pose must still be straight.
const ray = 0.73;
const outer = l1 + l2;
const straight = K.inverse(outer * Math.cos(ray), outer * Math.sin(ray), l1, l2);
assert.equal(straight.count, 1);
assert.equal(straight.solutions[0].theta2, 0);
close(straight.solutions[0].theta1, ray);

// If link 2 is longer, the first link points away from an inner-edge target.
const folded = K.inverse(l1 - l2, 0, l2, l1);
assert.equal(folded.count, 1);
assert.equal(folded.solutions[0].theta2, Math.PI);
close(folded.solutions[0].end.x, l1 - l2);
assert.ok(folded.solutions[0].elbow.x < 0);

const fk = K.forward(K.toRadians(30), K.toRadians(60), 2, 1);
close(fk.end.x, Math.sqrt(3));
close(fk.end.y, 2);
console.log('All kinematics tests passed.');
