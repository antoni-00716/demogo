const fs = require('fs');
const src = fs.readFileSync('C:/Users/wei.gu/Documents/demogo/server/src/routes/admin.js', 'utf8');
const lines = src.split('\n');
const before = lines.slice(0, 193);
const after = lines.slice(193);
const result = before.concat([
  '  });',
  '  app.get("/api/admin/feedback", requireAdmin, async (req, res, next) => {'
]).concat(after);
fs.writeFileSync('C:/Users/wei.gu/Documents/demogo/server/src/routes/admin.js', result.join('\n'), 'utf8');
console.log('Fixed. Lines: ' + result.length);
