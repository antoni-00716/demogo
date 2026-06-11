try {
  process.on('uncaughtException', e => console.error('UNCAUGHT:', e.message));
  process.on('unhandledRejection', (e,p) => console.error('UNHANDLED:', e?.message));
  await import('./src/server-fixed3.js');
} catch(e) {
  console.error('CATCH:', e.message);
}
