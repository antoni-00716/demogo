const fs = require("fs");
const s = fs.readFileSync("src/server-fixed3.js","utf8");
const lines = s.split("\n");
const line2 = lines[1];
console.log("Line 2 length:", line2.length);
console.log("Chars 1120-1140:", line2.substring(1120, 1140));
console.log("Chars 1120-1130:", JSON.stringify(line2.substring(1120, 1130)));
