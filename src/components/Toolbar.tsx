// ===== 工具栏 =====
import { useRef } from 'react';
import { Doc, GRID_OPTIONS } from '../types';
import { UpdateFn } from '../model';
import { exportJson, exportPdf, exportSvg, parseLoadedJson } from '../export';

interface Props {
  doc: Doc;
  clean: boolean;
  addTextMode: boolean;
  update: UpdateFn;
  setDoc: (d: Doc) => void;
  onToggleClean: () => void;
  onToggleAddText: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function Toolbar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        p.setDoc(parseLoadedJson(String(reader.result)));
      } catch (err) {
        window.alert('加载失败:' + (err as Error).message);
      }
    };
    reader.readAsText(f);
  };

  const btn = 'btn';

  return (
    <div className="toolbar">
      <button className={btn} onClick={p.onUndo} disabled={!p.canUndo}>↶ 撤销</button>
      <button className={btn} onClick={p.onRedo} disabled={!p.canRedo}>↷ 重做</button>
      <span className="sep" />
      <button className={btn + (p.addTextMode ? ' active' : '')} onClick={p.onToggleAddText} title="点击后在波形上点选位置添加文字">+ 文字标注</button>
      <label className="lbl">网格
        <select
          value={String(p.doc.config.grid)}
          onChange={e => p.update(d => ({ ...d, config: { ...d.config, grid: Number(e.target.value) } }))}
        >
          {GRID_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <input className="lbl head-input" value={p.doc.config.head} placeholder="标题(head)"
        onChange={e => p.update(d => ({ ...d, config: { ...d.config, head: e.target.value } }))} />
      <span className="sep" />
      <button className={btn} onClick={() => fileRef.current?.click()}>加载 JSON</button>
      <input ref={fileRef} type="file" accept=".json,.json5,.txt" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
      <button className={btn} onClick={() => exportJson(p.doc)}>导出 JSON</button>
      <button className={btn} onClick={() => exportSvg(p.doc)}>导出 SVG</button>
      <button className={btn} onClick={() => exportPdf(p.doc)}>导出 PDF</button>
      <span className="sep" />
      <button className={btn + (p.clean ? ' active' : '')} onClick={p.onToggleClean} title="隐藏所有交互元素,仅显示波形">
        {p.clean ? '✓ 截图模式' : '截图模式'}
      </button>
    </div>
  );
}

