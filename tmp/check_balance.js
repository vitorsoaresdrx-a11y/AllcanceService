import fs from 'fs';
const content = fs.readFileSync('c:/Users/Allcance/allcance/src/pages/Mecanica.tsx', 'utf8');

let paren = 0;
let inSingleQuote = false;
let inDoubleQuote = false;
let inBacktick = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\\') { i++; continue; }
  
  if (char === "'") { if (!inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote; }
  if (char === '"') { if (!inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote; }
  if (char === '`') { if (!inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick; }
  
  if (inSingleQuote || inDoubleQuote || inBacktick) continue;
  
  // Skip comments (simplistic)
  if (char === '/' && content[i+1] === '/') {
     while(i < content.length && content[i] !== '\n') i++;
     continue;
  }
  
  if (char === '(') paren++;
  if (char === ')') {
     paren--;
     if (paren < 0) {
        const line = content.substring(0, i).split('\n').length;
        console.log('UNBALANCED ) AT LINE:', line);
        paren = 0; // reset to find more
     }
  }
}

console.log('Final Paren Balance:', paren);
