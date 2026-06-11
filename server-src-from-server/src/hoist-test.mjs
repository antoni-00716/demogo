console.log('START');
async function later() { return 42; }
await later();
console.log('OK');
