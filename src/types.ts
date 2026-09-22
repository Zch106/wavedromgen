// ===== WaveDromGen 核心数据类型 =====
// 时间单位:tick(整数),1 tick = 0.01 周期,无浮点误差

export type SignalType = 'bit' | 'bus' | 'clock';

export interface Transition {
  /** 整数 tick,0.01 周期为单位 */
  t: number;
  /** bit: '0'|'1'|'z'|'x'|'u'|'d';bus: 任意文本(空=无标签) */
  value: string;
}

export interface Annotation {
  id: string;
  t: number;
  row: number;
  text: string;
  color?: string;
  size?: number;
}

export interface Signal {
  id: string;
  name: string;
  type: SignalType;
  color: string;
  /** 自由模式:可在任意网格精度位置跳变;false=仅整周期边沿 */
  freeMode: boolean;
  /** bit/bus 信号的跳变点(按 t 升序);clock 不使用 */
  transitions: Transition[];
  /** clock 周期(tick),默认 100 */
  period?: number;
  /** clock 相位(tick) */
  phase?: number;
}

export interface Doc {
  config: {
    totalCycles: number;
    /** 网格精度(周期数):0.01/0.05/0.1/0.25/0.5/1 */
    grid: number;
    head: string;
    foot: string;
  };
  signal: Signal[];
  annotations: Annotation[];
}

export const GRID_OPTIONS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

/** tick 对应的网格步长(自由模式用);step 模式固定 100 */
export function gridStepTicks(grid: number): number {
  return Math.max(1, Math.round(grid * 100));
}

export function snapT(t: number, grid: number, freeMode: boolean): number {
  const step = freeMode ? gridStepTicks(grid) : 100;
  return Math.round(t / step) * step;
}
