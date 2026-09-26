(function attachWorldEvaluation(root, factory) {
  const simulation = typeof module === 'object' && module.exports
    ? require('./simulation.js')
    : root.WorldSimulation;
  const api = factory(simulation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorldEvaluation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildWorldEvaluation(WorldSimulation) {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULT_SEEDS = Object.freeze([7, 17, 29, 43, 71, 101, 211, 307, 509, 997]);
  const CORE_EVENT_TYPES = Object.freeze(['actor.acted', 'actor.spoke', 'actor.signaled', 'story.beat']);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const rounded = (value) => Math.round(value * 1e6) / 1e6;
  const ratio = (numerator, denominator, empty = 0) => (
    denominator ? rounded(numerator / denominator) : empty
  );

  function validateOptions(options) {
    if (!WorldSimulation || typeof WorldSimulation.create !== 'function') {
      throw new Error('WorldSimulation dependency is unavailable');
    }
    const ticks = options.ticks ?? 64;
    const seeds = options.seeds ?? DEFAULT_SEEDS;
    if (!Number.isInteger(ticks) || ticks < 1 || ticks > 100) {
      throw new Error('Evaluation ticks must be an integer from 1 to 100');
    }
    if (
      !Array.isArray(seeds)
      || !seeds.length
      || seeds.length > 100
      || new Set(seeds).size !== seeds.length
      || seeds.some((seed) => !Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff)
    ) {
      throw new Error('Evaluation seeds must be 1 to 100 unique positive uint32 integers');
    }
    const policyCostUsd = options.policyCostUsd ?? 0;
    if (!Number.isFinite(policyCostUsd) || policyCostUsd < 0) {
      throw new Error('Policy cost must be a non-negative number');
    }
    return { ticks, seeds: [...seeds], policyCostUsd };
  }

  function evaluate(options = {}) {
    const configuration = validateOptions(options);
    const scenario = WorldSimulation.validateScenario(options.scenario);
    const actorById = new Map(scenario.actors.map((actor) => [actor.id, actor]));
    const locationIds = new Set(scenario.locations.map((location) => location.id));
    const allowedActions = new Set(WorldSimulation.ACTIONS);
    const actionCounts = Object.fromEntries(WorldSimulation.ACTIONS.map((action) => [action, 0]));
    const eventCounts = {
      'actor.acted': 0,
      'actor.spoke': 0,
      'actor.signaled': 0,
      'story.beat': 0,
      'policy.rejected': 0,
    };
    const locationVisits = Object.fromEntries(scenario.locations.map((location) => [location.id, 0]));
    const perActor = Object.fromEntries(scenario.actors.map((actor) => [actor.id, {
      actions: 0,
      spoken: 0,
      signaled: 0,
    }]));
    const dialogue = [];
    let policyInvocations = 0;
    let replayMismatchCount = 0;
    let semanticViolationCount = 0;
    let needBoundaryViolationCount = 0;
    let animalSpeechViolationCount = 0;
    let characterViolationCount = 0;
    let unknownEventTypeCount = 0;
    let totalEvents = 0;

    function policyFor(seed, countCalls) {
      if (typeof options.policyFactory !== 'function') return undefined;
      const policy = options.policyFactory(seed);
      if (typeof policy !== 'function') throw new Error('Policy factory must return a function');
      return (observation) => {
        if (countCalls) policyInvocations += 1;
        return policy(observation);
      };
    }

    function run(seed, countCalls) {
      const engine = WorldSimulation.create({
        scenario,
        seed,
        policy: policyFor(seed, countCalls),
      });
      engine.step(configuration.ticks);
      return { snapshot: engine.getSnapshot(), events: engine.getEvents() };
    }

    function inspect(seed, result) {
      const { snapshot, events } = result;
      totalEvents += events.length;
      for (const actor of snapshot.actors) {
        if (!actorById.has(actor.id) || !locationIds.has(actor.locationId)) semanticViolationCount += 1;
        for (const value of Object.values(actor.needs)) {
          if (!Number.isFinite(value) || value < 0 || value > 1) needBoundaryViolationCount += 1;
        }
      }

      for (const event of events) {
        if (!(event.type in eventCounts)) {
          unknownEventTypeCount += 1;
          continue;
        }
        eventCounts[event.type] += 1;
        const actor = actorById.get(event.actorId);
        if (event.type !== 'story.beat' && !actor) semanticViolationCount += 1;

        if (event.type === 'actor.acted') {
          const { action, fromLocationId, toLocationId, needs } = event.payload;
          if (!allowedActions.has(action) || !locationIds.has(fromLocationId) || !locationIds.has(toLocationId)) {
            semanticViolationCount += 1;
          } else {
            actionCounts[action] += 1;
            locationVisits[toLocationId] += 1;
          }
          for (const value of Object.values(needs || {})) {
            if (!Number.isFinite(value) || value < 0 || value > 1) needBoundaryViolationCount += 1;
          }
          if (perActor[event.actorId]) perActor[event.actorId].actions += 1;
        }

        if (event.type === 'actor.spoke') {
          if (actor?.kind !== 'person') {
            animalSpeechViolationCount += 1;
            characterViolationCount += 1;
            semanticViolationCount += 1;
          }
          if (typeof event.payload.text !== 'string' || !event.payload.text.trim()) semanticViolationCount += 1;
          else dialogue.push(event.payload.text.trim());
          if (perActor[event.actorId]) perActor[event.actorId].spoken += 1;
        }

        if (event.type === 'actor.signaled') {
          if (actor?.kind !== 'animal') {
            characterViolationCount += 1;
            semanticViolationCount += 1;
          }
          if (perActor[event.actorId]) perActor[event.actorId].signaled += 1;
        }

        if (event.type === 'story.beat') {
          const participants = event.payload.participants;
          if (
            !Array.isArray(participants)
            || participants.some((id) => !actorById.has(id))
            || !locationIds.has(event.payload.locationId)
          ) semanticViolationCount += 1;
        }

        if (!Number.isInteger(event.tick) || event.tick < 1 || event.tick > configuration.ticks) {
          semanticViolationCount += 1;
        }
      }

    }

    for (const seed of configuration.seeds) {
      const primary = run(seed, true);
      const replay = run(seed, false);
      if (JSON.stringify(primary) !== JSON.stringify(replay)) replayMismatchCount += 1;
      inspect(seed, primary);
    }

    const actionTotal = eventCounts['actor.acted'];
    const dialogueUnique = new Set(dialogue).size;
    const observedCoreEventTypes = CORE_EVENT_TYPES.filter((type) => eventCounts[type] > 0).length;
    const metrics = {
      runs: configuration.seeds.length,
      ticksPerRun: configuration.ticks,
      actorDecisions: actionTotal,
      totalEvents,
      replayMismatchCount,
      semanticViolationCount,
      needBoundaryViolationCount,
      animalSpeechViolationCount,
      characterViolationCount,
      unknownEventTypeCount,
      policyInvocations,
      policyRejectionRate: ratio(eventCounts['policy.rejected'], policyInvocations),
      actionCoverage: ratio(Object.values(actionCounts).filter(Boolean).length, WorldSimulation.ACTIONS.length),
      locationCoverage: ratio(Object.values(locationVisits).filter(Boolean).length, scenario.locations.length),
      coreEventTypeCoverage: ratio(observedCoreEventTypes, CORE_EVENT_TYPES.length),
      characterConsistency: ratio(
        eventCounts['actor.spoke'] + eventCounts['actor.signaled'] - characterViolationCount,
        eventCounts['actor.spoke'] + eventCounts['actor.signaled'],
        1,
      ),
      dialogueCount: dialogue.length,
      dialogueUniqueCount: dialogueUnique,
      dialogueUniqueness: ratio(dialogueUnique, dialogue.length, 1),
      encounterRate: ratio(eventCounts['story.beat'], actionTotal),
      estimatedModelCostUsd: rounded(policyInvocations * configuration.policyCostUsd),
    };

    const safetyGates = [
      { id: 'replay', label: '不可重放运行', actual: metrics.replayMismatchCount, operator: 'max', threshold: 0 },
      { id: 'semantic', label: '事件语义违规', actual: metrics.semanticViolationCount, operator: 'max', threshold: 0 },
      { id: 'needs', label: '状态越界', actual: metrics.needBoundaryViolationCount, operator: 'max', threshold: 0 },
      { id: 'animal-speech', label: '动物人类对白', actual: metrics.animalSpeechViolationCount, operator: 'max', threshold: 0 },
      { id: 'character', label: '角色表达边界违规', actual: metrics.characterViolationCount, operator: 'max', threshold: 0 },
      { id: 'unknown-events', label: '未知事件类型', actual: metrics.unknownEventTypeCount, operator: 'max', threshold: 0 },
      { id: 'policy-rejection', label: '策略拒绝率', actual: metrics.policyRejectionRate, operator: 'max', threshold: 0 },
    ].map((gate) => ({ ...gate, passed: gate.actual <= gate.threshold }));

    const qualityTargets = [
      { id: 'actions', label: '动作覆盖率', actual: metrics.actionCoverage, operator: 'min', target: 1 },
      { id: 'locations', label: '地点覆盖率', actual: metrics.locationCoverage, operator: 'min', target: 1 },
      { id: 'event-types', label: '核心事件类型覆盖率', actual: metrics.coreEventTypeCoverage, operator: 'min', target: 1 },
      { id: 'dialogue', label: '对白唯一率', actual: metrics.dialogueUniqueness, operator: 'min', target: 0.25 },
    ].map((target) => ({ ...target, met: target.actual >= target.target }));

    const safetyPassed = safetyGates.every((gate) => gate.passed);
    const qualityPassed = qualityTargets.every((target) => target.met);
    return {
      schema: 'lake-room-evaluation',
      version: 1,
      evaluatorVersion: VERSION,
      simulationVersion: WorldSimulation.VERSION,
      status: safetyPassed ? (qualityPassed ? 'pass' : 'pass-with-quality-gaps') : 'fail',
      configuration: {
        seeds: configuration.seeds,
        ticksPerRun: configuration.ticks,
        actorsPerRun: scenario.actors.length,
        policy: typeof options.policyFactory === 'function' ? 'external' : 'deterministic-fallback',
        policyCostUsd: configuration.policyCostUsd,
      },
      metrics,
      safetyGates,
      qualityTargets,
      distributions: {
        actions: actionCounts,
        events: eventCounts,
        locations: locationVisits,
        actors: perActor,
      },
    };
  }

  return Object.freeze({ VERSION, DEFAULT_SEEDS, CORE_EVENT_TYPES, evaluate });
});
