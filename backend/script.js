const fs = require('fs');
const files = [
  'c:/Users/HP/Desktop/All Folder/RH/backend/services/PDFKitGenerationService.js',
  'c:/Users/HP/Desktop/All Folder/RH/backend/services/MemoryPDFService.js'
];

const replacement = `titre: typeof title !== 'undefined' && title ? title : (typeof documentTitle !== 'undefined' && documentTitle ? documentTitle : (typeof template !== 'undefined' && template && (template.nom || template.type) ? (template.nom || template.type) : "Document Officiel")),
                        ministere: typeof agent !== 'undefined' && agent && agent.ministere ? (typeof agent.ministere === 'object' ? agent.ministere.nom : agent.ministere) : (typeof ministereName !== 'undefined' ? ministereName : 'N/A'),`;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/titre:\s*"Document Officiel",/g, replacement);
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
