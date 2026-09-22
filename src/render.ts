// ===== SVG 场景构建:精确复刻 WaveDrom 默认皮肤的几何与样式 =====
// 布局/几何规格全部对照官方引擎输出逆向确认(wavedrom v3.7.0):
//   - 每周期 40px(1 个 wave 字符 = 2 块 20px 砖),行距 30px,首行 y0=5
//   - 名称列宽 xg 按最长信号名动态计算(官方 render-signal 行为)
//   - 刻度线 #888 / 0.5px / dasharray 1,3,贯穿全高,每周期一条
//   - head/foot 存在时各占 46px;head 基线 headH-13,foot 基线 headH+rows*30+25
//   - 信号名 #0041c4 右对齐 xg-10;bus 标签无白底、中心+6px
//   - 砖块几何:0m1 斜边 3+6、zm 边 6+3、0mz 贝塞尔、x=0.5px 45° 斜线、时钟 pclk/nclk 半周期 20px
import { Doc, Signal } from './types';

export const XS = 40;      // 每周期像素(官方 1 字符 = 2 砖 × 20px)
export const ROW_H = 30;   // lane.yo:行距
const Y0 = 5;              // lane.y0:首行偏移
const HEAD_H = 46;         // head.text 存在时的预留高
const FOOT_H = 46;         // foot.text 存在时的预留高
const HIGH = 0, LOW = 20, MID = 10; // 砖块内纵坐标

const NAME_COLOR = '#0041c4';   // 皮肤 .info:信号名蓝色
const MARKS_COLOR = '#888888';  // 官方 gmarks 刻度线
const BUS_FILLS = ['#ffffff', '#ffffb4', '#ffe0b9', '#b9e0ff', '#ccfdfe', '#cdfdc5', '#f0c1fb', '#f5c2c0']; // s7..s14
const TEXT_FONT = 14.7;         // 11pt(皮肤 CSS text{font-size:11pt})

export interface El {
  tag: string;
  attrs: Record<string, string | number>;
  text?: string;
}

export interface SceneOpts {
  clean: boolean; // 导出/截图:隐藏交互元素与刻度数字(刻度点线保留,与官方一致)
}

