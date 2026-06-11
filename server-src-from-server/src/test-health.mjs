await import('./server-fixed-full.js');
console.error('IMPORT SUCCEEDED');
// Wait a bit for app.listen to complete
await new Promise(r => setTimeout(r, 2000));
const http = await import('http');
try {
  const res = await fetch('http://127.0.0.1:3001/api/health');
  const text = await res.text();
  console.error('HEALTH CHECK:', text);
} catch(e) {
  console.error('HEALTH FAILED:', e.message);
}
