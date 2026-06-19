const fs = require('fs');
let data = JSON.parse(fs.readFileSync('caseplan.json'));
let stages = data.nodes.filter(n => n.type === 'case-management:Stage');

// stages[0] = Intake
stages[0].data.tasks = [
  [{ id: "0e441e54x", elementId: "Stage_A1B2C3-0e441e54x", displayName: "Document Classification & Extraction", isRequired: true, type: "agent", data: {} }],
  [{ id: "8e5561a2x", elementId: "Stage_A1B2C3-8e5561a2x", displayName: "Manual Document Review", isRequired: true, type: "case-management", data: {} }]
];

// stages[1] = Compliance
stages[1].data.tasks = [
  [{ id: "54670ea4x", elementId: "Stage_D4E5F6-54670ea4x", displayName: "OFAC Screening", isRequired: true, type: "agent", data: {} }],
  [{ id: "1be3641ex", elementId: "Stage_D4E5F6-1be3641ex", displayName: "ISF Deadline Check", isRequired: true, type: "agent", data: {} }]
];

// stages[2] = Classification
stages[2].data.tasks = [
  [{ id: "f96c98dfx", elementId: "Stage_G7H8I9-f96c98dfx", displayName: "HTS Code Prediction", isRequired: true, type: "agent", data: {} }],
  [{ id: "557bc5b8x", elementId: "Stage_G7H8I9-557bc5b8x", displayName: "Send to Underwriter", isRequired: true, type: "action", data: {} }]
];

// stages[3] = Clearance
stages[3].data.tasks = [
  [{ id: "87237b54x", elementId: "Stage_J0K1L2-87237b54x", displayName: "Submit ISF to Customs", isRequired: true, type: "process", data: {} }],
  [{ id: "36a9989cx", elementId: "Stage_J0K1L2-36a9989cx", displayName: "Customs Hold Exception", isRequired: true, type: "case-management", data: {} }]
];

fs.writeFileSync('caseplan.json', JSON.stringify(data, null, 4));
