const fs = require('fs'); 
const lines = fs.readFileSync('c:\\\\Users\\\\HP\\\\Desktop\\\\All Folder\\\\RH\\\\backend\\\\controllers\\\\AgentsController.js', 'utf8').split('\n'); 
const newLines = lines.map(line => { 
    if (line.includes("WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65")) { 
        return line.replace("WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65", "WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') OR g.libele ILIKE '%PREFEC%' OR g.libele ILIKE '%PRÉFEC%' OR g.libele ILIKE '%PREFET%' OR g.libele ILIKE '%PRÉFET%' OR g.libele ILIKE '%HORS GRADE%' THEN 65"); 
    } 
    if (line.includes("WHEN ${gradeAlias}.libele IS NOT NULL AND UPPER(REPLACE(${gradeAlias}.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65")) { 
        return line.replace("WHEN ${gradeAlias}.libele IS NOT NULL AND UPPER(REPLACE(${gradeAlias}.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65", "WHEN ${gradeAlias}.libele IS NOT NULL AND (UPPER(REPLACE(${gradeAlias}.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') OR ${gradeAlias}.libele ILIKE '%PREFEC%' OR ${gradeAlias}.libele ILIKE '%PRÉFEC%' OR ${gradeAlias}.libele ILIKE '%PREFET%' OR ${gradeAlias}.libele ILIKE '%PRÉFET%' OR ${gradeAlias}.libele ILIKE '%HORS GRADE%') THEN 65"); 
    } 
    return line; 
}); 
fs.writeFileSync('c:\\\\Users\\\\HP\\\\Desktop\\\\All Folder\\\\RH\\\\backend\\\\controllers\\\\AgentsController.js', newLines.join('\n')); 
console.log('success');
