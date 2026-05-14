import fs from 'fs';

const content = fs.readFileSync('c:/Users/Allcance/allcance/src/pages/Mecanica.tsx', 'utf8');
const lines = content.split('\n');

let inString = false;
let quoteChar = '';
let inJS = 0; // {} depth in JSX

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (inString) {
      if (char === quoteChar && line[j-1] !== '\\') {
        inString = false;
      }
    } else {
      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        quoteChar = char;
      } else if (char === '{') {
        inJS++;
      } else if (char === '}') {
        inJS--;
      }
    }
  }
}

console.log('Final inString:', inString, 'quoteChar:', quoteChar, 'inJS:', inJS);
