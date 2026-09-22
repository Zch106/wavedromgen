// 冒烟测试 + 风格对比:用与 official.svg 完全相同的数据渲染,输出 mine.svg
import { defaultDoc, normalizeDoc } from './model';
import { serializeSvg } from './render';

export { defaultDoc, serializeSvg };

// 对应 WaveJSON: {signal:[{name:'clk',wave:'p......'},{name:'req',wave:'0.1..0.'},{name:'data',wave:'x3.=.',data:['A','B']}]}
const doc = normalizeDoc({
  config: { totalCycles: 7, grid: 0.1, head: '', foot: '' },
  signal: [
    { name: 'clk', type: 'clock', transitions: [], period: 100 },
    { name: 'req', type: 'bit', transitions: [{ t: 0, value: '0' }, { t: 200, value: '1' }, { t: 600, value: '0' }] },
    { name: 'data', type: 'bus', transitions: [{ t: 0, value: 'x' }, { t: 100, value: 'A' }, { t: 300, value: 'B' }] }
  ],
  annotations: []
} as never);

const svg = serializeSvg(doc);
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const outDir = path.join(__dirname, '..', 'out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'mine.svg'), svg);
console.log('mine.svg bytes', svg.length);
if (svg.includes('NaN') || svg.includes('undefined')) { throw new Error('BAD SVG'); }
// XML 属性值转义回归:属性值内不允许出现裸双引号(曾导致 svg2pdf 报 Parse error)
for (const m of svg.matchAll(/="([^"]*)"/g)) {
  if (/[<>&"]/.test(m[1])) throw new Error('unescaped attr value: ' + m[1]);
}

// 回归:bus→bus 相邻段(0x2F 后接 0xA1),曾因多边形顶点顺序错误导致填充自交残缺
const doc2 = normalizeDoc({
  config: { totalCycles: 8, grid: 0.1, head: '', foot: '' },
  signal: [
    { name: 'clk', type: 'clock', transitions: [], period: 100 },
    { name: 'data', type: 'bus', transitions: [
      { t: 0, value: '' }, { t: 200, value: '0x2F' }, { t: 500, value: '0xA1' }, { t: 700, value: 'z' }
    ] }
  ],
  annotations: []
} as never);
const svg2 = serializeSvg(doc2);
fs.writeFileSync(path.join(outDir, 'bus-fill-check.svg'), svg2);
console.log('bus-fill-check.svg bytes', svg2.length);
if (svg2.includes('NaN') || svg2.includes('undefined')) { throw new Error('BAD SVG 2'); }
