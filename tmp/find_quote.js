import fs from 'fs';
const content = fs.readFileSync('c:/Users/Allcance/allcance/src/pages/Mecanica.tsx', 'utf8');

let count = 0;
let lastLine = -1;

content.split('\n').forEach((lineText, index) => {
  let lineCount = 0;
  for (let char of lineText) {
    if (char === "'") lineCount++;
  }
  count += lineCount;
  if (count % 2 !== 0 && lastLine === -1) {
    // console.log('Line', index + 1, 'is where it becomes odd:', lineText);
    lastLine = index + 1;
  }
  if (count % 2 === 0) {
    lastLine = -1; // Reset if it becomes even again
  }
});

if (lastLine !== -1) {
  console.log('Unclosed quote found at line:', lastLine);
}
