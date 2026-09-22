// ===== 文档操作(纯函数,返回新 Doc)=====
import { Annotation, Doc, Signal, SignalType, Transition, snapT } from './types';

let uid = 0;
const nextId = (p: string) => `${p}_${Date.now().toString(36)}_${(uid++).toString(36)}`;

// 默认黑色,与 WaveDrom 一致;用户可在信号列表中自定义颜色

export function clone<T>(v: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

export function defaultDoc(): Doc {
  return {
    config: { totalCycles: 12, grid: 0.1, head: '示例时序图', foot: '' },
    signal: [
      { id: 's_clk', name: 'clk', type: 'clock', color: '#000000', freeMode: false, transitions: [], period: 100 },
      { id: 's_req', name: 'req', type: 'bit', color: '#000000', freeMode: false,
        transitions: [{ t: 0, value: '0' }, { t: 300, value: '1' }, { t: 700, value: '0' }] },
      { id: 's_data', name: 'data', type: 'bus', color: '#000000', freeMode: true,
        transitions: [{ t: 0, value: '' }, { t: 250, value: '0x2F' }, { t: 605, value: '0xA1' }] }
    ],
    annotations: []
  };
}

export function normalizeDoc(d: Doc): Doc {
  const nd = clone(d);
  const c = (nd.config ?? {}) as Partial<Doc['config']>;
  nd.config = {
    totalCycles: Number(c.totalCycles) > 0 ? Number(c.totalCycles) : 12,
    grid: Number(c.grid) > 0 ? Number(c.grid) : 0.1,
    head: String(c.head ?? ''),
    foot: String(c.foot ?? '')
  };
  nd.signal = (nd.signal || []).map((s, i) => {
    const sig: Signal = {
      id: s.id || nextId('s'),
      name: s.name || `signal${i + 1}`,
      type: (['bit', 'bus', 'clock'] as SignalType[]).includes(s.type) ? s.type : 'bit',
      color: s.color || '#000000',
      freeMode: !!s.freeMode,
      transitions: s.type === 'clock' ? [] : (s.transitions || []),
      period: s.period || 200,
      phase: s.phase || 0
    };
    sig.transitions = sig.transitions
      .map(t => ({ t: Math.round(Number(t.t) || 0), value: String(t.value ?? '') }))
      .sort((a, b) => a.t - b.t);
    if (sig.transitions.length === 0) sig.transitions = [{ t: 0, value: sig.type === 'bus' ? '' : '0' }];
    return sig;
  });
  nd.annotations = (nd.annotations || []).map(a => ({ ...a, id: a.id || nextId('a') }));
  return nd;
}

const levelToggle = (v: string): string =>
  v === '0' ? '1' : v === '1' ? '0' : v === 'z' ? '1' : '0';

export function endTicks(doc: Doc): number {
  return doc.config.totalCycles * 100;
}

export function addSignal(doc: Doc, type: SignalType): Doc {
  const nd = clone(doc);
  const sig: Signal = {
    id: nextId('s'),
    name: type === 'clock' ? 'clk' : type === 'bus' ? 'bus' : 'sig',
    type,
    color: '#000000',
    freeMode: false,
    transitions: type === 'clock' ? [] : [{ t: 0, value: type === 'bus' ? 'D0' : '0' }],
    period: 100,
    phase: 0
  };
  nd.signal.push(sig);
  return nd;
}

export function updateSignal(doc: Doc, id: string, patch: Partial<Signal>): Doc {
  const nd = clone(doc);
  const s = nd.signal.find(x => x.id === id);
  if (s) Object.assign(s, patch);
  return nd;
}

export function deleteSignal(doc: Doc, id: string): Doc {
  const nd = clone(doc);
  nd.signal = nd.signal.filter(s => s.id !== id);
  nd.annotations = nd.annotations.filter(a => a.row < nd.signal.length || a.row < 0);
  return nd;
}

export function moveSignal(doc: Doc, id: string, dir: -1 | 1): Doc {
  const nd = clone(doc);
  const i = nd.signal.findIndex(s => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= nd.signal.length) return nd;
  [nd.signal[i], nd.signal[j]] = [nd.signal[j], nd.signal[i]];
  return nd;
}

export function addTransition(doc: Doc, sigId: string, t: number, value?: string): Doc {
  const nd = clone(doc);
  const s = nd.signal.find(x => x.id === sigId);
  if (!s || s.type === 'clock') return nd;
  const ts = s.transitions;
  const snapped = snapT(t, nd.config.grid, s.freeMode);
  const exist = ts.find(tr => tr.t === snapped);
  if (exist) return nd;
  // 当前电平:最后一个 t <= snapped 的跳变值
  let prev = ts.length ? ts[ts.length - 1].value : '0';
  for (const tr of ts) { if (tr.t <= snapped) prev = tr.value; else break; }
  ts.push({ t: snapped, value: value !== undefined ? value : levelToggle(prev) });
  ts.sort((a, b) => a.t - b.t);
  return nd;
}

export function moveTransition(doc: Doc, sigId: string, idx: number, t: number): Doc {
  const nd = clone(doc);
  const s = nd.signal.find(x => x.id === sigId);
  if (!s || s.type === 'clock' || !s.transitions[idx]) return nd;
  const ts = s.transitions;
  const snapped = snapT(t, nd.config.grid, s.freeMode);
  const lo = idx > 0 ? ts[idx - 1].t + 1 : 0;
  const hi = idx < ts.length - 1 ? ts[idx + 1].t - 1 : endTicks(nd);
  ts[idx].t = Math.min(hi, Math.max(lo, snapped));
  ts.sort((a, b) => a.t - b.t);
  return nd;
}

export function deleteTransition(doc: Doc, sigId: string, idx: number): Doc {
  const nd = clone(doc);
  const s = nd.signal.find(x => x.id === sigId);
  if (!s || s.type === 'clock' || s.transitions.length <= 1) return nd;
  s.transitions.splice(idx, 1);
  return nd;
}

export function setTransitionValue(doc: Doc, sigId: string, idx: number, value: string): Doc {
  const nd = clone(doc);
  const s = nd.signal.find(x => x.id === sigId);
  if (s && s.transitions[idx]) s.transitions[idx].value = value;
  return nd;
}

export function addAnnotation(doc: Doc, t: number, row: number, text: string): Doc {
  const nd = clone(doc);
  const a: Annotation = { id: nextId('a'), t: Math.round(t), row, text, color: '#A32D2D' };
  nd.annotations.push(a);
  return nd;
}

export function removeAnnotation(doc: Doc, id: string): Doc {
  const nd = clone(doc);
  nd.annotations = nd.annotations.filter(a => a.id !== id);
  return nd;
}

export type UpdateFn = (fn: (d: Doc) => Doc, record?: boolean) => void;
export { nextId };
