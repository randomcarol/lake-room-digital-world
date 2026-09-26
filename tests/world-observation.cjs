const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'world-model/room-observation.js');
const source = fs.readFileSync(adapterPath, 'utf8');
const scenario = JSON.parse(fs.readFileSync(path.join(root, 'world-model/scenario.json'), 'utf8'));
const RoomObservation = require(adapterPath);

function environment(mode = 'auto', season = 'summer', sample = {}) {
  return {
    state: {
      mode,
      season,
      sample: () => ({ hours: 8, night: 0, dusk: 0, ...sample }),
    },
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

const observedAt = new Date('2026-09-27T08:00:00.000Z');
const morning = RoomObservation.createSnapshot(environment(), { now: observedAt });
assert.deepEqual(Object.keys(morning).sort(), [
  'locations', 'mode', 'observedAt', 'schema', 'season', 'source', 'timeOfDay', 'version',
]);
assert.equal(morning.schema, 'lake-room-observation');
assert.equal(morning.version, 1);
assert.equal(morning.timeOfDay, 'morning');
assert.deepEqual(morning.locations, RoomObservation.PUBLIC_LOCATIONS);

assert.equal(RoomObservation.createSnapshot(environment('day', 'spring'), { now: observedAt }).timeOfDay, 'day');
assert.equal(RoomObservation.createSnapshot(environment('dusk', 'autumn'), { now: observedAt }).timeOfDay, 'dusk');
assert.equal(RoomObservation.createSnapshot(environment('night', 'winter'), { now: observedAt }).timeOfDay, 'night');
assert.equal(
  RoomObservation.createSnapshot(environment('auto', 'summer', { hours: 18, dusk: 0.9 }), { now: observedAt }).timeOfDay,
  'dusk',
);

const storage = memoryStorage();
let intervalCallback;
const publisher = RoomObservation.createPublisher(environment('dusk', 'autumn'), {
  storage,
  now: () => observedAt,
  setIntervalFn(callback) { intervalCallback = callback; return 7; },
  clearIntervalFn(id) { assert.equal(id, 7); },
});
publisher.start();
assert.equal(storage.values.size, 1, 'publisher may only write one namespaced observation key');
assert.ok(storage.values.has(RoomObservation.STORAGE_KEY));
assert.equal(typeof intervalCallback, 'function');
publisher.stop();

const fresh = RoomObservation.read(storage, { now: new Date('2026-09-27T08:04:59.000Z') });
assert.equal(fresh.status, 'fresh');
assert.equal(fresh.snapshot.season, 'autumn');
assert.equal(fresh.snapshot.timeOfDay, 'dusk');
assert.equal(RoomObservation.read(storage, { now: new Date('2026-09-27T08:05:01.000Z') }).status, 'stale');

const baseCopy = structuredClone(scenario);
const adapted = RoomObservation.applyToScenario(scenario, fresh.snapshot);
assert.equal(adapted.season, 'autumn');
assert.equal(adapted.timeOfDay, 'dusk');
assert.deepEqual(scenario, baseCopy, 'adapting must not mutate the checked-in scenario');

const extraField = { ...morning, camera: { x: 1 } };
assert.throws(() => RoomObservation.normalize(extraField), /fields/);
const privateLocation = { ...morning, locations: [...morning.locations, 'owner-studio'] };
assert.throws(() => RoomObservation.normalize(privateLocation), /locations/);

storage.setItem(RoomObservation.STORAGE_KEY, '{not-json');
assert.equal(RoomObservation.read(storage, { now: observedAt }).status, 'invalid');
assert.doesNotMatch(source, /fetch\s*\(|\/api\/world|XMLHttpRequest/);

console.log('PASS read-only room observation protocol, freshness and scenario adaptation');