// 名称列宽估算(与皮肤 Helvetica 11pt 近似;canvas 与 SVG 导出共用同一估算保证一致)
function estNameWidth(name: string): number {
  let w = 0;
  for (const ch of name) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 0x2e80) w += 14.7;                    // CJK
    else if (/[A-Z0-9MWQ@#%&]/.test(ch)) w += 10.5;
    else if (/[iljtlf.,:;''"]/.test(ch)) w += 5;
    else w += 8.2;
  }
  return w;
}

/** 名称列宽(波形区左缘):按最长信号名动态计算,官方为 20px 的整数倍 */
export function calcXg(doc: Doc): number {
  const maxW = doc.signal.reduce((m, s) => Math.max(m, estNameWidth(s.name)), 0);
  return Math.ceil((maxW + 30) / 20) * 20;
}

function headH(doc: Doc): number { return doc.config.head ? HEAD_H : 0; }
function footH(doc: Doc): number { return doc.config.foot ? FOOT_H : 0; }

export function sceneSize(doc: Doc, opts?: SceneOpts) {
  const rows = Math.max(doc.signal.length, 1);
  const clean = opts?.clean ?? false;
  const topPad = clean ? headH(doc) : Math.max(headH(doc), 16); // 编辑模式留刻度数字位置
  return {
    xg: calcXg(doc),
    width: calcXg(doc) + doc.config.totalCycles * XS + 20,
    height: topPad + rows * ROW_H + footH(doc)
  };
}

const FONT = "Helvetica, Arial, 'Microsoft YaHei', sans-serif";

function el(tag: string, attrs: Record<string, string | number>, text?: string): El {
  return { tag, attrs: { ...attrs, 'font-family': FONT }, text };
}

// 皮肤 s1:黑(或信号色)1px 圆帽直线
const s1 = (c: string) => ({ fill: 'none', stroke: c, 'stroke-width': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'miter' });
// 皮肤 s2:x 斜线填充 0.5px
const s2 = (c: string) => ({ ...s1(c), 'stroke-width': 0.5 });

const levelY = (v: string): number | null => (v === '1' ? HIGH : v === '0' ? LOW : v === 'z' ? MID : null);
const isLevel = (v: string) => levelY(v) !== null;
const isBusVal = (v: string | null) => v !== null && v !== '' && !isLevel(v) && v !== 'x' && v !== 'u' && v !== 'd';

export function buildScene(doc: Doc, opts: SceneOpts): El[] {
  const els: El[] = [];
  const rows = Math.max(doc.signal.length, 1);
  const { xg, width, height } = sceneSize(doc, opts);
  const topPad = height - rows * ROW_H - footH(doc);
  const hH = headH(doc);
  const endT = doc.config.totalCycles * 100;
  const px = (t: number) => xg + (t / 100) * XS;

  els.push(el('rect', { x: 0, y: 0, width, height, fill: '#ffffff' }));

  // 刻度点线(官方 gmarks:#888 0.5px dasharray 1,3,贯穿全高,每周期一条)
  for (let c = 0; c <= doc.config.totalCycles; c++) {
    els.push(el('line', { x1: px(c * 100), y1: 0, x2: px(c * 100), y2: height, stroke: MARKS_COLOR, 'stroke-width': 0.5, 'stroke-dasharray': '1 3' }));
  }
  // 周期数字(仅编辑模式;官方默认无数字)
  if (!opts.clean) {
    const cycles = doc.config.totalCycles;
    const labelEvery = cycles > 32 ? 5 : cycles > 16 ? 2 : 1;
    for (let c = 0; c <= cycles; c++) {
      if (c % labelEvery === 0) {
        els.push(el('text', { x: px(c * 100), y: 13, 'font-size': 10, fill: '#aaaaaa', 'text-anchor': 'middle' }, String(c)));
      }
    }
  }

  // head 标题(官方:居中,基线 headH-13)
  if (doc.config.head) {
    els.push(el('text', {
      x: xg + (doc.config.totalCycles * XS) / 2, y: hH - 13,
      'font-size': TEXT_FONT, fill: '#000000', 'text-anchor': 'middle'
    }, doc.config.head));
  }

  // 信号
  doc.signal.forEach((sig, i) => {
    const laneTop = topPad + Y0 + i * ROW_H; // 波形砖块 y0(组内 0..20)
    // 信号名:蓝色、右对齐 xg-10(官方 class info / text-anchor end)
    els.push(el('text', {
      x: xg - 10, y: laneTop + 15, 'font-size': TEXT_FONT,
      fill: NAME_COLOR, 'text-anchor': 'end'
    }, sig.name));

    if (sig.type === 'clock') {
      renderClock(els, sig, laneTop, endT, px);
      return;
    }
    const ts = sig.transitions;
    let busIdx = 0;
    for (let j = 0; j < ts.length; j++) {
      const t0 = ts[j].t;
      const t1 = j + 1 < ts.length ? ts[j + 1].t : endT;
      if (t1 <= t0) continue;
      const prev = j > 0 ? ts[j - 1].value : null;
      const next = j + 1 < ts.length ? ts[j + 1].value : null;
      const fill = isBusVal(ts[j].value) ? BUS_FILLS[(busIdx++ + 1) % BUS_FILLS.length] : null;
      renderSegment(els, sig, j, laneTop, px(t0), px(t1), ts[j].value, prev, next, fill);
    }
  });

  // 文字标注
  doc.annotations.forEach(a => {
    const laneTop = topPad + Y0 + a.row * ROW_H;
    els.push(el('text', {
      x: px(a.t) + 4, y: laneTop + 2, 'font-size': a.size || 11,
      fill: a.color || '#A32D2D', 'data-role': 'anno', 'data-id': a.id
    }, a.text));
  });

  // foot 标题(官方:基线 headH + rows*30 + 25)
  if (doc.config.foot) {
    els.push(el('text', {
      x: xg + (doc.config.totalCycles * XS) / 2, y: hH + rows * ROW_H + 25,
      'font-size': TEXT_FONT, fill: '#000000', 'text-anchor': 'middle'
    }, doc.config.foot));
  }
  return els;
}

// ---- 时钟:pclk/nclk 半周期 20px,垂直边 + 水平;默认周期 100 tick = 1 周期 ----
function renderClock(els: El[], sig: Signal, laneTop: number, endT: number, px: (t: number) => number) {
  const hi = laneTop + HIGH, lo = laneTop + LOW;
  const p = Math.max(20, sig.period || 100);
  const half = p / 2;
  const startT = sig.phase ? ((-sig.phase % p) + p) % p : 0;
  const c = sig.color;
  let d = '';
  if (startT > 0) d = `M ${px(0)} ${lo} L ${px(startT)} ${lo}`;
  let t = startT, up = true;
  while (t < endT) {
    const x = px(Math.max(t, 0));
    const yTop = up ? hi : lo, yBot = up ? lo : hi;
    d += ` ${d ? 'L' : 'M'} ${x} ${yBot} L ${x} ${yTop}`;
    const nxt = Math.min(t + half, endT);
    d += ` L ${px(nxt)} ${yTop}`;
    up = !up; t = nxt;
  }
  els.push(el('path', { d, ...s1(c) }));
}

// 水平段宽度不足以容纳完整斜边时按比例压缩
function scaledEdge(w: number, parts: Array<[number, number]>): Array<[number, number]> {
  const need = parts[parts.length - 1][0];
  const s = w < need ? w / need : 1;
  return parts.map(([dx, y]) => [dx * s, y]);
}

// ---- 电平段(0/1/z):水平线 + 皮肤斜边/曲线边 ----
function levelSegment(els: El[], sig: Signal, laneTop: number, x0: number, x1: number, v: string, prev: string | null) {
  const c = sig.color;
  const y = laneTop + (levelY(v) as number);
  const w = x1 - x0;
  let d = '';
  const py = prev != null ? levelY(prev) : null;

  if (py === null || py === levelY(v)) {
    d = `M ${x0} ${y} L ${x1} ${y}`;
  } else if (prev === 'z') {
    // zm0/zm1:中线走 6,斜 3
    const pts = scaledEdge(w, [[0, MID], [6, MID], [9, v === '0' ? LOW : HIGH]]);
    d = pts.map(([dx, dy], i) => `${i ? 'L' : 'M'} ${x0 + dx} ${laneTop + dy}`).join(' ') + ` L ${x1} ${y}`;
  } else if (v === 'z') {
    // 0mz/1mz:贝塞尔曲线进入中线
    const s = w < 20 ? w / 20 : 1;
    d = `M ${x0} ${laneTop + py} L ${x0 + 3 * s} ${laneTop + py} C ${x0 + 10 * s} ${laneTop + MID} ${x0 + 15 * s} ${laneTop + MID} ${x0 + 20 * s} ${laneTop + MID} L ${x1} ${y}`;
  } else {
    // 0m1/1m0:老电平 3,斜 6
    const pts = scaledEdge(w, [[0, py], [3, py], [9, levelY(v) as number]]);
    d = pts.map(([dx, dy], i) => `${i ? 'L' : 'M'} ${x0 + dx} ${laneTop + dy}`).join(' ') + ` L ${x1} ${y}`;
  }
  els.push(el('path', { d, ...s1(c) }));
}

// ---- x 段:上下边框 + 45° 斜线填充(皮肤 xxx/xm0/0mx) ----
function xSegment(els: El[], sig: Signal, laneTop: number, x0: number, x1: number, prev: string | null, next: string | null) {
  const c = sig.color;
  const hi = laneTop + HIGH, lo = laneTop + LOW;
  els.push(el('line', { x1: x0, y1: hi, x2: x1, y2: hi, ...s1(c) }));
  els.push(el('line', { x1: x0, y1: lo, x2: x1, y2: lo, ...s1(c) }));
  // 45° 斜线,间距 5px
  for (let xi = x0 - 20; xi < x1; xi += 5) {
    const xa = Math.max(xi, x0), xb = Math.min(xi + 20, x1);
    if (xa < xb) {
      els.push(el('line', {
        x1: xa, y1: lo - (xa - xi), x2: xb, y2: lo - (xb - xi), ...s2(c)
      }));
    }
  }
  const py = prev != null ? levelY(prev) : null;
  if (py !== null && py !== undefined) {
    if (prev === 'z') {
      els.push(el('line', { x1: x0 + 6, y1: laneTop + MID, x2: x0 + 9, y2: hi, ...s1(c) }));
      els.push(el('line', { x1: x0 + 6, y1: laneTop + MID, x2: x0 + 9, y2: lo, ...s1(c) }));
    } else {
      els.push(el('line', { x1: x0 + 3, y1: laneTop + py, x2: x0 + 9, y2: py === HIGH ? lo : hi, ...s1(c) }));
    }
  }
  const ny = next != null ? levelY(next) : null;
  if (ny !== null && ny !== undefined) {
    if (next === 'z') {
      els.push(el('line', { x1: x1 - 6, y1: hi, x2: x1 - 3, y2: laneTop + MID, ...s1(c) }));
      els.push(el('line', { x1: x1 - 6, y1: lo, x2: x1 - 3, y2: laneTop + MID, ...s1(c) }));
    } else {
      els.push(el('line', { x1: x1 - 6, y1: ny === HIGH ? lo : hi, x2: x1, y2: laneTop + ny, ...s1(c) }));
    }
  }
}

// ---- u/d:皮肤曲线(0mu/1md 形状,按段宽缩放) ----
function arrowSegment(els: El[], sig: Signal, laneTop: number, x0: number, x1: number, v: 'u' | 'd') {
  const c = sig.color;
  const w = Math.max(x1 - x0, 1);
  const s = w / 20;
  const up = v === 'u';
  const yA = laneTop + (up ? LOW : HIGH);
  const yB = laneTop + (up ? HIGH : LOW);
  const d = `M ${x0} ${yA} L ${x0 + 3 * s} ${yA} C ${x0 + 7 * s} ${yA + (up ? -10 : 10)} ${x0 + 10.1 * s} ${yB} ${x1} ${yB}`;
  els.push(el('path', { d, ...s1(c) }));
}

// ---- bus 数据段:粉彩填充 + 交叉斜边 + 无底框居中标签 ----
function busSegment(els: El[], sig: Signal, idx: number, laneTop: number, x0: number, x1: number,
  prev: string | null, next: string | null, fill: string) {
  const c = sig.color;
  const hi = laneTop + HIGH, lo = laneTop + LOW, mid = laneTop + MID;
  const w = x1 - x0;
  if (w <= 2) {
    els.push(el('line', { x1: x0, y1: hi, x2: x0, y2: lo, ...s1(c) }));
    return;
  }
  const k = Math.min(1, w / 18);

  type Edge = { top: number; bot: number; mid: boolean };
  const left: Edge = (() => {
    if (prev === null) return { top: 0, bot: 0, mid: false };
    if (isBusVal(prev)) return { top: 9 * k, bot: 9 * k, mid: true };
    if (prev === 'z' || prev === 'x') return { top: 9 * k, bot: 9 * k, mid: true };
    const py = levelY(prev) as number;
    return py === HIGH ? { top: 3 * k, bot: 9 * k, mid: false } : { top: 9 * k, bot: 3 * k, mid: false };
  })();
  const right: Edge = (() => {
    if (next === null) return { top: 0, bot: 0, mid: false };
    if (isBusVal(next)) return { top: 9 * k, bot: 9 * k, mid: true };
    if (next === 'z' || next === 'x') return { top: 9 * k, bot: 9 * k, mid: true };
    const ny = levelY(next) as number;
    return ny === HIGH ? { top: 9 * k, bot: 3 * k, mid: false } : { top: 3 * k, bot: 9 * k, mid: false };
  })();

  // 顶点顺序:上边 L→R → 右边 hi→mid→lo → 下边 R→L → 左边 lo→mid→hi → 闭合
  // (不能按索引插入,否则左中点会落进右边缘中间,多边形自交成蝴蝶结,填充残缺)
  const pts: string[] = [
    `${x0 + left.top},${hi}`, `${x1 - right.top},${hi}`
  ];
  if (right.mid) pts.push(`${x1 - 6 * k},${mid}`);
  pts.push(`${x1 - right.bot},${lo}`, `${x0 + left.bot},${lo}`);
  if (left.mid) pts.push(`${x0 + 6 * k},${mid}`);
  els.push(el('path', { d: `M ${pts.join(' L ')} Z`, fill, 'fill-opacity': 1, stroke: 'none' }));

  els.push(el('line', { x1: x0, y1: hi, x2: x1, y2: hi, ...s1(c) }));
  els.push(el('line', { x1: x0, y1: lo, x2: x1, y2: lo, ...s1(c) }));

  const py = prev != null ? levelY(prev) : null;
  if (isBusVal(prev)) {
    els.push(el('line', { x1: x0 + 3 * k, y1: hi, x2: x0 + 9 * k, y2: lo, ...s1(c) }));
    els.push(el('line', { x1: x0 + 3 * k, y1: lo, x2: x0 + 9 * k, y2: hi, ...s1(c) }));
  } else if (py !== null && py !== undefined) {
    if (prev === 'z' || prev === 'x') {
      els.push(el('line', { x1: x0 + 6 * k, y1: mid, x2: x0 + 9 * k, y2: hi, ...s1(c) }));
      els.push(el('line', { x1: x0 + 6 * k, y1: mid, x2: x0 + 9 * k, y2: lo, ...s1(c) }));
    } else {
      els.push(el('line', { x1: x0 + 3 * k, y1: laneTop + py, x2: x0 + 9 * k, y2: py === HIGH ? lo : hi, ...s1(c) }));
    }
  }
  const ny = next != null ? levelY(next) : null;
  if (isBusVal(next)) {
    els.push(el('line', { x1: x1 - 3 * k, y1: hi, x2: x1 - 9 * k, y2: lo, ...s1(c) }));
    els.push(el('line', { x1: x1 - 3 * k, y1: lo, x2: x1 - 9 * k, y2: hi, ...s1(c) }));
  } else if (ny !== null && ny !== undefined) {
    if (next === 'z' || next === 'x') {
      els.push(el('line', { x1: x1 - 6 * k, y1: mid, x2: x1 - 9 * k, y2: hi, ...s1(c) }));
      els.push(el('line', { x1: x1 - 6 * k, y1: mid, x2: x1 - 9 * k, y2: lo, ...s1(c) }));
    } else {
      els.push(el('line', { x1: x1 - 3 * k, y1: ny === HIGH ? lo : hi, x2: x1 - 9 * k, y2: laneTop + ny, ...s1(c) }));
    }
  }

  // 值标签:官方样式——无白底、默认字号、段中心 +6px
  const v = sig.transitions[idx].value;
  if (v && w > 24) {
    els.push(el('text', {
      x: (x0 + x1) / 2 + 6, y: laneTop + 15, 'font-size': TEXT_FONT,
      fill: c, 'text-anchor': 'middle', 'data-role': 'segval', 'data-sig': sig.id, 'data-idx': idx
    }, v));
  }
}

function renderSegment(els: El[], sig: Signal, idx: number, laneTop: number, x0: number, x1: number,
  v: string, prev: string | null, next: string | null, fill: string | null) {
  if (v === 'x') { xSegment(els, sig, laneTop, x0, x1, prev, next); return; }
  if (v === 'u' || v === 'd') { arrowSegment(els, sig, laneTop, x0, x1, v as 'u' | 'd'); return; }
  if (isLevel(v)) { levelSegment(els, sig, laneTop, x0, x1, v, prev); return; }
  busSegment(els, sig, idx, laneTop, x0, x1, prev, next, fill as string);
}

/** 交互层:先热区后手柄(手柄必须盖在热区之上才能接收指针事件) */
export function buildInteractive(doc: Doc): El[] {
  const els: El[] = [];
  const { xg, width } = sceneSize(doc, { clean: true });
  const topPad = Math.max(headH(doc), 16);
  const px = (t: number) => xg + (t / 100) * XS;
  doc.signal.forEach((sig, i) => {
    const laneTop = topPad + Y0 + i * ROW_H;
    els.push(el('rect', {
      x: xg, y: laneTop - 5, width: width - xg - 16, height: ROW_H,
      fill: 'transparent', 'data-role': 'rowhit', 'data-sig': sig.id, 'data-row': i
    }));
    if (sig.type !== 'clock') {
      sig.transitions.forEach((tr, j) => {
        const x = px(tr.t);
        const hit = { 'data-role': 'handle', 'data-sig': sig.id, 'data-idx': j, cursor: 'ew-resize' };
        // 纵向参考虚线:贯穿整行,既提示可拖拽方向,也扩大纵向命中范围
        els.push(el('line', {
          x1: x, y1: laneTop - 4, x2: x, y2: laneTop + ROW_H - 6,
          stroke: '#1a73e8', 'stroke-width': 6, 'stroke-dasharray': '4 3',
          'stroke-linecap': 'round', opacity: 0.15, ...hit
        }));
        // 中心圆点手柄:白底蓝圈,悬停变实心(样式见 .drag-handle)
        els.push(el('circle', {
          cx: x, cy: laneTop + MID, r: 5.5,
          fill: '#ffffff', stroke: '#1a73e8', 'stroke-width': 2,
          'class': 'drag-handle', ...hit
        }));
      });
    }
  });
  return els;
}

/** 序列化为独立 SVG 字符串(干净版,用于导出) */
export function serializeSvg(doc: Doc): string {
  const { width, height } = sceneSize(doc, { clean: true });
  const els = buildScene(doc, { clean: true });
  const body = els.map(e => {
    // 属性值必须转义,否则值里的引号/&/< 会破坏 XML(svg2pdf 报 Parse error 的根因)
    const attrs = Object.entries(e.attrs).map(([k, v]) => `${k}="${escapeXml(String(v))}"`).join(' ');
    return e.text !== undefined
      ? `<${e.tag} ${attrs}>${escapeXml(e.text)}</${e.tag}>`
      : `<${e.tag} ${attrs}/>`;
  }).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  ${body}\n</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
