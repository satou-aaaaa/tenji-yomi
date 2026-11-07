// 点字よみの検査。問題の作り方（3つの難しさ×種類×何千問）・点が別に持った点字の表と合うか・正しい読みが1つだけか・今日の5問と上級の組み方（3年分）・
// とことんの並び（何百回）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・点字帳・実績・カレンダー・あとから・古いタブ・
// 出典・スマホ幅・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const req = createRequire(import.meta.url);
const G = req(path.join(root, "gen.js"));

// ---- 1. 問題の作り方（ブラウザを使わない）----
// 点字の表を gen.js と別に持ち（手引 第4章・全視情協・日本点字委員会の表から書き写したもの）、問題の点を読み直す
const T1 = { ア: "1", イ: "12", ウ: "14", エ: "124", オ: "24", カ: "16", キ: "126", ク: "146", ケ: "1246", コ: "246", サ: "156", シ: "1256", ス: "1456", セ: "12456", ソ: "2456",
  タ: "135", チ: "1235", ツ: "1345", テ: "12345", ト: "2345", ナ: "13", ニ: "123", ヌ: "134", ネ: "1234", ノ: "234", ハ: "136", ヒ: "1236", フ: "1346", ヘ: "12346", ホ: "2346",
  マ: "1356", ミ: "12356", ム: "13456", メ: "123456", モ: "23456", ヤ: "34", ユ: "346", ヨ: "345", ラ: "15", リ: "125", ル: "145", レ: "1245", ロ: "245", ワ: "3", ヲ: "35", ン: "356", ッ: "2", ー: "25" };
