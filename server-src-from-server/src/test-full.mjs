try {
  process.on('uncaughtException', e => console.error('UNCAUGHT:', e.message));
  process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e?.message));
  await import('./server-fixed-full.js');
  console.error('IMPORT SUCCEEDED');
} catch(e) {
  console.error('CATCH:', e.message, '|' + e.stack?.split('\\n')[1]);
}
