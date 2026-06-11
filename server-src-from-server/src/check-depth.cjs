const fs = require('fs');
const s = fs.readFileSync('src/server-fixed3.js','utf8');
const idx = s.indexOf('await expireDemos');
let depth = 0;
for(let i=0;i<idx;i++) {
  const c = s[i];
  if(c === '{') depth++;
  else if(c === '}') depth--;
}
console.log('Brace depth at await expireDemos:', depth);

const idx2 = s.indexOf('async function expireDemos', idx);
for(let i=idx;i<idx2;i++) {
  const c = s[i];
  if(c === '{') depth++;
  else if(c === '}') depth--;
}
console.log('Brace depth at expireDemos function:', depth);
