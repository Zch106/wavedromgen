// ===== 波形画布:渲染 + 全部画布交互(事件委托) =====
import { useRef, useState } from 'react';
import { createElement } from 'react';
import { Doc } from '../types';
import { addAnnotation, addTransition, deleteTransition, endTicks, moveTransition, setTransitionValue, UpdateFn } from '../model';
import { buildInteractive, buildScene, El, sceneSize, XS } from '../render';

interface Props {
  doc: Doc;
  clean: boolean;
  addTextMode: boolean;
  update: UpdateFn;
  onAddTextDone: () => void;
}

interface DragState {
  sigId: string;
  idx: number;
  moved: boolean;
}

export default function Canvas({ doc, clean, addTextMode, update, onAddTextDone }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragMovedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const { xg, width, height } = sceneSize(doc, { clean });
  const scene = buildScene(doc, { clean });
  const overlay = clean ? [] : buildInteractive(doc);

  const toTicks = (clientX: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) * (width / rect.width);
    return Math.round((x - xg) * (100 / XS));
  };

  const findRole = (target: EventTarget | null): Element | null => {
    let n = target as Element | null;
    while (n && n !== svgRef.current) {
      if (n.getAttribute && n.getAttribute('data-role')) return n;
      n = n.parentElement;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const t0 = findRole(e.target);
    if (!t0) return;
    const role = t0.getAttribute('data-role');
    if (role === 'handle') {
      dragRef.current = { sigId: t0.getAttribute('data-sig')!, idx: Number(t0.getAttribute('data-idx')), moved: false };
      setDragging(true);
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const t = toTicks(e.clientX);
    dragMovedRef.current = true;
    if (!d.moved) {
      d.moved = true;
      update(prev => prev, true); // 拖动开始前压入历史快照
    }
    update(prev => moveTransition(prev, d.sigId, d.idx, t), false);
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onClick = (e: React.MouseEvent) => {
    if (dragging) return;
    const t0 = findRole(e.target);
    if (!t0) return;
    const role = t0.getAttribute('data-role');
    const sigId = t0.getAttribute('data-sig');
    if (role === 'segval') {
      const idx = Number(t0.getAttribute('data-idx'));
      const cur = t0.textContent ?? '';
      const v = window.prompt('修改数据值(留空清除标签,输入 0/1/z/x 转为电平):', cur);
      if (v !== null) update(prev => setTransitionValue(prev, sigId!, idx, v.trim()));
      return;
    }
    if (role === 'rowhit') {
      const row = Number(t0.getAttribute('data-row'));
      const t = Math.max(0, Math.min(endTicks(doc), toTicks(e.clientX)));
      if (addTextMode) {
        const text = window.prompt('标注文字:');
        if (text && text.trim()) update(prev => addAnnotation(prev, t, row, text.trim()));
        onAddTextDone();
        return;
      }
      const sig = doc.signal[row];
      if (!sig) return;
      const value = sig.type === 'bus'
        ? (window.prompt('新增数据段的值(0/1/z/x 或数据文本):', 'D') ?? undefined)
        : undefined;
      if (sig.type === 'bus' && value === null) return;
      update(prev => addTransition(prev, sigId!, t, value));
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const t0 = findRole(e.target);
    if (!t0) return;
    const role = t0.getAttribute('data-role');
    if (role === 'handle') {
      update(prev => deleteTransition(prev, t0.getAttribute('data-sig')!, Number(t0.getAttribute('data-idx'))));
    } else if (role === 'anno') {
      const id = t0.getAttribute('data-id')!;
      update(prev => ({ ...prev, annotations: prev.annotations.filter(a => a.id !== id) }));
    }
  };

  const renderEl = (e: El, i: number) => {
    const attrs: Record<string, unknown> = { ...e.attrs, key: i };
    return e.text !== undefined
      ? createElement(e.tag, attrs, e.text)
      : createElement(e.tag, attrs);
  };

  const cursor = addTextMode ? 'crosshair' : dragging ? 'ew-resize' : 'default';

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ cursor, userSelect: 'none', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {scene.map(renderEl)}
      {overlay.map(renderEl)}
    </svg>
  );
}
