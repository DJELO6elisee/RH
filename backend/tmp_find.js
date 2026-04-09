const fs = require('fs');
const lines = fs.readFileSync('c:\\Users\\HP\\Desktop\\All Folder\\RH\\backend\\controllers\\AgentsController.js', 'utf8').split('\n');
const found = lines.findIndex(l => l.includes('getRetirementStats'));
console.log('Found at line:', found + 1);
