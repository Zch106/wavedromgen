# WaveDromGen — 可视化波形编辑器 · 项目计划(v2,定稿)

目标:弥补 WaveDrom 只能在 clk 边沿跳变的不足,做一个浏览器内运行的**可视化**波形编辑器。

## 核心设计决策

1. **渲染**:自研时间轴布局引擎 + 复刻 WaveDrom 默认皮肤视觉风格(MVP 用内置复刻渲染器;
   后续精修项:直接复用 wavedrom 皮肤砖块 skins/default.svg 的 `g#000/111/0m1/pclk` 图元)。
2. **技术栈**:Vite + React + TypeScript,纯前端无后端;PDF 导出用 jsPDF + svg2pdf.js。
3. **数据模型**:整数 tick(1 tick = 0.01 周期),无浮点;网格精度可选 0.01/0.05/0.1/0.25/0.5/1。
4. **双模式**:
   - Step 模式(默认,与 WaveDrom 一致):跳变只能落在整周期边沿
   - 自由模式:信号级开关,开启后可在任意网格精度位置创建/移动跳变
5. **信号类型**:支持 WaveDrom 全部 wave 字符:
   `0/1`(电平)、`z`(高阻)、`x`(不定态)、`=`(bus 数据段)、`2~9`(矢量状态)、
   `u/d`(升/降箭头段)、`p/n`(正/负时钟)、`.`(延续)、`|`(间隔)。
6. **文字**:head/foot 标题 + 任意 (t, 行) 位置的自由文字标注;
   node/edge 箭头标注为后续可选。
7. **截图模式**:一键隐藏手柄、热区、网格等一切交互元素,只留干净波形;
   导出 SVG/PDF 一律输出干净版本。
8. **兼容性**:可导入标准 WaveDrom WaveJSON(wave 字符串 → tick 模型自动转换)。

## 数据模型

```json
{
  "config": { "totalCycles": 12, "grid": 0.05, "head": "标题", "foot": "脚注" },
  "signal": [
    { "name": "clk", "type": "clock", "color": "#333", "freeMode": false,
      "period": 100 },
    { "name": "req", "type": "bit", "color": "#0F6E56", "freeMode": false,
      "transitions": [ { "t": 0, "value": "0" }, { "t": 300, "value": "1" } ] },
    { "name": "data", "type": "bus", "color": "#D85A30", "freeMode": true,
      "transitions": [ { "t": 0, "value": "" }, { "t": 250, "value": "0x2F" } ] }
  ],
  "annotations": [ { "id": "a1", "t": 150, "row": 1, "text": "采样点", "color": "#A32D2D" } ]
}
```

## 阶段划分

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | Vite + React + TS 骨架 | ✅ |
| 1 | tick 数据模型 + 渲染器(全字符集、网格刻度、head/foot) | ✅ |
| 2 | 交互:点击加跳变、拖拽+吸附、双模式、列表编辑、截图模式、Undo/Redo、文字标注 | ✅ |
| 3 | JSON 面板双向联动(防抖、错误标红) | ✅ |
| 4 | 导入导出:JSON 读写、WaveJSON 兼容导入、SVG / PDF 导出 | ✅ |
| 5 | 开源上线:GitHub Actions → Pages、README/LICENSE;可选:node/edge 箭头、皮肤砖块精修 | ⬜ |

## 部署规划

- 纯静态构建产物,可直接托管 GitHub Pages / 任意静态服务器
- 后续:`npm run build` 产物推送 `gh-pages` 分支,Actions 自动部署

---

## 风格对齐记录(2026-09-20,供后续接手者参考)

用户反馈渲染风格与原版 WaveDrom 不符。排查方法:下载官方 wavedrom v3.7.0 npm 包,用其自带 CLI 引擎渲染同一份 WaveJSON,与本项目渲染器输出逐数值对比,发现并修复以下偏差:

| 项目 | 官方行为 | 修复前(错误) | 修复后 |
|---|---|---|---|
| 每周期宽度 | 40px(1 字符 = 2 块 20px 砖) | 20px | ✅ XS=40 |
| 名称列宽 xg | 按最长信号名动态计算,20px 取整 | 写死 120px | ✅ calcXg() |
| 时钟默认周期 | 1 周期(pclk/nclk 各 20px=半周期) | 200 tick(2 周期) | ✅ 100 tick |
| 刻度线 | #888 / 0.5px / dasharray 1,3 / 贯穿全高 / 导出也含 | #dcdcdc 虚线且导出无 | ✅ 对齐 |
| bus 值标签 | 无白底、11pt、段中心+6px | 白底矩形 11px | ✅ 对齐 |
| head/foot 预留 | 各 46px,head 基线 headH-13,foot 基线 headH+rows*30+25 | 固定 30px | ✅ 对齐 |

**已验证的官方规格(勿再改动)**:斜边 3+6(0↔1)、6+3(zm)、0mz 贝塞尔 `C 10,10 15,10 20,10`、x 为 0.5px 45° 斜线(间距 5)非灰色块、bus 粉彩填充循环 s7~s14、信号名 #0041c4 右对齐 xg-10、正文字号 11pt≈14.7px、行距 30、y0=5。对比产物:`compare.html`(官方 vs 本项目,同一份 WaveJSON);对比数据生成脚本 `src/test-scene.ts`(esbuild 打包后 node 运行)。

**遗留差异(可接受/待办)**:bus 填充色按值出现顺序循环,与官方按 wave 字符/数据索引的映射略有不同;`|` gap 字符未渲染;node/edge 箭头未实现(阶段 5 可选项)。

## 启动方式

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 产物输出到 dist/(纯静态,可部署到任意静态托管)
npm run preview    # 本地预览 dist/
```

详见 README.md。