const DG = { 1: "1", 2: "12", 3: "14", 4: "145", 5: "15", 6: "124", 7: "1245", 8: "125", 9: "24", 0: "245" };
const DAKU = { ガ: "カ", ギ: "キ", グ: "ク", ゲ: "ケ", ゴ: "コ", ザ: "サ", ジ: "シ", ズ: "ス", ゼ: "セ", ゾ: "ソ", ダ: "タ", ヂ: "チ", ヅ: "ツ", デ: "テ", ド: "ト", バ: "ハ", ビ: "ヒ", ブ: "フ", ベ: "ヘ", ボ: "ホ" };
const HANDA = { パ: "ハ", ピ: "ヒ", プ: "フ", ペ: "ヘ", ポ: "ホ" };
const SMALL = { ャ: "ア", ュ: "ウ", ョ: "オ" };
// かな（点字の書き方のかな）→ 点の文字列の並び。数字は数符③④⑤⑥を1回だけ前に置く
function enc(t) {
  if (/^\d+$/.test(t)) return ["3456", ...[...t].map((d) => DG[d])];
  const a = [...t], out = [];
  for (let i = 0; i < a.length; i++) {
    const c = a[i], nx = a[i + 1];
    let base = c, pre = "";
    if (DAKU[c]) { base = DAKU[c]; pre = "5"; } else if (HANDA[c]) { base = HANDA[c]; pre = "6"; }
    if (SMALL[nx]) { // 拗音：④（拗濁音④⑤・拗半濁音④⑥）＋ その行の ア・ウ・オ段
      const row = { キ: "カ", シ: "サ", チ: "タ", ニ: "ナ", ヒ: "ハ", ミ: "マ", リ: "ラ" }[base]; if (!row) return null;
      const col = { ア: 0, ウ: 2, オ: 4 }[SMALL[nx]], rowK = { カ: "カキクケコ", サ: "サシスセソ", タ: "タチツテト", ナ: "ナニヌネノ", ハ: "ハヒフヘホ", マ: "マミムメモ", ラ: "ラリルレロ" }[row];
      out.push(pre === "5" ? "45" : pre === "6" ? "46" : "4", T1[rowK[col]]); i++; continue;
    }
    if (!T1[base]) return null;
    if (pre) out.push(pre); out.push(T1[base]);
  }
  return out;
}
const cellStr = (cells) => cells.map((c) => c.slice().sort().join(""));
{
  const bad = [], keys = [new Set(), new Set(), new Set()], N = 3000;
  for (const id of G.KIND_IDS) {
    const lv = G.K[id].lv;
    for (let s = 0; s < N; s++) {
      const tag = `${lv}:${id}|qa${s}`, P = G.make(tag), why = [];
      if (!P) { bad.push(tag + " 作れない"); continue; }
      const ts = P.choices.map((c) => c.t), cs = JSON.stringify(cellStr(P.cells));
      if (P.choices.length !== 4) why.push(`選び肢が${P.choices.length}つ`);
      if (P.choices.filter((c) => c.ok).length !== 1 || !P.choices[P.ans] || !P.choices[P.ans].ok || P.choices[P.ans].t !== P.ok) why.push("正しいのが1つでない");
      if (new Set(ts).size !== ts.length) why.push("同じ読みが2つ");
      if (JSON.stringify(enc(P.ok)) !== cs) why.push(`点が表と合わない ${P.ok}`);
      if (P.choices.some((c) => !c.ok && JSON.stringify(enc(c.t)) === cs)) why.push("まちがいの読みが同じ点になる");
      if (P.choices.some((c) => !c.ok && (!c.why || /\{|undefined/.test(c.why)))) why.push("まちがいの理由が無い");
      if (P.choices.some((c) => !c.ok && enc(c.t) && !c.why.includes(enc(c.t).map((d) => [...d].map((n) => "①②③④⑤⑥"[n - 1]).join("")).join("・")))) why.push("まちがいの理由の点が表と合わない");
      if ([P.rule, P.how, ...ts].some((x) => typeof x !== "string" || /undefined|NaN|null|\{|\}/.test(x))) why.push("文がおかしい");
      if (P.cells.length < 1 || P.cells.length > 6) why.push("マスの数");
      if (JSON.stringify(G.make(tag)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      keys[lv].add(P.key);
      if (why.length && bad.length < 5) bad.push(tag + " " + why.join("・"));
    }
  }
  check(`問題：${G.KIND_IDS.length}種類×${3000}問で、点が別に持った点字の表と合い・正しい読みがちょうど1つ・選び肢4つ・まちがいの読みは別の点`, bad.length === 0, bad.join(" / "));
  check("問題の組み合わせは難しさごとに100通りより多い（同じ問題ばかりにならない）", keys.every((k) => k.size > 100), keys.map((k) => k.size).join(","));
  check("点字の表の46字を、gen.js がすべて同じ点で書く", Object.entries(T1).every(([k, v]) => JSON.stringify(cellStr(G.spell(k))) === JSON.stringify([v])), Object.entries(T1).filter(([k, v]) => JSON.stringify(cellStr(G.spell(k))) !== JSON.stringify([v])).map((x) => x[0]).join(","));
  check("ことばは表のかなだけで書け、意味（ふつうの書き方）がある", G.WORDS.every((w) => enc(w[0]) && w[1]), G.WORDS.filter((w) => !enc(w[0]) || !w[1]).map((w) => w[0]).join(","));
  check("のばす音は長音符で書く（ウ列・オ列の「う」をそのまま書かない例：ガッコー）", G.WORDS.some((w) => w[0] === "ガッコー") && !G.WORDS.some((w) => /[コソトノホモヨロゴゾドボポ]ウ$|[クスツヌフムユルグズヅブプ]ウ$/.test(w[0])));
  check("Unicode の点字（U+2800〜）は点の番号どおり", G.uni([[1]]) === "⠁" && G.uni([[3, 4, 5, 6], [1, 2]]) === "⠼⠃" && G.uni([[5], [1, 6]]) === "⠐⠡");
  check("出典は文部科学省・全視情協・日本点字委員会のページ", /^https:\/\/www\.mext\.go\.jp\//.test(G.SRC.u) && /^https:\/\/www\.naiiv\.net\//.test(G.SRC.u2) && /^https:\/\/www\.braille\.jp\//.test(G.SRC.u3) && Object.values(G.TYPES).every((t) => G.SRC[t.src]));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set();
  const d0 = Date.parse("2026-11-07");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const kinds = dl.map((t) => t.split(/[:|]/)[1]);
    if (dl.length !== 5 || dl.map((t) => t[0]).join() !== "0,0,1,1,2" || new Set(kinds).size !== 5 || dl.some((t) => !G.make(t))) bad.push(d + " 今日");
    if (hl.length !== 3 || hl.some((t) => t[0] !== "2" || !G.make(t)) || new Set(hl.map((t) => t.split(/[:|]/)[1])).size !== 3 || hl.some((t) => t.split(/[:|]/)[1] === kinds[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (i < 60) [...dl, ...hl].forEach((t) => cover.add(t.split(/[:|]/)[1]));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（3問、今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("ふた月のうちに、ほとんどの種類が出る", cover.size >= G.KIND_IDS.length - 2, cover.size + "種類");
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^(https?:)?\/\//.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", (html.match(/connect-src([^;"]*)/) || [])[1]?.trim() === "'self'");
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(gen.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("チケット・回数制限・鍵で開くモードを入れない（好きなだけ遊べる）", !/🎫|チケット|すると開く|🔒/.test(html + gen));
check("出典：3つの出典へのリンクを、このゲームについてと点字帳に出す", /SRCS/.test(html) && (html.match(/出典：\$\{SRCS\}/g) || []).length >= 2 && /点字学習指導の手引/.test(G.SRC.t));
check("画面の HTML に ${ が出ない書き方（'…' の中に ${ を書かない）", !/'[^'\n]*\$\{[^'\n]*'/.test(html.split("<script>").pop()));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="tenji-yomi" data-keys="tenji-v1"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/tenji-yomi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、取り直しで古い画面を入れず、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  { const st = await checkSwStall(sw); check("PWA：sw.js は本文の途中で通信が止まっても4秒で保存した画面を返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st)); }
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "点字よみ" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((rq, res) => {
  const p = decodeURIComponent(new URL(rq.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if ((f !== root && !f.startsWith(root + path.sep)) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const ansOf = (p) => p.evaluate(() => __kn.cur().P.ans);
const wrongOf = (p) => p.evaluate(() => { const c = __kn.cur(), g = __kn.goneOf(); return c.P.choices.map((_, j) => j).filter((j) => j !== c.P.ans && !c.wrong.includes(j) && !g.includes(j)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("tenji-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) { const w = (await wrongOf(p))[0]; if (w !== undefined) await p.click(`[data-j="${w}"]`); }
  await p.click(`[data-j="${await ansOf(p)}"]`);
  await p.waitForSelector(".verdict");
}

try {
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.click("#howto-ok");
  check("「わかった」を押したその場で遊び方を見た記録が残る", (await mem(p)).tut === true);
  {
    // Esc を押した直後に読み直しても出ない（close の知らせは遅れて届くので cancel でも残す。10回）
    let ok = 0;
    for (let i = 0; i < 10; i++) {
      const q = await newPage();
      await q.keyboard.press("Escape");
      if ((await mem(q)).tut === true) ok++;
      await q.context().close();
    }
    check("遊び方を Esc で閉じた直後に記録が残る（10回）", ok === 10, ok + "/10");
  }
  {
    const e = await newPage();
    await e.keyboard.press("Escape"); await e.waitForTimeout(100);
    const shut = await e.locator("#howto[open]").count() === 0;
    await e.reload(); await e.waitForTimeout(200);
    check("遊び方を Esc で閉じたあと、開き直しても遊び方が出ない", shut && await e.locator("#howto[open]").count() === 0 && (await mem(e)).tut === true);
    await e.context().close();
  }
  check("ホームに今日の見るところ・上級・とことん・練習が最初から出る（鍵なし）", (await p.textContent("#tip")).includes("今日の見るところ") && await p.locator("#go-h:not([disabled])").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-p").count() === 1);

  // 今日の5問：1問目はまちがえてから、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __kn.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：なかま・点字のマス（点の番号を読み上げる名前つき）・選び肢（名前つきで高さ44px以上）", await p.locator(".who b").count() === 1 && await p.locator(".card .cells[role=img]").count() === 1 && /^点字\dマス：[①②③④⑤⑥・]+$/.test(await p.getAttribute(".card .cells", "aria-label")) && await p.locator(".card .cell").count() === (await p.evaluate(() => __kn.cur().P.cells.length)) && await p.locator(".card .cell i").count() === 6 * (await p.evaluate(() => __kn.cur().P.cells.length)) && !(await p.getAttribute(".card .cells", "aria-label")).includes(await p.evaluate(() => __kn.cur().P.ok)) && await p.locator(".ch").count() >= 3 && (await p.$$eval(".ch", (b) => b.filter((x) => !x.getAttribute("aria-label") || x.getBoundingClientRect().height < 44).length)) === 0);
  const w0 = (await wrongOf(p))[0];
  await p.click(`[data-j="${w0}"]`);
  check("まちがえると「✕」の印・破線・取り消し線と、理由の知らせ（色だけで分けない）・role=status", await p.locator(".ch.bad").count() === 1 && (await p.textContent(".ch.bad .mk")) === "✕" && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.bad")).borderStyle)) === "dashed" && (await p.textContent("#msg")).startsWith("✕ ちがう：") && await p.getAttribute("#msg", "role") === "status");
  check("まちがえた言い方は押せなくなり、選び直せる", await p.locator(".ch.bad:disabled").count() === 1 && await p.locator(".ch:not(:disabled)").count() >= 2);
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（まちがえた印のまま）", await p.locator(".ch.bad").count() === 1 && await p.evaluate(() => __kn.cur().i) === 0);
  await solve(p);
  check("正しく読むと、読みが出て「✓」・きまり・点字のなかまの説明と出典のリンク・★2（まちがい1回）", (await p.textContent(".card .rd")).includes(await p.evaluate(() => __kn.cur().P.ok)) && (await p.textContent(".ch.good .mk")) === "✓" && (await p.textContent(".verdict")).includes("きまり：") && await p.locator(".verdict .src a[href^=https]").count() === 1 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  await p.click("#next");
  await p.click("#hint");
  const typeName = await p.evaluate(() => __kn.cur().P.typeName);
  check("ヒント1は点字のなかまと書き方のきまり（答えの読みは言わない）", (await p.textContent("#hintbox")).includes(typeName) && !(await p.evaluate(() => { const P = __kn.cur().P; return P.ok.length > 1 || /\d/.test(P.ok) ? document.querySelector("#hintbox").textContent.includes(P.ok) : false; })) && await p.locator(".ch.gone").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいを消して2つにしぼる・ヒントは2回まで", await p.locator(".ch:not(:disabled)").count() === 2 && await p.locator("#hint:disabled").count() === 1 && await p.locator(".ch.gone .mk").first().textContent() === "－");
  await solve(p);
  check("ヒント2回は★1（2回以上）", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に問題ごとのまちがい（1・2・0・0・0）・読んだ問題 5", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]" && s1.qs === 5);
  const share = await p.textContent(".share");
  const words = G.dailyTags(TODAY).flatMap((t) => { const P = G.make(t); return [P.ok, P.mean, G.uni(P.cells)].filter((n) => n && !/^\d+$/.test(n)); });
  check("シェアの文に問題と答えを出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !words.some((n) => share.includes(n)), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン・読んだ点字の一覧（小さなマスつき）", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1 && await p.locator(".rlist > div").count() === 5 && await p.locator(".rlist .cells.sm").count() === 5);
  check("点字帳に読んだ種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」", (await p.textContent("#go-d")).includes("結果"));
  // 上級：ヒントなし・3問・むずかしい
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問・むずかしい", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __kn.load().runs.h.list.length)) === 3 && (await p.evaluate(() => __kn.cur().P.lv)) === 2);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="1"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（点字帳・読んだ問題はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && after.qs === before.qs + 5 && after.recent.length === 5);
  // 点字帳：集めたきまりは中身、まだのものは中身を出さない
  await p.click("#back"); await p.click("#go-dex");
  const nk = await p.locator(".bk[data-id]").count();
  check("点字帳：集めたきまりは点の番号、まだのものは中身を出さない・6つのなかまの説明と3つの出典", nk >= 5 && /[①②③④⑤⑥]/.test(await p.textContent(".bk[data-id] b")) && await p.locator(".bk.no").count() === G.KIND_IDS.length - nk && await p.locator(".types li").count() === 6 && await p.locator(".src a").count() === 3);
  // とことん：まちがえても終わらない・ヒントも何度でも・ここで降りるで終わる
  await p.click("#back"); await p.click("#go-e");
  check("とことんは、鍵もライフも無く始まる", await p.evaluate(() => __kn.load().runs.e.list.length) >= 18 && !(await p.textContent("header")).match(/🌸|🎫|❤/));
  await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("とことん：まちがい2回・ヒント2回でも終わらず続く", await p.locator(".card").count() === 1 && await p.evaluate(() => __kn.cur().i) === 3);
  await p.reload(); await p.waitForTimeout(150);
  check("とことんは開き直すと続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e"); await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、まちがいなしの数が自己ベストに残る（1問）", (await mem(p)).ebest === 1 && (await p.textContent("#eres")).includes("3問") && !(await mem(p)).runs.e);
  await p.click("#back"); await p.click("#go-e"); await solve(p);
  check("とことん：読み終えた直後でも「ここで降りる」で終われる（数も今の問題まで）", (await p.textContent("#quit")).includes("1問") && (await p.click("#quit"), await p.waitForTimeout(150), (await p.textContent("#eres")).includes("1問")));
  {
    // とことんは使い切る前に、むずかしいを20問ずつ足して終わらない
    const r = await p.evaluate(() => { const s = __kn.load(); s.runs.e = { mode: "e", date: __kn.todayKey(), id: "t", list: __kn.endlessList([]), res: [], cur: null, clean: 0, t0: 1 }; s.runs.e.res = s.runs.e.list.slice(0, s.runs.e.list.length - 2).map(() => ({ m: 0 })); localStorage.setItem("tenji-v1", JSON.stringify(s)); __kn.play("e"); return __kn.load().runs.e.list.length; });
    check("とことんは終わらない（残りが少なくなったら20問足す）", r >= 40, r);
    await p.click("#quit"); await p.waitForTimeout(100);
  }
  {
    const bad = await p.evaluate((d) => { const k = "tenji-v1", o = JSON.parse(localStorage.getItem(k)); const keepS = localStorage.getItem(k);
      o.days[d] = { m: [] }; o.hdays[d] = { m: [0, 0] }; o.runs.x = { date: d, id: "z", list: [], res: [] }; o.runs.y = { mode: "d", date: d, id: "z", list: ["0:ka|a"], res: [{ m: 0 }, { m: 0 }] }; o.runs.z = { mode: "d", date: d, id: "z", list: ["0:constructor|a"], res: [] }; o.runs.w = { mode: "d", date: d, id: "z", list: ["1:ka|a"], res: [] };
      localStorage.setItem(k, JSON.stringify(o)); const s = __kn.load(); localStorage.setItem(k, keepS);
      return [!s.days[d] || s.days[d].m.length === 5, !s.hdays[d], !s.runs.x, !s.runs.y, !s.runs.z, !s.runs.w]; }, dayBefore(20));
    check("引き継ぎ：問題の数と合わない結果・mode の無い回・知らない種類・難しさのちがう回は読まない", bad.every(Boolean), JSON.stringify(bad));
  }
  {
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("tenji-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.qs = '"><b id="xss2">'; s.dex = { ka: '"><i id="xss3">', "<x>": 3 }; s.recent = [{ a: 1 }]; s.runs = { e: { mode: "e", id: "x", date: "2026-11-07", list: ["0:ka|1"], res: [], life: 2, cur: { i: 0, tag: "0:ka|1", wrong: ['"><s id="xss5">'], hints: 0 } }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["9:ka|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["0:ka|1"], res: [] } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("tenji-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __kn.load());
    check("記録の形を直す：数の所の文字は0に・知らない種類・形のちがう途中経過と日ごとの記録は捨てる・前の版のライフは読まない", st.ebest === 0 && st.qs === 0 && st.dex.ka === 0 && !("<x>" in st.dex) && st.recent.length === 0 && st.runs.e && st.runs.e.cur === null && !("life" in st.runs.e) && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3, #xss5").count() === 0);
    await q.context().close();
  }
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 2);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：点字のしくみ・6つのなかま・扱わないもの（わかち書き・記号）・3つの出典のリンク", (await p.textContent("#about")).includes("6つの点") && (await p.textContent("#about")).includes("拗音") && (await p.textContent("#about")).includes("わかち書き") && await p.locator("#about .src a").count() === 3);
  await p.context().close();

  // 全部まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいゼロ"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // とことん・練習の並び：何百回作っても、1回の中で同じ問題が出ない・続けて同じ種類が出ない・最近の問題を避ける
  {
    const q = await newPage(); await closeHow(q);
    const r = await q.evaluate(() => { let dup = 0, sameK = 0, len = 1e9, hitRecent = 0; const recent = __kn.endlessList([]).slice(0, 20).map((t) => __kn.G.make(t).key);
      for (let n = 0; n < 300; n++) { const L = __kn.endlessList(recent), keys = L.map((t) => __kn.G.make(t).key); len = Math.min(len, L.length); if (new Set(keys).size !== keys.length) dup++; for (let i = 1; i < L.length; i++) if (L[i].split(/[:|]/)[1] === L[i - 1].split(/[:|]/)[1]) sameK++; hitRecent += keys.filter((k) => recent.includes(k)).length; }
      return { dup, sameK, len, hitRecent }; });
    check("とことんの並びを300回作って、1回の中で同じ問題なし・続けて同じ種類なし・最近の問題を出さない・20問", r.dup === 0 && r.sameK === 0 && r.hitRecent === 0 && r.len === 20, JSON.stringify(r));
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る
  {
    const q = await newPage();
    await q.evaluate(([d2, d3]) => { localStorage.setItem("tenji-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0] }, [d3]: { m: [1, 0, 0, 2, 0] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0, qs: 0, recent: [] })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __kn.lateDays(__kn.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    if (lateList.length) {
      const d = lateList[0];
      if (!(await q.locator(`.cal .miss[data-k="${d}"]`).count())) await q.click("#prev");
      await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __kn.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：第1回の日（2026-11-07）より後に取りこぼした日が無いうちは、押せる日が出ない", (await q.locator(".cal .miss").count()) === 0);
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で終えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    const ans = await ansOf(b);
    await solve(a);
    await b.click(`[data-j="${ans}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題を押しても二重に数えない", s.runs.d.res.length === 1 && s.qs === 1);
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    await ctx.close();
  }

  // スマホ幅でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const w of [320, 390]) {
      const q = await newPage(w); await closeHow(q);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e", "#go-p"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320pxでも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ・幅44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }
  {
    // マスの多い問題でも幅320pxでマスと選び肢がはみ出さない（全部の種類）
    const q = await newPage(320); await closeHow(q);
    const over = [];
    for (const id of G.KIND_IDS) {
      const tag = `${G.K[id].lv}:${id}|wide`;
      await q.evaluate((t) => { const s = __kn.load(); s.runs.p = { mode: "p", date: __kn.todayKey(), id: "w", list: [t], res: [], cur: null, t0: 1 }; localStorage.setItem("tenji-v1", JSON.stringify(s)); __kn.play("p"); }, tag);
      const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (ov > 0) over.push(id);
    }
    check("全部の種類の問題が、幅320pxではみ出さない", over.length === 0, over.join(","));
    await q.context().close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    await q.focus(`[data-j="${await ansOf(q)}"]`); await q.keyboard.press("Enter");
    await q.waitForTimeout(100);
    check("キーボードだけで読み方を選べる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "tenji-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { m: [0, 1, 0, 0, 2] } }, hdays: {}, adays: {}, dex: { ka: 2, han: 1, word: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, qs: 12, recent: [], t: 1 }) };
  await checkTransfer({ browser, url, game: "tenji-yomi", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
  { const c = await browser.newContext(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 点字よみ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
