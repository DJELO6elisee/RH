const fs = require('fs');
const code = fs.readFileSync('src/components/Demandes/DemandeDetails.jsx', 'utf8').split('\n').slice(932, 1381).join('\n');
const re = /<\/?([a-zA-Z0-9_]+)(?:[^>'"{}]+|'[^']*'|"[^"]*"|{[^}]*})*>/g;
let match;
const stack = [];
while ((match = re.exec(code)) !== null) {
  const tagStr = match[0];
  const tagName = match[1];
  if (tagStr.startsWith('</')) {
    if (stack.length && stack[stack.length - 1].name === tagName) {
      stack.pop();
    } else {
      console.log('Mismatch closing:', tagStr, 'Expected:', stack.length ? stack[stack.length - 1].name : 'none');
    }
  } else if (!tagStr.endsWith('/>')) {
    stack.push({name: tagName, str: tagStr});
  }
}
console.log('Unclosed tags remaining in stack:');
stack.forEach(t => console.log(t.str));
