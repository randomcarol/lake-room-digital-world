const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scenario = JSON.parse(fs.readFileSync(path.join(root, 'world-model/scenario.json'), 'utf8'));
const checkedIn = JSON.parse(fs.readFileSync(path.join(root, 'world-model/evaluation-baseline.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'world-model/evaluation-schema.json'), 'utf8'));
const WorldEvaluation = require(path.join(root, 'world-model/evaluation.js'));

const first = WorldEvaluation.evaluate({ scenario });
const second = WorldEvaluation.evaluate({ scenario });
assert.deepEqual(first, second, 'evaluation reports must be reproducible');
assert.deepEqual(first, checkedIn, 'checked-in baseline must match the current evaluator and scenario');
assert.equal(first.schema, 'lake-room-evaluation');
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties.schema.const, first.schema);
assert.equal(schema.properties.version.const, first.version);
assert.equal(first.status, 'pass-with-quality-gaps');
assert.ok(first.safetyGates.every((gate) => gate.passed), 'all non-negotiable safety gates must pass');
assert.equal(first.metrics.actorDecisions, 10 * 64 * scenario.actors.length);
assert.equal(first.metrics.replayMismatchCount, 0);
assert.equal(first.metrics.animalSpeechViolationCount, 0);
assert.equal(first.metrics.characterConsistency, 1);
assert.equal(first.metrics.needBoundaryViolationCount, 0);
assert.equal(first.metrics.policyInvocations, 0);
assert.equal(first.metrics.estimatedModelCostUsd, 0);
assert.equal(first.metrics.actionCoverage, 1);
assert.equal(first.metrics.locationCoverage, 1);
assert.equal(first.metrics.coreEventTypeCoverage, 1);
assert.ok(first.metrics.dialogueUniqueness < 0.25, 'the baseline should expose limited dialogue variety honestly');

const rejected = WorldEvaluation.evaluate({
  scenario,
  seeds: [7],
  ticks: 4,
  policyCostUsd: 0.002,
  policyFactory: () => () => ({ action: 'teleport' }),
});
assert.equal(rejected.metrics.policyInvocations, 4 * scenario.actors.length);
assert.equal(rejected.metrics.policyRejectionRate, 1);
assert.equal(rejected.metrics.estimatedModelCostUsd, 0.024);
assert.equal(rejected.status, 'fail');
assert.equal(rejected.safetyGates.find((gate) => gate.id === 'policy-rejection').passed, false);

assert.throws(() => WorldEvaluation.evaluate({ scenario, seeds: [1, 1] }), /unique/);
assert.throws(() => WorldEvaluation.evaluate({ scenario, ticks: 101 }), /1 to 100/);
assert.throws(
  () => WorldEvaluation.evaluate({ scenario, seeds: [1], policyFactory: () => null }),
  /must return a function/,
);

console.log(`PASS offline world evaluation baseline (${first.metrics.totalEvents} events measured)`);
