const fs = require('node:fs');
const path = require('node:path');
const WorldEvaluation = require('./evaluation.js');

const directory = __dirname;
const scenario = JSON.parse(fs.readFileSync(path.join(directory, 'scenario.json'), 'utf8'));
const report = WorldEvaluation.evaluate({ scenario });
const target = path.join(directory, 'evaluation-baseline.json');

fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(`WROTE ${path.relative(process.cwd(), target)} (${report.metrics.totalEvents} events)`);
