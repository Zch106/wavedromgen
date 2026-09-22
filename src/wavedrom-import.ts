// ===== WaveDrom WaveJSON 兼容导入 =====
import { Doc, Signal, Transition } from './types';
import { normalizeDoc } from './model';

const PALETTE = ['#185FA5', '#0F6E56', '#993C1D', '#534AB7', '#854F0B', '#A32D2D'];

export function isWaveJson(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const sig = (obj as { signal?: unknown }).signal;
  return Array.isArray(sig) && sig.some(s =>
    s && typeof s === 'object' && typeof (s as { wave?: unknown }).wave === 'string');
}

export function waveToDoc(obj: Record<string, unknown>): Doc {
  const entries = (obj.signal as Record<string, unknown>[]).filter(
    e => e && typeof e === 'object');
  const maxLen = entries.reduce((m, e) => Math.max(m, String(e.wave ?? '').length), 8);

  const signals: Signal[] = entries.map((e, i) => {
    const wave = String(e.wave ?? '');
    const dataQueue = Array.isArray(e.data)
      ? e.data.map(String)
      : typeof e.data === 'string' ? e.data.split(/\s+/) : [];

    const name = String(e.name ?? `signal${i + 1}`);
    const color = PALETTE[i % PALETTE.length];

    // 时钟信号
    if (/[pn]/.test(wave)) {
      return {
        id: `wv_${i}`, name, type: 'clock', color, freeMode: false, transitions: [],
        period: Math.round((Number(e.period) || 1) * 100),
        phase: Math.round((Number(e.phase) || 0) * 100)
      };
    }

    const hasBus = /[=23456789]/.test(wave);
    const transitions: Transition[] = [];
    for (let k = 0; k < wave.length; k++) {
      const c = wave[k];
      const t = k * 100;
      if (c === '.' || c === '|') continue; // 延续 / 间隔:不产生跳变
      if (c === '0' || c === '1' || c === 'z' || c === 'x') {
        transitions.push({ t, value: c });
      } else if (c === '=') {
        transitions.push({ t, value: dataQueue.shift() ?? '' });
      } else if (c >= '2' && c <= '9') {
        transitions.push({ t, value: '' }); // 矢量状态:无标签数据段
      } else if (c === 'u' || c === 'd') {
        transitions.push({ t, value: c });
      }
      // 其他未知字符忽略
    }
    if (transitions.length === 0) transitions.push({ t: 0, value: hasBus ? '' : '0' });

    const sig: Signal = {
      id: `wv_${i}`, name,
      type: hasBus ? 'bus' : 'bit',
      color, freeMode: false, transitions
    };
    return sig;
  });

  const head = (obj.head as { text?: unknown })?.text;
  const foot = (obj.foot as { text?: unknown })?.text;
  return normalizeDoc({
    config: { totalCycles: maxLen, grid: 0.1, head: head ? String(head) : '', foot: foot ? String(foot) : '' },
    signal: signals,
    annotations: []
  });
}
