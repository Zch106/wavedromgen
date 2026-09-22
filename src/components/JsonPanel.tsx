// ===== JSON 面板:与画布双向联动 + 字段手册 =====
import { useEffect, useRef, useState } from 'react';
import { Doc } from '../types';
import { normalizeDoc, UpdateFn } from '../model';

interface Props {
  doc: Doc;
  update: UpdateFn;
}

const GUIDE_ROWS: Array<[string, string]> = [
  ['config.totalCycles', '波形总周期数,决定画布水平长度(100 tick = 1 周期)'],
  ['config.grid', '网格吸附精度(0.01 / 0.05 / 0.1 / 0.25 / 0.5 / 1),点击与拖拽都会吸附到此步长;1 = 整周期'],
  ['config.head', '图顶部标题文字(居中显示),留空则不显示、不占高度'],
  ['config.foot', '图底部标题文字(居中显示),留空则不显示、不占高度'],
  ['signal', '信号数组,<b>数组顺序 = 波形图从上到下的行顺序</b>'],
  ['signal[].name', '左侧显示的信号名(蓝色文字)'],
  ['signal[].type', '<code>"bit"</code> 电平信号;<code>"bus"</code> 多 bit 数据总线;<code>"clock"</code> 时钟方波'],
  ['signal[].color', '该信号的波形线条颜色,如 <code>"#000000"</code>'],
  ['signal[].freeMode', '<code>false</code>(默认):只能落在整周期边沿;<code>true</code>:可落在任意网格位置(自由模式)'],
  ['signal[].transitions', '跳变点数组,按 t 升序;每段波形 = 相邻两个跳变点之间'],
  ['…transitions[].t', '跳变的水平位置,单位 tick,<b>100 = 1 个周期</b>(如 250 = 第 2.5 周期处)'],
  ['…transitions[].value', '跳变后的值:<code>"0"/"1"</code> 电平;<code>"z"</code> 高阻(中线);<code>"x"</code> 不定态(斜线块);<code>"u"/"d"</code> 上升/下降箭头;其他任意文本(如 <code>"0x2F"</code>)= bus 数据值,段内显示标签'],
  ['signal[].period', '仅 clock:时钟周期,100 = 1 个完整方波周期(即每 1 周期翻转一次)'],
  ['signal[].phase', '仅 clock:初始相位偏移(tick),波形整体向左平移'],
  ['annotations', '文字标注数组(工具栏"+ 文字标注"添加的元素)'],
  ['annotations[].row', '标注挂靠的信号行(从 0 数),决定垂直位置'],
  ['annotations[].t', '标注的水平位置(tick,同上 100 = 1 周期)'],
  ['annotations[].text / color / size', '标注内容 / 颜色 / 字号(px)']
];

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="btn modal-close" onClick={onClose}>关闭</button>
        <h3>JSON 字段手册</h3>
        <p className="note">
          波形图与下方 JSON 双向同步:在画布上的任何操作都会实时改写 JSON,手动编辑 JSON(500ms 防抖)也会立即重绘波形。
          时间单位为 <b>tick,100 tick = 1 个周期</b>。字段对照如下:
        </p>
        <table className="guide-table">
          <thead><tr><th>字段</th><th>对应波形图的什么</th></tr></thead>
          <tbody>
            {GUIDE_ROWS.map(([k, v]) => (
              <tr key={k}>
                <td><code>{k}</code></td>
                <td dangerouslySetInnerHTML={{ __html: v }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JsonPanel({ doc, update }: Props) {
  const [text, setText] = useState(() => JSON.stringify(doc, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const editingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  // 外部变化(画布操作)→ 同步文本;正在手动编辑且未解析成功时不打断
  useEffect(() => {
    if (editingRef.current && error) return;
    editingRef.current = false;
    setText(JSON.stringify(doc, null, 2));
    setError(null);
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    editingRef.current = true;
    setText(v);
    setError(null);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        const parsed = normalizeDoc(JSON.parse(v));
        update(() => parsed, true);
        editingRef.current = false;
      } catch (err) {
        setError((err as Error).message);
      }
    }, 500);
  };

  return (
    <div className="json-panel">
      <div className="panel-title">
        JSON {error ? <span className="err">· 解析错误: {error}</span> : <span className="ok">· 与画布双向同步</span>}
        <span className="spacer" />
        <button className="btn" onClick={() => setShowGuide(true)}>字段手册</button>
      </div>
      <textarea
        className={error ? 'json-text err' : 'json-text'}
        value={text}
        spellCheck={false}
        onChange={e => onChange(e.target.value)}
      />
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
