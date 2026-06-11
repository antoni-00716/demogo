import fs from 'node:fs';

const filePath = 'C:/Users/wei.gu/Documents/demogo/server/src/server.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Fix known garbled patterns by matching the exact corrupted byte sequences
// Pattern: garbled "项目检查未通过，请根据提示调整后重试"
const fixes = [
  // Line ~691: garbled Chinese in Error
  [/椤圭洰妫€鏌ユ湭閫氳繃锛岃鏍规嵁鎻愮ず璋冩暣鍚庨噸璇?/g, '项目检查未通过，请根据提示调整后重试'],
  // Line ~708: garbled Chinese in message
  [/閮ㄧ讲浠诲姟宸叉彁浜わ紝姝ｅ湪澶勭悊?/g, '部署任务已提交，正在处理'],
  // Line ~809: garbled update message
  [/鏇存柊鎴愬姛锛屽師璇曠敤閾炬帴淇濇寔涓嶅彉?/g, '更新成功，原试用链接保持不变'],
];

for (const [pattern, replacement] of fixes) {
  content = content.replace(pattern, replacement);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed', fixes.length, 'patterns');

// Check for remaining garbled chars
const remaining = [];
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const cp = line.codePointAt(j);
    if (cp >= 0xE000 && cp <= 0xF8FF) {
      // Private Use Area - could be garbled
    }
    if (cp >= 0x6D00 && cp <= 0x9FFF && cp < 0x4E00) {
      remaining.push({line: i+1, text: line.substring(Math.max(0,j-5), Math.min(line.length, j+30))});
      break;
    }
  }
}
if (remaining.length > 0) {
  console.log('Remaining potential garbled lines:');
  for (const r of remaining.slice(0, 20)) {
    console.log('  Line', r.line + ':', r.text);
  }
}
