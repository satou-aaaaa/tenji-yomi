// 点字よみの問題を作る（ブラウザと node の両方で使う）。
// 1問は「点字のマス（1〜数マス）」と「4つの読み」。正しいのは必ず1つ。
// 点の並びは、文部科学省『点字学習指導の手引（令和5年改訂版）』第4章と、全国視覚障害者情報提供施設協会「点字について」で確かめたものだけを使う。
// 1マスは6つの点：左の列が上から①②③、右の列が上から④⑤⑥（読む面から見た向き）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag（"難しさ:種類|種"）なら、どの端末でも同じ問題になる。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const SRC = {
    t: "文部科学省『点字学習指導の手引（令和5年改訂版）』第4章",
    u: "https://www.mext.go.jp/content/20231116-mxt_tokubetu01-000032539_16.pdf",
    t2: "全国視覚障害者情報提供施設協会「点字について」",
    u2: "https://www.naiiv.net/zensijokyo/tenji/",
    t3: "日本点字委員会「点字を読んでみよう」",
    u3: "https://www.braille.jp/topics/yonndemiyo.html",
  };
  // ---- 1マスの字（清音・ヤ行・ワ行・ン・促音・長音）----
  const V = { ア: [1], イ: [1, 2], ウ: [1, 4], エ: [1, 2, 4], オ: [2, 4] }; // 母音
  const ROWC = { ア: [], カ: [6], サ: [5, 6], タ: [3, 5], ナ: [3], ハ: [3, 6], マ: [3, 5, 6], ラ: [5] }; // 行の点（母音に足す）
  const ROWS = { ア: "アイウエオ", カ: "カキクケコ", サ: "サシスセソ", タ: "タチツテト", ナ: "ナニヌネノ", ハ: "ハヒフヘホ", マ: "マミムメモ", ラ: "ラリルレロ" };
  const VOW = "アイウエオ";
  const ONE = {};
  for (const r in ROWS) [...ROWS[r]].forEach((k, i) => { ONE[k] = [...V[VOW[i]], ...ROWC[r]].sort((a, b) => a - b); });
  Object.assign(ONE, { ヤ: [3, 4], ユ: [3, 4, 6], ヨ: [3, 4, 5], ワ: [3], ヲ: [3, 5], ン: [3, 5, 6], ッ: [2], ー: [2, 5] });
  // 前置点（前に置くマス）
  const PRE = { dak: [5], han: [6], you: [4], youd: [4, 5], youh: [4, 6], num: [3, 4, 5, 6] };
  const DAK = { ガ: "カ", ギ: "キ", グ: "ク", ゲ: "ケ", ゴ: "コ", ザ: "サ", ジ: "シ", ズ: "ス", ゼ: "セ", ゾ: "ソ", ダ: "タ", ヂ: "チ", ヅ: "ツ", デ: "テ", ド: "ト", バ: "ハ", ビ: "ヒ", ブ: "フ", ベ: "ヘ", ボ: "ホ" };
  const HAN = { パ: "ハ", ピ: "ヒ", プ: "フ", ペ: "ヘ", ポ: "ホ" };
  // 拗音：拗音符④＋同じ行のア・ウ・オ段の字（きゃ＝④＋カ）
  const YROW = { キ: "カ", シ: "サ", チ: "タ", ニ: "ナ", ヒ: "ハ", ミ: "マ", リ: "ラ", ギ: "ガ", ジ: "ザ", ヂ: "ダ", ビ: "バ", ピ: "パ" };
  const SMALL = { ャ: 0, ュ: 2, ョ: 4 };
  const DIGIT = { 1: [1], 2: [1, 2], 3: [1, 4], 4: [1, 4, 5], 5: [1, 5], 6: [1, 2, 4], 7: [1, 2, 4, 5], 8: [1, 2, 5], 9: [2, 4], 0: [2, 4, 5] };

  // 読み（カタカナ）→ マスの並び。数字は「数符＋数字」。書けない読みは null
  function spell(s) {
    s = String(s);
    if (/^[0-9]+$/.test(s)) return [PRE.num, ...[...s].map((d) => DIGIT[d])];
    const out = [], a = [...s];
    for (let i = 0; i < a.length; i++) {
      const c = a[i], nx = a[i + 1];
      if (nx in SMALL && YROW[c]) {
        const row = YROW[c];
        const plain = DAK[row] || HAN[row] || row, k = ROWS[plain][SMALL[nx]];
        out.push(DAK[row] ? PRE.youd : HAN[row] ? PRE.youh : PRE.you, ONE[k]); i++; continue;
      }
      if (ONE[c]) out.push(ONE[c]);
      else if (DAK[c]) out.push(PRE.dak, ONE[DAK[c]]);
      else if (HAN[c]) out.push(PRE.han, ONE[HAN[c]]);
      else return null;
    }
    return out;
  }
  const NUM = "①②③④⑤⑥";
  const dots = (cell) => (cell.length ? cell.map((d) => NUM[d - 1]).join("") : "（点なし）");
  const dotsAll = (cells) => cells.map(dots).join("・");
  const uni = (cells) => cells.map((c) => String.fromCharCode(0x2800 + c.reduce((s, d) => s + (1 << (d - 1)), 0))).join("");
  const sameCells = (a, b) => !!a && !!b && a.length === b.length && a.every((c, i) => c.join() === b[i].join());

  // 種類（点字帳のまとまり）
  const TYPES = {
    sei: { name: "清音", src: "u2", def: "母音の点（①②④の組み合わせ）に、行の点（③⑤⑥）を足して1マスで書く" },
    yw: { name: "ヤ行・ワ行・ン・ッ・ー", src: "u", def: "ヤ行とワ行は母音の形を下へずらした特別な形。ンは③⑤⑥、促音ッは②、長音ーは②⑤" },
    dak: { name: "濁音・半濁音", src: "u", def: "濁音は濁音符⑤、半濁音は半濁音符⑥を前に置き、2マスで書く" },
    you: { name: "拗音", src: "u", def: "拗音符④を前に置き、同じ行のア・ウ・オ段の字を続ける（きゃ＝④＋カ）。拗濁音は④⑤、拗半濁音は④⑥" },
    num: { name: "数字", src: "u3", def: "数符③④⑤⑥を前に1回だけ置き、続く数字は1＝①、2＝①②…のマスで書く" },
    word: { name: "ことば", src: "u", def: "点字は音のとおりにかなで書く。ウ列・オ列をのばす音（がっこう）は長音符ーで書く" },
  };

  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const shuffle = (R, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const vowelOf = (k) => { for (const r in ROWS) { const i = ROWS[r].indexOf(k); if (i >= 0) return VOW[i]; } return ""; };
  const rowOf = (k) => { for (const r in ROWS) if (ROWS[r].includes(k)) return r; return ""; };

  // ---- 種類ごとの作り方。返すのは { ok: 読み, ng: [まちがいの読み…], how: 答え合わせの一言 } ----
  const K = {};
  const def = (id, lv, type, name, f) => { K[id] = { id, lv, type, name, f }; };
  // 清音：同じ行のほかの段と、同じ段のほかの行をまぜる
  function seiQ(R, row, pool) {
    const ok = pick(R, [...ROWS[row]]), v = vowelOf(ok);
    const same = shuffle(R, [...ROWS[row]].filter((k) => k !== ok)).slice(0, 2);
    const other = shuffle(R, pool.filter((r) => r !== row).map((r) => ROWS[r][VOW.indexOf(v)]))[0];
    const how = row === "ア" ? `母音「${ok}」は ${dots(V[v])}` : `母音「${v}」の ${dots(V[v])} に、${row}行の ${dots(ROWC[row])} を足す`;
    return { ok, ng: [...same, other], how };
  }
  const P0 = ["ア", "カ", "サ", "タ", "ナ"], P1 = ["ア", "カ", "サ", "タ", "ナ", "ハ", "マ", "ラ"];
  def("a", 0, "sei", "ア行（母音）", (R) => seiQ(R, "ア", P0));
  def("ka", 0, "sei", "カ行", (R) => seiQ(R, "カ", P0));
  def("sa", 0, "sei", "サ行", (R) => seiQ(R, "サ", P0));
  def("ta", 0, "sei", "タ行", (R) => seiQ(R, "タ", P0));
  def("na", 0, "sei", "ナ行", (R) => seiQ(R, "ナ", P0));
  def("ha", 1, "sei", "ハ行", (R) => seiQ(R, "ハ", P1));
  def("ma", 1, "sei", "マ行", (R) => seiQ(R, "マ", P1));
  def("ra", 1, "sei", "ラ行", (R) => seiQ(R, "ラ", P1));
  const YW = "ヤユヨワヲンッー", YWHOW = { ヤ: "ヤ行は特別な形", ユ: "ヤ行は特別な形", ヨ: "ヤ行は特別な形", ワ: "ワは③だけ", ヲ: "ヲは③⑤", ン: "ンは③⑤⑥", ッ: "促音（小さいッ）は②", ー: "長音（のばす音）は②⑤" };
  def("yw", 1, "yw", "ヤ行・ワ行・ン・ッ・ー", (R) => { const ok = pick(R, [...YW]); return { ok, ng: shuffle(R, [...YW].filter((k) => k !== ok)).slice(0, 3), how: YWHOW[ok] }; });
  // 濁音：前置点を見落とした読み（清音）もまちがいに入れる
  def("dak", 1, "dak", "濁音", (R) => { const ok = pick(R, Object.keys(DAK)), base = DAK[ok], row = rowOf(base);
    const sameRow = shuffle(R, Object.keys(DAK).filter((k) => k !== ok && rowOf(DAK[k]) === row)).slice(0, 1);
    const half = Object.keys(HAN).find((k) => HAN[k] === base);
    return { ok, ng: [base, ...sameRow, half || shuffle(R, Object.keys(DAK).filter((k) => k !== ok && vowelOf(DAK[k]) === vowelOf(base) && rowOf(DAK[k]) !== row))[0]], how: `濁音符 ⑤ ＋「${base}」` }; });
  def("han", 1, "dak", "半濁音", (R) => { const ok = pick(R, Object.keys(HAN)), base = HAN[ok], d = Object.keys(DAK).find((k) => DAK[k] === base);
    return { ok, ng: [base, d, shuffle(R, Object.keys(HAN).filter((k) => k !== ok))[0]], how: `半濁音符 ⑥ ＋「${base}」` }; });
  // 数字（1けた）：数符を見落とした読み（同じ形のかな）もまちがいに入れる
  const SAMEK = { 1: "ア", 2: "イ", 3: "ウ", 4: "ル", 5: "ラ", 6: "エ", 7: "レ", 8: "リ", 9: "オ", 0: "ロ" };
  def("num", 1, "num", "数字", (R) => { const ok = String(Math.floor(R() * 10)); const others = shuffle(R, "0123456789".split("").filter((d) => d !== ok)).slice(0, 2);
    return { ok, ng: [...others, SAMEK[ok]], how: `数符 ③④⑤⑥ ＋ ${ok}（${SAMEK[ok]}と同じ形）` }; });
  // むずかしい：拗音・拗濁音・ことば・2〜3けたの数
  const YOU = ["キ", "シ", "チ", "ニ", "ヒ", "ミ", "リ"], YOUD = ["ギ", "ジ", "ヂ", "ビ", "ピ"], SM = ["ャ", "ュ", "ョ"];
  def("you", 2, "you", "拗音", (R) => { const c = pick(R, YOU), s = pick(R, SM), ok = c + s, k = ROWS[YROW[c]][SMALL[s]];
    const ng = [...SM.filter((x) => x !== s).map((x) => c + x).slice(0, 1), k, pick(R, YOU.filter((x) => x !== c)) + s];
    return { ok, ng, how: `拗音符 ④ ＋「${k}」（${c}の行の${"アウオ"[SM.indexOf(s)]}段）` }; });
  def("youd", 2, "you", "拗濁音・拗半濁音", (R) => { const c = pick(R, YOUD), s = pick(R, SM), ok = c + s, row = YROW[c], plain = DAK[row] || HAN[row], k = ROWS[plain][SMALL[s]];
    const clear = DAK[c] || HAN[c];
    const ng = [clear + s, ...SM.filter((x) => x !== s).map((x) => c + x).slice(0, 1), DAK[row] ? row : HAN[row] ? row : k];
    return { ok, ng, how: `${HAN[row] ? "拗半濁音符 ④⑥" : "拗濁音符 ④⑤"} ＋「${k}」` }; });
  // ことば（読みは点字の書き方。ウ列・オ列をのばす音は ー）
  const WORDS = [
    ["サクラ", "桜"], ["ネコ", "ねこ"], ["イヌ", "いぬ"], ["ミカン", "みかん"], ["ツクエ", "机"], ["ハナビ", "花火"], ["カバン", "かばん"], ["エンピツ", "えんぴつ"],
    ["キッテ", "切手"], ["ガッコー", "学校"], ["ギューニュー", "牛乳"], ["ケーキ", "ケーキ"], ["ノート", "ノート"], ["トケイ", "時計"], ["デンワ", "電話"], ["ヤサイ", "野菜"],
    ["オチャ", "お茶"], ["キシャ", "汽車"], ["リンゴ", "りんご"], ["タマゴ", "卵"], ["メガネ", "めがね"], ["ラッパ", "ラッパ"], ["ポスト", "ポスト"], ["フネ", "船"],
    ["ユキ", "雪"], ["ソラ", "空"], ["ウミ", "海"], ["ヤマ", "山"], ["カワ", "川"], ["ホシ", "星"], ["マド", "窓"], ["ヒコーキ", "飛行機"],
    ["ジテンシャ", "自転車"], ["シンブン", "新聞"], ["チズ", "地図"], ["オカアサン", "お母さん"], ["オトーサン", "お父さん"], ["センセイ", "先生"], ["トモダチ", "友だち"], ["キョー", "今日"],
  ];
  // 1字だけ変えた読み（同じ行のほかの段・同じ段のほかの行）を作る
  function nearWords(R, w, n) {
    const a = [...w], all = [];
    const near = (k) => {
      if (rowOf(k)) { const row = rowOf(k), v = vowelOf(k); return [...[...ROWS[row]].filter((x) => x !== k), ...Object.keys(ROWS).filter((r) => r !== row).map((r) => ROWS[r][VOW.indexOf(v)])]; }
      if (DAK[k]) { const b = DAK[k]; return [b, ...Object.keys(DAK).filter((x) => x !== k && (rowOf(DAK[x]) === rowOf(b) || vowelOf(DAK[x]) === vowelOf(b)))]; }
      if (HAN[k]) return [HAN[k], ...Object.keys(HAN).filter((x) => x !== k)];
      return [];
    };
    a.forEach((k, i) => {
      if (k in SMALL) { for (const c of Object.keys(SMALL).filter((x) => x !== k)) { const b = a.slice(); b[i] = c; all.push(b.join("")); } return; }
      if (a[i + 1] in SMALL) { const grp = (DAK[k] || HAN[k]) ? ["ギ", "ジ", "ビ", "ピ"] : ["キ", "シ", "チ", "ニ", "ヒ", "ミ", "リ"]; for (const c of grp.filter((x) => x !== k)) { const b = a.slice(); b[i] = c; all.push(b.join("")); } return; }
      for (const c of near(k)) { const b = a.slice(); b[i] = c; const s = b.join(""); if (s !== w && spell(s) && !all.includes(s)) all.push(s); } });
    // 1つの字ばかり変えないよう、場所ごとに順番に取る
    const byPos = a.map((_, i) => shuffle(R, all.filter((s) => [...s][i] !== a[i] && [...s].length === a.length)));
    const out = [];
    for (const i of shuffle(R, a.map((_, j) => j))) { const c = byPos[i].find((s) => !out.includes(s)); if (c) out.push(c); if (out.length >= n) break; }
    for (const s of shuffle(R, all)) { if (out.length >= n) break; if (!out.includes(s)) out.push(s); }
    return out;
  }
  def("word", 2, "word", "ことば", (R) => { const [ok, mean] = pick(R, WORDS); return { ok, ng: nearWords(R, ok, 3), how: `「${mean}」は点字で「${ok}」と書く`, mean }; });
  def("num2", 2, "num", "数（2〜3けた）", (R) => { const ok = String(10 + Math.floor(R() * 990)), a = [...ok], out = [];
    for (const i of shuffle(R, a.map((_, j) => j))) { const b = a.slice(); b[i] = String((+a[i] + 1 + Math.floor(R() * 9)) % 10); const s = b.join(""); if (s[0] !== "0" && s !== ok && !out.includes(s)) out.push(s); if (out.length >= 3) break; }
    while (out.length < 3) { const s = String(10 + Math.floor(R() * 990)); if (s !== ok && !out.includes(s)) out.push(s); }
    return { ok, ng: out, how: "数符は数字の前に1回だけ。続くマスはどれも数字" }; });
  const KIND_IDS = Object.keys(K);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は "難しさ:種類|種"（例 "0:ka|2026-11-07:d0"）
  function make(tag) {
    const m = /^([0-2]):([a-z0-9]+)\|(.+)$/.exec(String(tag));
    if (!m || !Object.prototype.hasOwnProperty.call(K, m[2]) || K[m[2]].lv !== +m[1]) return null;
    const k = K[m[2]], R = rng(seedOf(tag)), q = k.f(R), cells = spell(q.ok);
    const ng = [];
    for (const t of q.ng) if (t && t !== q.ok && !ng.includes(t) && spell(t) && !sameCells(spell(t), cells)) ng.push(t);
    const why = (t) => { const c = spell(t); return `「${t}」は ${dotsAll(c)}${c.length === cells.length ? "" : `（${c.length}マス）`}。`; };
    const choices = shuffle(R, [{ t: q.ok, ok: true, why: "" }, ...ng.slice(0, 3).map((t) => ({ t, ok: false, why: why(t) }))]);
    const ty = TYPES[k.type];
    const key = [m[2], q.ok, choices.map((c) => c.t).join("/")].join("|");
    return { tag, lv: +m[1], kind: m[2], kindName: k.name, type: k.type, typeName: ty.name, cells, ok: q.ok, mean: q.mean || "", choices, ans: choices.findIndex((c) => c.ok), rule: `${q.ok} ＝ ${dotsAll(cells)}：${q.how}`, how: q.how, key };
  }
  const kindsOf = (lv) => KIND_IDS.filter((id) => K[id].lv === lv);
  const pickN = (R, arr, n) => shuffle(R, arr).slice(0, n);
  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date));
    const e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${K[id].lv}:${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしい3つ・今日のむずかしいと別の種類・ヒントなし）
  function hardTags(date) {
    const R = rng(seedOf("hard:" + date)), day = dailyTags(date)[4].split(/[:|]/)[1];
    return pickN(R, kindsOf(2).filter((id) => id !== day), 3).map((id, i) => `2:${id}|${date}:h${i}`);
  }
  // 点字帳に載せる1つ（種類ごとのきまり）
  const RULES = {
    a: "母音：ア①・イ①②・ウ①④・エ①②④・オ②④", ka: "カ行：母音の点＋⑥", sa: "サ行：母音の点＋⑤⑥", ta: "タ行：母音の点＋③⑤", na: "ナ行：母音の点＋③",
    ha: "ハ行：母音の点＋③⑥", ma: "マ行：母音の点＋③⑤⑥", ra: "ラ行：母音の点＋⑤", yw: "ヤ③④・ユ③④⑥・ヨ③④⑤・ワ③・ヲ③⑤・ン③⑤⑥・ッ②・ー②⑤",
    dak: "濁音：濁音符⑤を前に置く（ガ＝⑤・①⑥）", han: "半濁音：半濁音符⑥を前に置く（パ＝⑥・①③⑥）", num: "数字：数符③④⑤⑥を前に（1＝③④⑤⑥・①）",
    you: "拗音：拗音符④＋ア・ウ・オ段（キャ＝④・①⑥）", youd: "拗濁音は④⑤、拗半濁音は④⑥を前に（ギャ＝④⑤・①⑥）", word: "ことば：音のとおりに書く（がっこう→ガッコー）", num2: "数：数符は前に1回だけ（25＝③④⑤⑥・①②・①⑤）",
  };
  const ruleOf = (id) => RULES[id] || "";

  const TENJI = { LV, SRC, TYPES, K, KIND_IDS, ONE, DAK, HAN, YROW, DIGIT, PRE, WORDS, seedOf, rng, make, spell, dots, dotsAll, uni, sameCells, kindsOf, dailyTags, hardTags, ruleOf, pickN, shuffle };
  if (typeof module !== "undefined" && module.exports) module.exports = TENJI; else root.TENJI = TENJI;
})(typeof window !== "undefined" ? window : globalThis);
