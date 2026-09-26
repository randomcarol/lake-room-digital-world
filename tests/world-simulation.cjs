const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const simulationPath = path.join(root, 'world-model/simulation.js');
const simulationSource = fs.readFileSync(simulationPath, 'utf8');
const scenario = JSON.parse(fs.readFileSync(path.join(root, 'world-model/scenario.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'world-model/schema.json'), 'utf8'));
const WorldSimulation = require(simulationPath);

assert.equal(WorldSimulation.VERSION, '1.0.0');
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties.actors.items.allOf[0].then.properties.speechMode.const, 'nonverbal');
assert.deepEqual(
  new Set(WorldSimulation.ACTIONS),
  new Set(['rest', 'explore', 'forage', 'socialize', 'observe']),
);
assert.doesNotMatch(simulationSource, /Math\.random|Date\.now|new Date/);

const first = WorldSimulation.create({ scenario, seed: 20260926 });
const second = WorldSimulation.create({ scenario, seed: 20260926 });
first.step(20);
second.step(20);
assert.deepEqual(first.getSnapshot(), second.getSnapshot(), 'same seed must reproduce state');
assert.deepEqual(first.getEvents(), second.getEvents(), 'same seed must reproduce events');

const different = WorldSimulation.create({ scenario, seed: 7 });
different.step(20);
assert.notDeepEqual(first.getEvents(), different.getEvents(), 'different seeds should change the run');

const events = first.getEvents();
assert.ok(events.length > 100, '20 ticks should create an inspectable event history');
assert.equal(new Set(events.map((event) => event.eventId)).size, events.length, 'event ids must be unique');
assert.ok(events.every((event, index) => !index || event.tick >= events[index - 1].tick));

const actors = new Map(scenario.actors.map((actor) => [actor.id, actor]));
for (const event of events.filter((event) => event.type === 'actor.spoke')) {
  assert.equal(actors.get(event.actorId).kind, 'person', 'animals must never emit human speech');
}
for (const event of events.filter((event) => event.type === 'actor.signaled')) {
  assert.equal(actors.get(event.actorId).kind, 'animal', 'nonverbal behavior belongs to animals');
}
assert.ok(events.some((event) => event.type === 'actor.spoke'));
assert.ok(events.some((event) => event.type === 'actor.signaled'));

for (const actor of first.getSnapshot().actors) {
  for (const value of Object.values(actor.needs)) assert.ok(value >= 0 && value <= 1);
}

const snapshot = first.getSnapshot();
snapshot.actors[0].needs.energy = -100;
assert.notEqual(first.getSnapshot().actors[0].needs.energy, -100, 'snapshots must be detached clones');
const eventCopy = first.getEvents();
eventCopy[0].payload.tampered = true;
assert.equal(first.getEvents()[0].payload.tampered, undefined, 'event reads must be detached clones');

assert.throws(() => first.step(0), /1 to 100/);
assert.throws(() => first.step(101), /1 to 100/);
assert.throws(() => first.step(1.5), /1 to 100/);

const invalidScenario = structuredClone(scenario);
invalidScenario.actors[1].speechMode = 'human';
assert.throws(
  () => WorldSimulation.create({ scenario: invalidScenario, seed: 1 }),
  /cannot use human speech/,
);

const invalidPolicy = WorldSimulation.create({
  scenario,
  seed: 3,
  policy: () => ({ action: 'teleport', reason: 'not allowed' }),
});
const invalidPolicyEvents = invalidPolicy.step();
assert.equal(
  invalidPolicyEvents.filter((event) => event.type === 'policy.rejected').length,
  scenario.actors.length,
  'one invalid proposal should create exactly one rejection per actor',
);
assert.equal(
  invalidPolicyEvents.filter((event) => event.type === 'actor.acted').length,
  scenario.actors.length,
  'rejected policies must safely fall back',
);

const throwingPolicy = WorldSimulation.create({
  scenario,
  seed: 3,
  policy: () => { throw new Error('untrusted policy failed'); },
});
const throwingEvents = throwingPolicy.step();
const rejections = throwingEvents.filter((event) => event.type === 'policy.rejected');
assert.equal(rejections.length, scenario.actors.length);
assert.ok(rejections.every((event) => event.payload.reason === 'policy-threw'));
assert.ok(rejections.every((event) => event.payload.message === 'untrusted policy failed'));

console.log(`PASS deterministic world simulation kernel (${events.length} events checked)`);
