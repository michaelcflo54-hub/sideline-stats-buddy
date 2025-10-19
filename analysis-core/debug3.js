// Debug script to test field zone filtering
const { getFieldZone } = require('./dist/banding.js');

console.log('Field zone for yard line 90, distance 5:', getFieldZone(90, 5));
console.log('Field zone for yard line 95, distance 2:', getFieldZone(95, 2));
console.log('Field zone for yard line 25, distance 5:', getFieldZone(25, 5));
