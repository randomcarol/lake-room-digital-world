(function attachRoomObservation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RoomObservation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildRoomObservation() {
  'use strict';

  const SCHEMA = 'lake-room-observation';
  const VERSION = 1;
  const STORAGE_KEY = 'lake-room:world-observation:v1';
  const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
  const FUTURE_SKEW_MS = 30 * 1000;
  const SEASONS = new Set(['spring', 'summer', 'autumn', 'winter']);
  const MODES = new Set(['auto', 'day', 'dusk', 'night']);
  const TIMES = new Set(['morning', 'day', 'dusk', 'night']);
  const PUBLIC_LOCATIONS = Object.freeze([
    'room-deck',
    'garden-path',
    'pine-edge',
    'lake-shore',
    'village-pier',
  ]);
  const SNAPSHOT_KEYS = Object.freeze([
    'schema', 'version', 'source', 'observedAt', 'season', 'timeOfDay', 'mode', 'locations',
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const defaultStorage = () => {
    try {
      return globalThis.localStorage;
    } catch {
      return null;
    }
  };
  const nowMs = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const milliseconds = date.getTime();
    if (!Number.isFinite(milliseconds)) throw new Error('Observation time is invalid');
    return milliseconds;
  };

  function timeOfDay(environment, date) {
    const mode = environment?.state?.mode;
    if (mode === 'day' || mode === 'dusk' || mode === 'night') return mode;
    const sample = environment?.state?.sample?.(date);
    if (!sample || !Number.isFinite(sample.hours)) throw new Error('Environment sample is unavailable');
    if (sample.night > 0.5) return 'night';
    if (sample.dusk > 0.35) return 'dusk';
    if (sample.hours >= 5 && sample.hours < 10) return 'morning';
    return 'day';
  }

  function createSnapshot(environment, options = {}) {
    const date = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
    const season = environment?.state?.season;
    const mode = environment?.state?.mode;
    if (!SEASONS.has(season) || !MODES.has(mode)) throw new Error('Environment state is unavailable');
    return {
      schema: SCHEMA,
      version: VERSION,
      source: 'lake-room-client',
      observedAt: date.toISOString(),
      season,
      timeOfDay: timeOfDay(environment, date),
      mode,
      locations: [...PUBLIC_LOCATIONS],
    };
  }

  function normalize(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Observation must be an object');
    }
    const keys = Object.keys(input).sort();
    if (keys.length !== SNAPSHOT_KEYS.length || keys.some((key, index) => key !== [...SNAPSHOT_KEYS].sort()[index])) {
      throw new Error('Observation fields are invalid');
    }
    if (input.schema !== SCHEMA || input.version !== VERSION || input.source !== 'lake-room-client') {
      throw new Error('Observation protocol is unsupported');
    }
    if (!SEASONS.has(input.season) || !TIMES.has(input.timeOfDay) || !MODES.has(input.mode)) {
      throw new Error('Observation world state is invalid');
    }
    nowMs(input.observedAt);
    if (
      !Array.isArray(input.locations)
      || input.locations.length !== PUBLIC_LOCATIONS.length
      || input.locations.some((location, index) => location !== PUBLIC_LOCATIONS[index])
    ) {
      throw new Error('Observation locations are invalid');
    }
    return clone(input);
  }

  function read(storage, options = {}) {
    if (storage === undefined) storage = defaultStorage();
    if (!storage || typeof storage.getItem !== 'function') return { status: 'unavailable', snapshot: null };
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return { status: 'unavailable', snapshot: null };
    }
    if (!raw) return { status: 'missing', snapshot: null };
    try {
      const snapshot = normalize(JSON.parse(raw));
      const observedAt = nowMs(snapshot.observedAt);
      const current = nowMs(options.now ?? Date.now());
      const maxAgeMs = Number.isFinite(options.maxAgeMs) ? options.maxAgeMs : DEFAULT_MAX_AGE_MS;
      if (observedAt - current > FUTURE_SKEW_MS || current - observedAt > maxAgeMs) {
        return { status: 'stale', snapshot: null };
      }
      return { status: 'fresh', snapshot };
    } catch {
      return { status: 'invalid', snapshot: null };
    }
  }

  function applyToScenario(baseScenario, snapshot) {
    const next = clone(baseScenario);
    const safe = normalize(snapshot);
    next.season = safe.season;
    next.timeOfDay = safe.timeOfDay;
    return next;
  }

  function createPublisher(environment, options = {}) {
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 30 * 1000;
    const currentTime = typeof options.now === 'function' ? options.now : () => new Date();
    const startTimer = options.setIntervalFn || setInterval;
    const stopTimer = options.clearIntervalFn || clearInterval;
    let timer = null;

    function publish() {
      try {
        const snapshot = createSnapshot(environment, { now: currentTime() });
        storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        return { ok: true, snapshot };
      } catch {
        return { ok: false, snapshot: null };
      }
    }

    function start() {
      publish();
      if (timer === null) timer = startTimer(publish, intervalMs);
    }

    function stop() {
      if (timer !== null) stopTimer(timer);
      timer = null;
    }

    return { publish, start, stop };
  }

  return {
    SCHEMA,
    VERSION,
    STORAGE_KEY,
    DEFAULT_MAX_AGE_MS,
    PUBLIC_LOCATIONS,
    createSnapshot,
    normalize,
    read,
    applyToScenario,
    createPublisher,
  };
});
