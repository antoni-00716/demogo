try {
  process.on('uncaughtException', e => console.error('UNCAUGHT:', e.message, e.stack?.split('\\n')[0]));
  process.on('unhandledRejection', (e) => console.error('UNHANDLED REJECTION:', e?.message));
  await import('./server-fixed3.js');
} catch(e) {
  console.error('CATCH:', e.message);
  console.error('STACK:', e.stack?.split('\\n').slice(0,5).join('\\n'));
}
