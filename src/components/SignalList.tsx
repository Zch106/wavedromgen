// ===== 信号列表:重命名 / 改色 / 自由模式 / 类型 / 排序 / 删除 =====
import { Doc, SignalType } from '../types';
import { addSignal, deleteSignal, moveSignal, updateSignal, UpdateFn } from '../model';

interface Props {
  doc: Doc;
  update: UpdateFn;
}

const TYPE_LABEL: Record<SignalType, string> = { bit: '电平', bus: 'Bus', clock: '时钟' };

export default function SignalList({ doc, update }: Props) {
  return (
    <div className="signal-list">
      <div className="panel-title">信号列表</div>
      <div className="add-row">
        <button className="btn" onClick={() => update(d => addSignal(d, 'bit'))}>+ 电平</button>
        <button className="btn" onClick={() => update(d => addSignal(d, 'bus'))}>+ Bus</button>
        <button className="btn" onClick={() => update(d => addSignal(d, 'clock'))}>+ 时钟</button>
      </div>
      {doc.signal.map((s, i) => (
        <div className="signal-item" key={s.id}>
          <div className="signal-row1">
            <input
              className="name-input"
              value={s.name}
              title="点击重命名"
              onChange={e => update(d => updateSignal(d, s.id, { name: e.target.value }))}
            />
            <input
              type="color"
              className="color-input"
              value={s.color}
              title="修改颜色"
              onChange={e => update(d => updateSignal(d, s.id, { color: e.target.value }))}
            />
          </div>
          <div className="signal-row2">
            {s.type !== 'clock' ? (
              <label className="chk" title="开启后可在任意网格精度位置创建/移动跳变">
                <input
                  type="checkbox"
                  checked={s.freeMode}
                  onChange={e => update(d => updateSignal(d, s.id, { freeMode: e.target.checked }))}
                />
                自由模式
              </label>
            ) : (
              <label className="chk">
                周期
                <input
                  type="number"
                  className="period-input"
                  min={20}
                  step={10}
                  value={s.period ?? 100}
                  onChange={e => update(d => updateSignal(d, s.id, { period: Math.max(20, Number(e.target.value) || 100) }))}
                />
              </label>
            )}
            {s.type !== 'clock' && (
              <select
                className="type-select"
                value={s.type}
                onChange={e => update(d => updateSignal(d, s.id, { type: e.target.value as SignalType }))}
              >
                <option value="bit">电平</option>
                <option value="bus">Bus</option>
              </select>
            )}
            <span className="spacer" />
            <button className="mini" title="上移" disabled={i === 0} onClick={() => update(d => moveSignal(d, s.id, -1))}>↑</button>
            <button className="mini" title="下移" disabled={i === doc.signal.length - 1} onClick={() => update(d => moveSignal(d, s.id, 1))}>↓</button>
            <button className="mini danger" title="删除信号" onClick={() => { if (window.confirm(`删除信号 ${s.name}?`)) update(d => deleteSignal(d, s.id)); }}>✕</button>
          </div>
        </div>
      ))}
      <div className="hint">
        · 点击波形空白处 → 新增跳变(电平自动翻转,Bus 会询问值)
        <br />· 拖动跳变点手柄 → 移动位置(双击删除跳变)
        <br />· 点击 Bus 数据标签 → 修改值
        <br />· 双击文字标注 → 删除
      </div>
    </div>
  );
}
