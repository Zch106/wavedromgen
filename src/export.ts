// ===== 导入 / 导出 =====
import { Doc } from './types';
import { normalizeDoc } from './model';
import { isWaveJson, waveToDoc } from './wavedrom-import';
import { serializeSvg, sceneSize } from './render';

export function download(name: string, data: BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(doc: Doc) {
  download('waveform.json', JSON.stringify(doc, null, 2), 'application/json');
}

export function exportSvg(doc: Doc) {
  download('waveform.svg', serializeSvg(doc), 'image/svg+xml');
}

export async function exportPdf(doc: Doc) {
  try {
    const { jsPDF } = await import('jspdf');
    await import('svg2pdf.js');
    const { width, height } = sceneSize(doc);
    const pdf = new jsPDF({
      orientation: width >= height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [width, height]
    });
    // svg2pdf 需要元素挂在 DOM 上(getBBox 依赖布局),游离节点会直接抛错
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;';
    host.innerHTML = serializeSvg(doc);
    document.body.appendChild(host);
    try {
      const svgEl = host.firstElementChild as SVGElement;
      await (pdf as unknown as { svg: (e: SVGElement, o: object) => Promise<unknown> })
        .svg(svgEl, { x: 0, y: 0, width, height });
    } finally {
      host.remove();
    }
    pdf.save('waveform.pdf');
  } catch (err) {
    alert('PDF 导出失败: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/** 解析用户选择的 JSON 文件:自动识别本项目格式与 WaveDrom WaveJSON */
export function parseLoadedJson(text: string): Doc {
  const obj = JSON.parse(text);
  if (isWaveJson(obj)) return waveToDoc(obj as Record<string, unknown>);
  if (obj && Array.isArray((obj as Doc).signal)) return normalizeDoc(obj as Doc);
  throw new Error('无法识别的 JSON 格式(既不是本项目格式也不是 WaveJSON)');
}
