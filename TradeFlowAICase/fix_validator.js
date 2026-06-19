const fs = require('fs');

let data = JSON.parse(fs.readFileSync('caseplan.json'));

data.nodes.forEach(node => {
  if (node.type.includes('Stage')) {
    node.data.isRequired = true;
  }
});

// Add a placeholder task to Settlement
let settlement = data.nodes.find(n => n.data.label === 'Settlement');
if (settlement.data.tasks.length === 0) {
  settlement.data.tasks.push([{
    id: "dummy1234",
    elementId: settlement.id + "-dummy1234",
    displayName: "Review Settlement",
    isRequired: true,
    type: "case-management",
    data: {}
  }]);
}

fs.writeFileSync('caseplan.json', JSON.stringify(data, null, 4));
