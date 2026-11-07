// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの地に白いカード、点字の2マス「テン」（テ＝①②③④⑤、ン＝③⑤⑥）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
// 点の位置：左の列が上から①②③、右の列が④⑤⑥
const cell = (x, dots) => [1, 2, 3, 4, 5, 6].map((d) => { const cx = x + (d > 3 ? 14 : 0), cy = 30 + ((d - 1) % 3) * 16;
  return dots.includes(d) ? `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#1f2a44"/>` : `<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="#1f2a4455" stroke-width="1.4"/>`; }).join("");
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f3eee4"/>
      <rect x="14" y="14" width="72" height="72" rx="10" fill="#fff" stroke="#1f2a44" stroke-width="3"/>
      ${cell(24, [1, 2, 3, 4, 5])}${cell(62, [3, 5, 6])}</svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
