(function runWorldLab() {
  'use strict';

  const positions = {
    'room-deck': [24, 24],
    'garden-path': [48, 19],
    'pine-edge': [75, 30],
    'lake-shore': [30, 72],
    'village-pier': [73, 73],
  };
  const placeIcons = {
    'room-deck': '⌂',
    'garden-path': '✿',
    'pine-edge': '♠',
    'lake-shore': '≈',
    'village-pier': '⚑',
  };
  const actorIcons = { human: '人', rabbit: '兔', fox: '狐' };
  const actionLabels = {
    rest: '休息', explore: '探索', forage: '觅食', socialize: '交流', observe: '观察',
  };
  const timeLabels = { morning: '早晨', day: '白天', dusk: '黄昏', night: '夜晚' };
  const seasonLabels = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  const eventLabels = {
    'actor.acted': '行动',
    'actor.spoke': '语言',
    'actor.signaled': '行为信号',
    'story.beat': '故事节点',
    'policy.rejected': '策略拒绝',
  };

  const elements = {
    seed: document.querySelector('#seed'),
    reset: document.querySelector('#reset'),
    stepOne: document.querySelector('#step-one'),
    stepTen: document.querySelector('#step-ten'),
    tick: document.querySelector('#tick'),
    worldTime: document.querySelector('#world-time'),
    eventCount: document.querySelector('#event-count'),
    worldMap: document.querySelector('#world-map'),
    actorGrid: document.querySelector('#actor-grid'),
    eventList: document.querySelector('#event-list'),
    observationStatus: document.querySelector('#observation-status'),
    refreshObservation: document.querySelector('#refresh-observation'),
  };

  let baseScenario;
  let scenario;
  let engine;
  let observationResult = { status: 'missing', snapshot: null };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function seedValue() {
    const parsed = Number.parseInt(elements.seed.value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 20260926;
  }

  function pathMarkup(from, to) {
    const [x1, y1] = positions[from];
    const [x2, y2] = positions[to];
    const width = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<i class="map-path" style="left:${x1}%;top:${y1}%;width:${width}%;transform:rotate(${angle}deg)"></i>`;
  }

  function renderMap(snapshot) {
    const seen = new Set();
    const paths = scenario.locations.flatMap((location) => location.neighbors.map((neighbor) => {
      const key = [location.id, neighbor].sort().join(':');
      if (seen.has(key)) return '';
      seen.add(key);
      return pathMarkup(location.id, neighbor);
    })).join('');
    const places = scenario.locations.map((location) => {
      const [left, top] = positions[location.id];
      const present = snapshot.actors.filter((actor) => actor.locationId === location.id);
      const tokens = present.map((actor) => (
        `<span class="actor-token ${actor.kind === 'animal' ? 'animal' : ''}" title="${escapeHtml(actor.displayName)}">${actorIcons[actor.species] || '·'}</span>`
      )).join('');
      return `<div class="place" style="left:${left}%;top:${top}%">
        <span class="place-dot">${placeIcons[location.id] || '•'}</span>
        <span class="place-label">${escapeHtml(location.label)}</span>
        <span class="tokens">${tokens}</span>
      </div>`;
    }).join('');
    elements.worldMap.innerHTML = paths + places;
  }

  function need(label, value) {
    const percentage = Math.round(value * 100);
    return `<div class="need"><span>${label}</span><span class="bar"><i style="width:${percentage}%"></i></span><b>${percentage}</b></div>`;
  }

  function renderActors(snapshot) {
    const locations = new Map(scenario.locations.map((location) => [location.id, location.label]));
    elements.actorGrid.innerHTML = snapshot.actors.map((actor) => `<article class="actor-card" data-actor-id="${actor.id}">
      <div class="actor-head">
        <span class="actor-avatar">${actorIcons[actor.species] || '·'}</span>
        <div><h3>${escapeHtml(actor.displayName)}</h3><p>${escapeHtml(locations.get(actor.locationId))}</p></div>
        <span class="actor-action">${actionLabels[actor.lastAction]}</span>
      </div>
      <div class="needs">
        ${need('精力', actor.needs.energy)}
        ${need('社交', actor.needs.social)}
        ${need('好奇', actor.needs.curiosity)}
      </div>
    </article>`).join('');
  }

  function eventCopy(event, actorNames) {
    const actor = actorNames.get(event.actorId) || '世界';
    if (event.type === 'actor.acted') {
      const move = event.payload.fromLocationId !== event.payload.toLocationId ? '并移动到了新地点' : '';
      return `${actor}选择了“${actionLabels[event.payload.action]}”${move}。`;
    }
    if (event.type === 'actor.spoke') return `${actor}说：“${event.payload.text}”`;
    if (event.type === 'actor.signaled') return `${actor}${event.payload.signal}。`;
    if (event.type === 'story.beat') return event.payload.summary;
    if (event.type === 'policy.rejected') return `${actor}的外部策略提议被拒绝，系统使用安全规则继续。`;
    return `${actor}产生了一个新事件。`;
  }

  function renderEvents(events) {
    if (!events.length) {
      elements.eventList.innerHTML = '<li class="empty-state">推进世界后，第一批事件会出现在这里。</li>';
      return;
    }
    const actorNames = new Map(scenario.actors.map((actor) => [actor.id, actor.displayName]));
    elements.eventList.innerHTML = events.slice(-80).reverse().map((event) => `<li class="event" data-event-type="${event.type}">
      <span class="event-time">第 ${event.tick} 步 · ${timeLabels[event.worldTime]}</span>
      <span class="event-type ${event.type === 'story.beat' ? 'story' : ''}">${eventLabels[event.type] || event.type}</span>
      <p class="event-copy">${escapeHtml(eventCopy(event, actorNames))}</p>
    </li>`).join('');
  }

  function render() {
    const snapshot = engine.getSnapshot();
    elements.tick.textContent = snapshot.tick;
    elements.worldTime.textContent = timeLabels[snapshot.timeOfDay];
    elements.eventCount.textContent = engine.getEventCount();
    renderMap(snapshot);
    renderActors(snapshot);
    renderEvents(engine.getEvents());
  }

  function reset() {
    elements.seed.value = seedValue();
    engine = window.WorldSimulation.create({ scenario, seed: seedValue() });
    render();
  }

  function readObservation() {
    try {
      return window.RoomObservation.read();
    } catch {
      return { status: 'unavailable', snapshot: null };
    }
  }

  function renderObservation(result, changed = false) {
    const labels = {
      missing: '未发现房间快照 · 使用实验场景',
      stale: '房间快照已过期 · 使用实验场景',
      invalid: '房间快照格式异常 · 使用实验场景',
      unavailable: '浏览器存储不可用 · 使用实验场景',
    };
    elements.observationStatus.dataset.status = result.status;
    if (result.status === 'fresh') {
      const snapshot = result.snapshot;
      elements.observationStatus.textContent = changed
        ? 'Lake Room 有新状态 · 点击重新读取'
        : `已读取 Lake Room · ${seasonLabels[snapshot.season]} · ${timeLabels[snapshot.timeOfDay]}`;
      return;
    }
    elements.observationStatus.textContent = labels[result.status] || labels.invalid;
  }

  function applyObservation() {
    observationResult = readObservation();
    scenario = observationResult.status === 'fresh'
      ? window.RoomObservation.applyToScenario(baseScenario, observationResult.snapshot)
      : structuredClone(baseScenario);
    renderObservation(observationResult);
  }

  function reloadObservation() {
    applyObservation();
    reset();
  }

  function advance(count) {
    engine.step(count);
    render();
  }

  async function start() {
    const response = await fetch('scenario.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取世界场景');
    baseScenario = await response.json();
    applyObservation();
    elements.reset.addEventListener('click', reset);
    elements.stepOne.addEventListener('click', () => advance(1));
    elements.stepTen.addEventListener('click', () => advance(10));
    elements.refreshObservation.addEventListener('click', reloadObservation);
    window.addEventListener('storage', (event) => {
      if (event.key !== window.RoomObservation.STORAGE_KEY) return;
      const latest = readObservation();
      renderObservation(latest, latest.status === 'fresh');
    });
    reset();
    window.__WORLD_LAB__ = {
      reset,
      advance,
      snapshot: () => engine.getSnapshot(),
      events: () => engine.getEvents(),
      observation: () => structuredClone(observationResult),
      reloadObservation,
    };
  }

  start().catch((error) => {
    document.querySelector('[data-testid="lab-status"]').textContent = `实验室启动失败：${error.message}`;
  });
})();
