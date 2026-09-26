(function attachWorldSimulation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorldSimulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildWorldSimulation() {
  'use strict';

  const VERSION = '1.0.0';
  const ACTIONS = new Set(['rest', 'explore', 'forage', 'socialize', 'observe']);
  const TIMES = ['morning', 'day', 'dusk', 'night'];
  const NEED_KEYS = ['energy', 'social', 'curiosity'];
  const TRAIT_KEYS = ['sociability', 'curiosity'];

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const cleanText = (value, maxLength = 120) => (
    typeof value === 'string' && value.trim() && value.length <= maxLength
      ? value.trim()
      : null
  );

  // Mulberry32 keeps each seeded run reproducible. Do not use ambient randomness here.
  function seededRandom(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function unitRecord(raw, keys, message) {
    const record = {};
    for (const key of keys) {
      const value = raw?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(message);
      }
      record[key] = value;
    }
    return record;
  }

  function validateScenario(input) {
    if (!input || input.schema !== 'lake-room-simulation' || input.version !== 1) {
      throw new Error('Unsupported simulation scenario');
    }
    if (!Array.isArray(input.locations) || !input.locations.length || input.locations.length > 32) {
      throw new Error('Scenario locations are invalid');
    }

    const locations = new Map();
    for (const raw of input.locations) {
      const id = cleanText(raw.id, 64);
      const label = cleanText(raw.label, 120);
      if (!id || !label || locations.has(id) || !Array.isArray(raw.neighbors)) {
        throw new Error('Scenario location is invalid');
      }
      if (!raw.neighbors.every((neighbor) => typeof neighbor === 'string')) {
        throw new Error('Scenario location neighbor is invalid');
      }
      locations.set(id, { id, label, neighbors: [...raw.neighbors] });
    }
    for (const location of locations.values()) {
      for (const neighbor of location.neighbors) {
        if (!locations.has(neighbor)) throw new Error('Scenario location neighbor is unknown');
      }
    }

    if (!Array.isArray(input.actors) || !input.actors.length || input.actors.length > 32) {
      throw new Error('Scenario actors are invalid');
    }
    const ids = new Set();
    const actors = [];
    for (const raw of input.actors) {
      const id = cleanText(raw.id, 64);
      const displayName = cleanText(raw.displayName, 80);
      const species = cleanText(raw.species, 80);
      if (
        !id || !displayName || !species || ids.has(id)
        || !['person', 'animal'].includes(raw.kind)
        || !locations.has(raw.locationId)
      ) {
        throw new Error('Scenario actor is invalid');
      }
      const speechMode = raw.speechMode || 'nonverbal';
      if (!['human', 'nonverbal'].includes(speechMode) || (raw.kind === 'animal' && speechMode === 'human')) {
        throw new Error('Animal actors cannot use human speech');
      }
      ids.add(id);
      actors.push({
        id,
        displayName,
        kind: raw.kind,
        species,
        speechMode,
        locationId: raw.locationId,
        needs: unitRecord(raw.needs, NEED_KEYS, 'Actor need is invalid'),
        traits: unitRecord(raw.traits, TRAIT_KEYS, 'Actor trait is invalid'),
        lastAction: 'observe',
      });
    }

    return {
      schema: input.schema,
      version: 1,
      season: ['spring', 'summer', 'autumn', 'winter'].includes(input.season)
        ? input.season
        : 'summer',
      timeOfDay: TIMES.includes(input.timeOfDay) ? input.timeOfDay : 'day',
      locations: [...locations.values()],
      actors,
    };
  }

  function create(options = {}) {
    const scenario = validateScenario(options.scenario);
    const random = seededRandom(options.seed);
    const locationMap = new Map(scenario.locations.map((location) => [location.id, location]));
    const state = {
      schema: 'lake-room-simulation-state',
      version: 1,
      tick: 0,
      season: scenario.season,
      timeOfDay: scenario.timeOfDay,
      actors: clone(scenario.actors),
    };
    const events = [];
    let sequence = 0;

    function emit(type, actorId, payload) {
      const event = {
        protocolVersion: 1,
        eventId: `event-${String(++sequence).padStart(6, '0')}`,
        type,
        tick: state.tick,
        worldTime: state.timeOfDay,
        actorId: actorId || null,
        payload: clone(payload),
      };
      events.push(event);
      return event;
    }

    function observation(actor) {
      const companions = state.actors
        .filter((other) => other.id !== actor.id && other.locationId === actor.locationId)
        .map((other) => ({
          id: other.id,
          displayName: other.displayName,
          kind: other.kind,
          species: other.species,
        }));
      return {
        tick: state.tick,
        season: state.season,
        timeOfDay: state.timeOfDay,
        location: clone(locationMap.get(actor.locationId)),
        actor: clone(actor),
        companions,
      };
    }

    function fallbackPolicy(view) {
      const actor = view.actor;
      if (actor.needs.energy < 0.32) return { action: 'rest', reason: 'low-energy' };
      if (actor.needs.social < 0.35 && view.companions.length) {
        return {
          action: 'socialize',
          targetId: view.companions[Math.floor(random() * view.companions.length)].id,
          reason: 'social-need',
        };
      }
      if (actor.needs.curiosity < 0.42 && view.location.neighbors.length) {
        return { action: 'explore', reason: 'curiosity-need' };
      }
      const choices = actor.kind === 'animal'
        ? ['forage', 'observe', 'explore', 'rest']
        : ['observe', 'explore', 'rest'];
      if (view.companions.length) choices.push('socialize');
      return {
        action: choices[Math.floor(random() * choices.length)],
        reason: 'seeded-routine',
      };
    }

    function validateProposal(proposal, view) {
      if (!proposal || typeof proposal !== 'object' || !ACTIONS.has(proposal.action)) return null;
      const clean = {
        action: proposal.action,
        reason: cleanText(proposal.reason, 120) || 'policy-choice',
      };
      if (clean.action === 'explore' && !view.location.neighbors.length) return null;
      if (clean.action === 'socialize') {
        const targets = new Set(view.companions.map((actor) => actor.id));
        if (!targets.size) return null;
        clean.targetId = targets.has(proposal.targetId)
          ? proposal.targetId
          : view.companions[0].id;
      }
      return clean;
    }

    function propose(actor) {
      const view = observation(actor);
      let proposal = null;
      if (typeof options.policy === 'function') {
        let rejection = null;
        try {
          proposal = validateProposal(options.policy(clone(view)), view);
          if (!proposal) rejection = { reason: 'invalid-proposal' };
        } catch (error) {
          rejection = {
            reason: 'policy-threw',
            message: String(error?.message || error).slice(0, 160),
          };
        }
        if (rejection) emit('policy.rejected', actor.id, rejection);
      }
      return proposal
        || validateProposal(fallbackPolicy(view), view)
        || { action: 'observe', reason: 'safe-fallback' };
    }

    function express(actor, action) {
      if (actor.speechMode !== 'human') {
        const signal = {
          rest: '安静地蜷卧下来',
          explore: '警觉地环顾四周',
          forage: '低头寻找食物',
          socialize: '向同伴轻轻示意',
          observe: '停下来倾听周围的声音',
        }[action];
        emit('actor.signaled', actor.id, { signal });
        return;
      }

      const place = locationMap.get(actor.locationId).label;
      const lines = {
        rest: [`我想在${place}慢下来休息一会儿。`],
        explore: [`不知道${place}附近今天有什么变化。`, `也许${place}附近又发生了一个小故事。`],
        forage: [`我正在${place}附近找一些有用的东西。`],
        socialize: [`能在${place}和大家分享这一刻真好。`],
        observe: [`今天${place}的光线有些不一样。`, `我想记住此刻${place}的样子。`],
      };
      if (random() < 0.56) {
        const choices = lines[action] || lines.observe;
        emit('actor.spoke', actor.id, {
          text: choices[Math.floor(random() * choices.length)],
          mode: 'template',
        });
      }
    }

    function apply(actor, proposal) {
      actor.needs.energy = clamp(actor.needs.energy - 0.035);
      actor.needs.social = clamp(actor.needs.social - 0.025);
      actor.needs.curiosity = clamp(actor.needs.curiosity - 0.03);
      const fromLocationId = actor.locationId;
      let interactionTarget = null;

      if (proposal.action === 'rest') actor.needs.energy = clamp(actor.needs.energy + 0.28);
      if (proposal.action === 'forage') actor.needs.energy = clamp(actor.needs.energy + 0.16);
      if (proposal.action === 'observe') {
        actor.needs.curiosity = clamp(actor.needs.curiosity + 0.18 + actor.traits.curiosity * 0.08);
      }
      if (proposal.action === 'explore') {
        const neighbors = locationMap.get(actor.locationId).neighbors;
        actor.locationId = neighbors[Math.floor(random() * neighbors.length)];
        actor.needs.curiosity = clamp(actor.needs.curiosity + 0.3);
        actor.needs.energy = clamp(actor.needs.energy - 0.04);
      }
      if (proposal.action === 'socialize') {
        interactionTarget = state.actors.find((candidate) => (
          candidate.id === proposal.targetId && candidate.locationId === actor.locationId
        ));
        if (interactionTarget) {
          actor.needs.social = clamp(actor.needs.social + 0.3 + actor.traits.sociability * 0.08);
          interactionTarget.needs.social = clamp(interactionTarget.needs.social + 0.12);
        }
      }

      actor.lastAction = proposal.action;
      emit('actor.acted', actor.id, {
        action: proposal.action,
        reason: proposal.reason,
        fromLocationId,
        toLocationId: actor.locationId,
        targetId: interactionTarget?.id || null,
        needs: clone(actor.needs),
      });
      express(actor, proposal.action);

      if (interactionTarget) {
        emit('story.beat', null, {
          kind: 'encounter',
          participants: [actor.id, interactionTarget.id],
          locationId: actor.locationId,
          summary: `${actor.displayName}在${locationMap.get(actor.locationId).label}和${interactionTarget.displayName}短暂相遇。`,
        });
      }
    }

    function step(count = 1) {
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        throw new Error('Step count must be an integer from 1 to 100');
      }
      const start = events.length;
      for (let iteration = 0; iteration < count; iteration += 1) {
        state.tick += 1;
        state.timeOfDay = TIMES[Math.floor((state.tick % 16) / 4)];
        for (const actor of state.actors) apply(actor, propose(actor));
      }
      return clone(events.slice(start));
    }

    return Object.freeze({
      version: VERSION,
      step,
      getSnapshot: () => clone(state),
      getEvents: (after = 0) => clone(events.slice(Math.max(0, after))),
      getEventCount: () => events.length,
    });
  }

  return Object.freeze({
    VERSION,
    ACTIONS: Object.freeze([...ACTIONS]),
    validateScenario,
    create,
  });
});
