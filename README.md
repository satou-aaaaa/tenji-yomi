# 点字よみ

点字のマス（6つの点の並び）を見て、何と読むかを4つから選ぶ1日5問の学習ゲームです。母音は①②④、行は③⑤⑥、濁音は前に⑤、拗音は前に④、数字は前に数符③④⑤⑥。遊ぶうちに点字のきまりが身につきます。まちがえると、選んだ字の点が出て、選び直せます。

- 遊ぶ: <https://satou-aaaaa.github.io/tenji-yomi/>
- 時間制限なし。今日の5問（だれでも同じ）・上級・練習・とことん（何度でも）・点字帳・実績・カレンダー。
- 点字は読む向き（さわって読む面）の形で出します。わかち書き・記号は扱いません。
- 記録は遊ぶ人のブラウザ（localStorage）だけに置き、外へ送りません。

## 出典（点の形のもと）

- 文部科学省『点字学習指導の手引（令和5年改訂版）』第4章 <https://www.mext.go.jp/content/20231116-mxt_tokubetu01-000032539_16.pdf>
- 全国視覚障害者情報提供施設協会「点字について」 <https://www.naiiv.net/zensijokyo/tenji/>
- 日本点字委員会「点字を読んでみよう」 <https://www.braille.jp/topics/yonndemiyo.html>

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI の QA と同じ）
```

決まりは [AGENTS.md](AGENTS.md)。
