import { useCallback, useEffect, useRef, useState } from 'react';
import { Doc } from './types';
import { defaultDoc, UpdateFn } from './model';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SignalList from './components/SignalList';
import JsonPanel from './components/JsonPanel';

export default function App() {
  const [doc, setDoc] = useState<Doc>(defaultDoc);
  const [clean, setClean] = useState(false);
  const [addTextMode, setAddTextMode] = useState(false);
  const past = useRef<Doc[]>([]);
  const future = useRef<Doc[]>([]);
  const [, bump] = useState(0);

  const update: UpdateFn = useCallback((fn, record = true) => {
    setDoc(prev => {
      const next = fn(prev);
      if (next === prev) return prev;
      if (record) {
        past.current.push(prev);
        future.current = [];
      }
      return next;
    });
    bump(x => x + 1);
  }, []);

  const setDocFresh = useCallback((d: Doc) => {
    setDoc(prev => { past.current.push(prev); future.current = []; return d; });
    bump(x => x + 1);
  }, []);

  const undo = useCallback(() => {
    setDoc(prev => {
      const p = past.current.pop();
      if (!p) return prev;
      future.current.push(prev);
      return p;
    });
    bump(x => x + 1);
  }, []);

  const redo = useCallback(() => {
    setDoc(prev => {
      const f = future.current.pop();
      if (!f) return prev;
      past.current.push(prev);
      return f;
    });
    bump(x => x + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (clean) {
    return (
      <div className="clean-wrap">
        <div className="clean-canvas">
          <Canvas doc={doc} clean addTextMode={false} update={update} onAddTextDone={() => {}} />
        </div>
        <button className="btn exit-clean" onClick={() => setClean(false)}>退出截图模式</button>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar
        doc={doc}
        clean={clean}
        addTextMode={addTextMode}
        update={update}
        setDoc={setDocFresh}
        onToggleClean={() => setClean(true)}
        onToggleAddText={() => setAddTextMode(m => !m)}
        canUndo={past.current.length > 0}
        canRedo={future.current.length > 0}
        onUndo={undo}
        onRedo={redo}
      />
      <div className="main">
        <SignalList doc={doc} update={update} />
        <div className="right-col">
          <div className="canvas-area">
            <Canvas
              doc={doc}
              clean={false}
              addTextMode={addTextMode}
              update={update}
              onAddTextDone={() => setAddTextMode(false)}
            />
          </div>
          <JsonPanel doc={doc} update={update} />
        </div>
      </div>
    </div>
  );
}
