const fs = require('fs');
const path = require('path');

const jsonPath = 'c:\\Users\\Allcance\\allcance\\public\\frete_rodonaves.json';
const csvPath = 'c:\\Users\\Allcance\\allcance\\public\\frete_rodonaves.csv';

console.log('Lendo arquivo JSON...');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (!Array.isArray(data) || data.length === 0) {
  console.error('JSON inválido ou vazio!');
  process.exit(1);
}

const headers = Object.keys(data[0]);
console.log('Cabeçalhos encontrados:', headers.join(', '));

const csvRows = [];
csvRows.push(headers.join(','));

for (const row of data) {
  const values = headers.map(header => {
    const val = row[header];
    // Se for string com vírgula, envolva em aspas
    if (typeof val === 'string' && val.includes(',')) {
      return `"${val}"`;
    }
    return val === null || val === undefined ? '' : val;
  });
  csvRows.push(values.join(','));
}

console.log(`Escrevendo arquivo CSV com ${data.length} linhas...`);
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');

console.log('Arquivo CSV gerado com sucesso em:', csvPath);
