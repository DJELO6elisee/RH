const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'backend/controllers/DocumentsController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Replace `${params.length + X}` with `$${params.length + X}`
// Note: we need to be careful to only replace the ones we generated that are missing the `$`.
// Looking at the code:
// ` WHERE da.id_agent_destinataire = ${params.length + 1}`
code = code.replace(/\$\{params\.length \+ (\d+)\}/g, '$$${params.length + $1}');

// Fix the search string bug where we added 3 items to params but only used $1
const searchBug1 = "params.push(searchStr, searchStr, searchStr);";
const searchBugFix = "params.push(searchStr);";
code = code.replace(new RegExp(searchBug1, 'g'), searchBugFix);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Fixed DocumentsController.js');
