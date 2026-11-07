// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const cell = (dots) => `<div style="display:grid;grid-template-columns:repeat(2,44px);grid-template-rows:repeat(3,44px);gap:14px 18px;padding:18px 22px;border:3px solid #1f2a4426;border-radius:20px;background:#fffdf7">${[1, 4, 2, 5, 3, 6].map((d) => dots.includes(d) ? '<i style="display:block;border-radius:50%;background:#1f2a44"></i>' : '<i style="display:block;border-radius:50%;border:3px dotted #1f2a4466;margin:9px"></i>').join("")}</div>`;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:56px 64px;background:#f3eee4;color:#1f2a44;display:flex;gap:48px;align-items:center">
    <div style="flex:1">
      <div style="font-size:32px;color:#86291a;letter-spacing:.06em">この点字、なんて読む？</div>
      <div style="font-size:120px;font-weight:900;margin-top:8px;color:#142a52;line-height:1.1">点字<span style="color:#b8402a">よみ</span></div>
      <div style="font-size:36px;margin-top:20px;line-height:1.5">6つの点のきまりを見つける1日5問<br>清音・濁音・拗音・数字</div>
    </div>
    <div style="width:420px;display:flex;flex-direction:column;gap:16px;align-items:stretch">
      <div style="background:#fff;border:3px solid #1f2a4426;border-radius:24px;padding:22px;display:flex;justify-content:center;box-shadow:0 10px 30px #1f2a4422">${cell([1, 2, 3, 4])}</div>
      <div style="background:#fffdf8;border:3px dashed #142a52;border-radius:18px;padding:12px 20px;font-size:30px;color:#4f566a;text-decoration:line-through">✕ テ</div>
      <div style="background:#eef7f0;border:4px solid #25734a;border-radius:18px;padding:12px 20px;font-size:30px;font-weight:700;color:#174f31">✓ ネ（①②③④）</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
