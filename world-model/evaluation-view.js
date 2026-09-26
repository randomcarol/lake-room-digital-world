(function renderEvaluationReport() {
  'use strict';

  const actionLabels = { rest: '休息', explore: '探索', forage: '觅食', socialize: '交流', observe: '观察' };
  const locationLabels = { 'room-deck': '房间露台', 'garden-path': '花园小径', 'lake-shore': '安静湖岸', 'pine-edge': '松林边缘', 'village-pier': '小镇码头' };
  const eventLabels = { 'actor.acted': '行动', 'actor.spoke': '人物对白', 'actor.signaled': '动物信号', 'story.beat': '故事节点', 'policy.rejected': '策略拒绝' };
  const number = new Intl.NumberFormat('zh-CN');
  const elements = {
    status: document.querySelector('#report-status'),
    runs: document.querySelector('#runs'),
    decisions: document.querySelector('#decisions'),
    events: document.querySelector('#events'),
    cost: document.querySelector('#cost'),
    safety: document.querySelector('#safety-gates'),
    quality: document.querySelector('#quality-targets'),
    actions: document.querySelector('#action-bars'),
    locations: document.querySelector('#location-bars'),
    eventBars: document.querySelector('#event-bars'),
    finding: document.querySelector('#finding-copy'),
  };

  const percentage = (value) => `${(value * 100).toFixed(value === 1 ? 0 : 1)}%`;
  const metricValue = (item) => (
    item.id.includes('rate') || item.id === 'dialogue' || ['actions', 'locations', 'event-types'].includes(item.id)
      ? percentage(item.actual)
      : number.format(item.actual)
  );

  function scoreRow(item, kind) {
    const row = document.createElement('div');
    row.className = 'score';
    const label = document.createElement('strong');
    label.textContent = item.label;
    const detail = document.createElement('small');
    const limit = kind === 'safety' ? item.threshold : item.target;
    detail.textContent = `${item.operator === 'max' ? '上限' : '目标'} ${item.id.includes('rate') || item.id === 'dialogue' || ['actions', 'locations', 'event-types'].includes(item.id) ? percentage(limit) : limit}`;
    const result = document.createElement('span');
    const passed = kind === 'safety' ? item.passed : item.met;
    result.className = `score-result ${passed ? '' : kind === 'safety' ? 'fail' : 'miss'}`.trim();
    result.textContent = `${metricValue(item)} · ${passed ? '通过' : kind === 'safety' ? '失败' : '未达标'}`;
    row.append(label, detail, result);
    return row;
  }

  function renderBars(container, values, labels) {
    const maximum = Math.max(...Object.values(values), 1);
    for (const [key, value] of Object.entries(values)) {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const label = document.createElement('span');
      label.textContent = labels[key] || key;
      const track = document.createElement('span');
      track.className = 'bar-track';
      const fill = document.createElement('i');
      fill.style.width = `${value / maximum * 100}%`;
      track.append(fill);
      const count = document.createElement('b');
      count.textContent = number.format(value);
      row.append(label, track, count);
      container.append(row);
    }
  }

  async function start() {
    const response = await fetch('evaluation-baseline.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取离线评估报告');
    const report = await response.json();
    if (report.schema !== 'lake-room-evaluation' || report.version !== 1) throw new Error('评估报告版本不兼容');

    elements.status.textContent = report.status === 'pass'
      ? '安全门槛与质量目标全部通过'
      : report.status === 'pass-with-quality-gaps'
        ? '安全门槛通过 · 仍有质量缺口'
        : '安全门槛失败 · 禁止接入正式世界';
    elements.status.classList.toggle('warning', report.status === 'pass-with-quality-gaps');
    elements.status.classList.toggle('fail', report.status === 'fail');
    elements.runs.textContent = `${report.metrics.runs} × ${report.metrics.ticksPerRun} 步`;
    elements.decisions.textContent = number.format(report.metrics.actorDecisions);
    elements.events.textContent = number.format(report.metrics.totalEvents);
    elements.cost.textContent = `$${report.metrics.estimatedModelCostUsd.toFixed(2)}`;
    report.safetyGates.forEach((gate) => elements.safety.append(scoreRow(gate, 'safety')));
    report.qualityTargets.forEach((target) => elements.quality.append(scoreRow(target, 'quality')));
    renderBars(elements.actions, report.distributions.actions, actionLabels);
    renderBars(elements.locations, report.distributions.locations, locationLabels);
    renderBars(elements.eventBars, report.distributions.events, eventLabels);

    const dialogue = report.qualityTargets.find((target) => target.id === 'dialogue');
    elements.finding.textContent = dialogue && !dialogue.met
      ? `对白唯一率只有 ${percentage(dialogue.actual)}，低于 ${percentage(dialogue.target)} 的目标。下一轮应扩展人物表达结构并增加重复惩罚；动物继续只使用非语言信号。`
      : '当前安全边界和质量目标均已通过，可以进入受控模型策略对照实验。';
    window.__WORLD_EVALUATION__ = report;
  }

  start().catch((error) => {
    elements.status.textContent = `评估报告加载失败：${error.message}`;
    elements.status.classList.add('fail');
  });
})();
