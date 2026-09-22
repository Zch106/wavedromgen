# WaveDromGen — 可视化波形编辑器

一款类 [WaveDrom](https://wavedrom.com/) 的时序波形编辑器,弥补原版只能在 clk 边沿跳变的限制:**每条信号可独立开启"自由模式",在任意网格位置创建和拖动跳变**,同时保留原版经典的视觉风格。

纯前端应用(Vite + React + TypeScript),无需后端,构建产物是纯静态文件。

## 功能特性

- **双模式编辑**:默认 step 模式(与 WaveDrom 一致,只在整周期边沿跳变);信号级"自由模式"开关,开启后可在任意网格精度位置跳变
- **全字符集渲染**:`0/1/z/x/=/u/d/2-9`、时钟 `p/n` 风格方波、bus 粉彩数据段,视觉规格按 WaveDrom v3 默认皮肤逆向复刻(40px/周期、蓝色信号名、斜线填充 x 等)
- **可视化交互**:点击波形添加跳变、拖拽手柄移位、双击删除、点击 bus 标签改值、信号重命名/换色/排序/删除、文字标注
- **JSON 双向联动**:画布操作实时同步到底部 JSON 编辑区;手动编辑 JSON(防抖)立即重绘;语法错误标红提示
- **兼容导入**:直接加载标准 WaveDrom WaveJSON 文件,自动转换为可自由编辑的模型
- **导出**:JSON / SVG(矢量)/ PDF(纯前端 jsPDF 生成);截图模式一键隐藏所有交互元素输出干净波形
- **网格吸附**:0.01 / 0.05 / 0.1 / 0.25 / 0.5 / 1 六档精度可选,1 tick = 0.01 周期,整数存储无浮点误差
- Undo / Redo(Ctrl+Z / Ctrl+Shift+Z)

## 快速开始

```bash
git clone https://github.com/<your-username>/wavedromgen.git
cd wavedromgen
npm install
npm run dev
```

浏览器打开 <http://localhost:5173> 即可使用。

## 部署

### 构建静态产物

```bash
npm run build
```

产物在 `dist/` 目录,是纯静态文件,可托管到任何静态服务器。

### 部署到 GitHub Pages

1. 仓库设置 → Pages → Source 选择 GitHub Actions
2. 参考以下 workflow(保存为 `.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

> 子路径托管时需在 `vite.config.ts` 中设置 `base: '/<repo-name>/'`。

### 其他托管方式

`dist/` 可直接部署到 Netlify / Vercel / Cloudflare Pages,或任何支持静态文件的 Web 服务器。

## JSON 数据格式

界面内置"字段手册"按钮查看完整字段说明。核心结构:

```json
{
  "config": { "totalCycles": 8, "grid": 0.1, "head": "标题", "foot": "" },
  "signal": [
    { "name": "clk", "type": "clock", "color": "#000000", "freeMode": false,
      "transitions": [], "period": 100 },
    { "name": "req", "type": "bit", "color": "#000000", "freeMode": false,
      "transitions": [ { "t": 0, "value": "0" }, { "t": 300, "value": "1" } ] },
    { "name": "data", "type": "bus", "color": "#000000", "freeMode": true,
      "transitions": [ { "t": 200, "value": "0x2F" }, { "t": 500, "value": "0xA1" } ] }
  ],
  "annotations": [ { "id": "a1", "row": 0, "t": 250, "text": "注意", "color": "#A32D2D", "size": 11 } ]
}
```

- 时间单位为 **tick,100 tick = 1 周期**(整数存储,`grid` 为吸附精度)
- `value` 支持完整 wave 语义:`0/1` 电平、`z` 高阻、`x` 不定态、`u/d` 箭头、任意文本 = bus 数据值
- `freeMode: true` 的信号可落在任意网格位置,否则只能整周期边沿

## 开发

```bash
npx tsc --noEmit   # 类型检查
npm run build      # 生产构建(输出 dist/)
```

冒烟测试(渲染回归,断言输出 SVG 无 NaN、XML 属性值已转义):

```bash
npx esbuild src/test-scene.ts --bundle --format=cjs --platform=node | node
```

测试脚本会在 `out/` 目录生成样例 SVG,可用浏览器打开目检风格。

## 路线图

- [ ] WaveJSON 兼容导出(按最近边沿取整)
- [ ] `|` gap 字符渲染
- [ ] node / edge 箭头标注
- [ ] 官方皮肤砖块像素级精修

## 致谢

视觉规格与文件格式受 [WaveDrom](https://github.com/wavedrom/wavedrom) 项目启发,布局常量与皮肤几何按其 v3 默认皮肤逆向复刻,感谢 WaveDrom 作者的开源工作。

## License

[MIT](./LICENSE)
