console.log('START');
// Test: function defined later, called earlier
await testFunc();
async function testFunc() {
  console.log('testFunc called');
  return 42;
}
console.log('END');
