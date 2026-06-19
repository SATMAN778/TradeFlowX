const fs = require('fs');
const crypto = require('crypto');

let data = JSON.parse(fs.readFileSync('caseplan.json'));
let idMap = JSON.parse(fs.readFileSync('../id-map.json'));

const genId = (prefix) => prefix + crypto.randomBytes(3).toString('hex');

// Initialize entry/exit arrays
data.nodes.forEach(node => {
  if (node.type === 'case-management:Stage') {
    node.data.entryConditions = [];
    node.data.exitConditions = [];
  }
});
if (!data.metadata.caseExitRules) {
  data.metadata.caseExitRules = [];
}

let stageMap = {};
data.nodes.forEach(n => { if (n.type.includes('Stage')) stageMap[n.data.label] = n.id; });

// T28: Intake Entry
data.nodes.find(n => n.id === stageMap['Intake']).data.entryConditions.push({
  id: genId('Condition_'), displayName: "Entry Rule 1", isInterrupting: false,
  rules: [[{ id: genId('Rule_'), rule: "case-entered" }]]
});

// T29: Intake Exit
data.nodes.find(n => n.id === stageMap['Intake']).data.exitConditions.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", type: "exit-only", marksStageComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-tasks-completed" }]]
});

// T30: Compliance Entry
data.nodes.find(n => n.id === stageMap['Compliance']).data.entryConditions.push({
  id: genId('Condition_'), displayName: "Entry Rule 1", isInterrupting: false,
  rules: [[{ id: genId('Rule_'), rule: "selected-stage-completed", selectedStageId: stageMap['Intake'] }]]
});

// T31: Compliance Exit
data.nodes.find(n => n.id === stageMap['Compliance']).data.exitConditions.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", type: "exit-only", marksStageComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-tasks-completed" }]]
});

// T32: Classification Entry
data.nodes.find(n => n.id === stageMap['Classification']).data.entryConditions.push({
  id: genId('Condition_'), displayName: "Entry Rule 1", isInterrupting: false,
  rules: [[{ id: genId('Rule_'), rule: "selected-stage-completed", selectedStageId: stageMap['Compliance'] }]]
});

// T33: Classification Exit
data.nodes.find(n => n.id === stageMap['Classification']).data.exitConditions.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", type: "exit-only", marksStageComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-tasks-completed" }]]
});

// T34: Clearance Entry
data.nodes.find(n => n.id === stageMap['Clearance']).data.entryConditions.push({
  id: genId('Condition_'), displayName: "Entry Rule 1", isInterrupting: false,
  rules: [[{ id: genId('Rule_'), rule: "selected-stage-completed", selectedStageId: stageMap['Classification'] }]]
});

// Add missing Clearance Exit to connect the graph
data.nodes.find(n => n.id === stageMap['Clearance']).data.exitConditions.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", type: "exit-only", marksStageComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-tasks-completed" }]]
});

// Add missing Settlement Entry
data.nodes.find(n => n.id === stageMap['Settlement']).data.entryConditions.push({
  id: genId('Condition_'), displayName: "Entry Rule 1", isInterrupting: false,
  rules: [[{ id: genId('Rule_'), rule: "selected-stage-completed", selectedStageId: stageMap['Clearance'] }]]
});

// Add missing Settlement Exit
data.nodes.find(n => n.id === stageMap['Settlement']).data.exitConditions.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", type: "exit-only", marksStageComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-tasks-completed" }]]
});

// T35: Case Exit
data.metadata.caseExitRules.push({
  id: genId('Condition_'), displayName: "Complete Rule 1", marksCaseComplete: true,
  rules: [[{ id: genId('Rule_'), rule: "required-stages-completed" }]]
});

fs.writeFileSync('caseplan.json', JSON.stringify(data, null, 4));
