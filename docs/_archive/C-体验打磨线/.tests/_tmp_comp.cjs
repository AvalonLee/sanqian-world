const fs = require('fs');
const root = 'E:/下载/xhub/extensions/com.avalonlee.sanqian-world/';
const s = fs.readFileSync(root + 'assets/worlds/xiuxian/data.js', 'utf8');
const i = s.indexOf('COMPANIONS');
const j = s.indexOf('];', i);
const seg = s.slice(i, j);
// 逐条抓取 { id, category, perk, carrierEvents }
const entryRe = /\{\s*id:\s*'([^']+)',\s*category:\s*'([^']+)'([^}]*)\}/g;
let m, code = [];
while ((m = entryRe.exec(seg))) {
  const carriers = (m[3].match(/carrierEvents:\s*\[([^\]]*)\]/) || [])[1] || '';
  const evIds = [...carriers.matchAll(/'([^']+)'/g)].map(x => x[1]);
  code.push({ id: m[1], category: m[2], carrierEvents: evIds.join(',') });
}
console.log('代码 COMPANIONS 共', code.length, '条');
code.forEach((c, n) => console.log(`${n + 1}\t${c.id}\t${c.category}\t${c.carrierEvents}`));
