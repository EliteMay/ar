# ASMRTube v1.9

YouTube上のASMRを自分用に整理・再生するための静的Webアプリです。

## 目的

- ASMRをタイトル・配信者・タグで整理する
- YouTubeコメント欄のタイムスタンプを貼り付けて再利用する
- 書き方が人ごとに違うタイムスタンプをできるだけ壊さず解析する
- 長いASMRでも目的の区間へ素早く移動する
- GitHub PagesでURLを開くだけで利用する

## 崩してはいけない仕様

- YouTube IFrame Playerによる再生
- GitHub Pagesだけで動作する静的構成
- YouTube Data APIキー不要
- localStorage保存
- JSON書き出し / 読み込み
- YouTube動画IDで重複登録を防止
- LyricTubeの保存データへ干渉しない
- ライブラリ保存キーは `asmrtube.library.v1`
- 表示設定は `asmrtube.settings.v1`
- タイムスタンプ表示モードは `asmrtube.timestamp.view.v1`
- 既存 `{time,label,group,tags}` データを引き続き読めること

## UI

LyricTubeと同じシリーズとして、配色・余白・ボタン・パネル・サイドバー等のデザインシステムを基準にしています。

- 左: 検索、表示切替、プレイリスト、ASMR一覧
- 中央: YouTubeプレイヤー、再生操作、音量、A-Bリピート、作品情報
- 右: タイムスタンプ / 見出しナビゲーション
- タイムスタンプは `見出し / すべて` の2モード
- 画面全体の明るさを30〜100%で調整可能

## 主な機能

- YouTube ASMR登録 / 編集 / 削除
- URL貼り付け時に動画タイトルとチャンネル名を自動取得
- 配信者 / タグ / 評価 / 作品音量管理
- お気に入り / 最近聴いた / 睡眠向け / プレイリスト
- 検索 / タグ絞り込み
- YouTubeコメント欄のタイムスタンプ貼り付け解析
- `m:ss` / `mm:ss` / `h:mm:ss` / 2時間超え対応
- Markdownリンク形式対応
- 改行が潰れて1行になったコメントにも対応
- 見出しグループ / 親子記号の解析
- 同じ時刻を再取り込みした場合は旧解析結果を置き換え
- タイムスタンプからシーク
- A-B区間リピート
- スリープタイマー 15 / 30 / 45 / 60 / 90分
- JSONバックアップ / 復元
- PC / スマホ向けレスポンシブUI

## v1.9 汎用タイムスタンプ解析

YouTube公式の動画チャプターは、説明欄へ `00:00 タイトル` の一覧を置き、先頭00:00・3個以上・昇順・各10秒以上という条件があります。

ASMRTubeではコメント欄のタイムスタンプも扱うため、この公式条件を入力必須にはしません。コメントに1件しかなくても、0:00から始まっていなくても解析対象にします。

解析は次の段階へ分離しています。

1. 入力文字の正規化
2. 時刻トークン抽出
3. Markdown / URL / YouTube絵文字ノイズ整理
4. 見出し・親子記号解析
5. ラベル・二言語表記・タグ候補解析
6. 同一 / ±1秒付近の重複整理

### 対応形式

普通の形式:

```text
0:00 開始
3:24 右耳かき
10:51 囁き
```

Markdownコピー:

```text
[3:24](https://www.youtube.com/watch?v=...&t=204s) 右耳かき
```

ハイフン区切り:

```text
01:28-声入り
02:26 - (左右の耳をチェック)
```

括弧付き:

```text
(00:00:00) Introduction
(00:02:02) Course overview
```

改行が潰れた見出し形式:

```text
2:41 炭酸  耳ふー 4:46 右 5:38 左  5:55 耳塞ぎ
```

解析結果:

```text
2:41 炭酸

耳ふー
  4:46 右
  5:38 左

5:55 耳塞ぎ
```

親子記号:

```text
お耳マッサージ
▷ 04:22 お耳マッサージからしてこうかな
┗ 05:00 さわさわ
▷ 06:11 お耳だいぶ凝ってますね
┗ 07:26 こりこり
```

内部では `group / role / parentTime / parentLabel` を使い、

```text
大見出し
  親タイムスタンプ
    子タイムスタンプ
```

まで保持できる構造にしています。

`└` だけが途中に現れるハイブリッド形式も、直前の通常タイムスタンプを親候補として扱います。

```text
38:10 スライム
└ 41:20 握力52kgでスライム潰す
43:10 もっと入り込んで
```

### YouTubeカスタム絵文字

コピー時に次のようなMarkdownが混ざることがあります。

```text
7:08 デコピン[草くさ](https://yt3.googleusercontent.com/...)
```

通常テキストがある場合は絵文字リンク部分をノイズとして除去します。絵文字しかない行では、空行化を避けるため表示名をフォールバックとして残します。

### YouTube URLだけの時刻

表示時刻がなくても、YouTube URLの `t` / `start` パラメータから時刻を取得できます。

```text
https://youtu.be/VIDEO_ID?t=90s
https://youtu.be/VIDEO_ID?t=1m30s
https://www.youtube.com/watch?v=VIDEO_ID&start=90
```

### 日本語 + 英語

```text
28:22 タオルとんとん＋オノマトペ Tapping+Onomatopoeia
22:05 タオルとんとんTowel Tapping
```

日本語側を `label`、英語側を任意の `subtitle` として保持します。日本語と英語の間に空白がない形式にも対応します。

### 追加メタデータ

v1.9の新規解析結果には必要に応じて次の任意項目が付きます。

```text
subtitle     英語などの副題
role         item / parent / child
parentTime   親タイムスタンプの時刻
parentLabel  親タイムスタンプ名
confidence   判定信頼度
sourceStyle  markdown / bare / url / parent / child
```

すべて任意項目なので、旧データとの互換性を維持します。

## 回帰テスト

人によって異なる書式へ対応するほど、別形式を壊す危険が増えるため、代表パターンをテストデータとして保存します。

```text
tests/
├ timestamp-cases.json
└ timestamp-parser.test.html
```

テスト対象には以下を含みます。

- 通常Markdown
- ハイフン区切り
- 改行崩れ見出し
- `▷ / ┗` 親子
- `└` 混在
- 日本語 + 英語
- 括弧時刻
- YouTubeカスタム絵文字
- URLの `t / start`
- 2時間超え

GitHub Pages上では次で手動実行できます。

```text
https://elitemay.github.io/asmrtube/tests/timestamp-parser.test.html
```

## タイムスタンプ表示

### 見出しモード

- 親見出しをコンパクトカードで一覧化
- 親を押すと、その親の先頭へ動画を移動
- 選んだ親の子タイムスタンプを下部へ表示
- 再生中の親へ自動追従して強調
- 親が付いていない通常タイムスタンプは `その他のタイムスタンプ` から確認

### すべてモード

- 全タイムスタンプを時系列で表示
- 親グループは折りたたみ可能
- 再生中の親グループは自動展開・強調

## YouTube情報の自動取得

登録画面へYouTube URLを貼ると、タイトルとチャンネル名を自動取得します。

- 第一候補: YouTube oEmbed
- 取得失敗時: noembed
- APIキー不要
- 取得失敗時は手入力可能

## 保存場所

```text
ライブラリ: asmrtube.library.v1
表示設定: asmrtube.settings.v1
タイムスタンプ表示モード: asmrtube.timestamp.view.v1
```

ブラウザのサイトデータ削除で消えるため、重要なライブラリはJSON書き出しを推奨します。

## ファイル構成

```text
├ index.html
├ styles.css
├ asmr-overrides.css
├ app.js
├ timestamp-parser.js
├ timestamp-ui.js
├ ui-enhancements.js
├ README.md
├ 作業報告書.md
├ .nojekyll
├ data/
│  └ tags.json
└ tests/
   ├ timestamp-cases.json
   └ timestamp-parser.test.html
```

## GitHub Pages

```text
https://elitemay.github.io/asmrtube/
```

## 注意点

- 埋め込みを禁止しているYouTube動画は再生できません。
- YouTubeコメント自体は自動取得しません。コメント本文を手動コピーして使います。
- タイトル / チャンネル名の自動取得は外部oEmbed通信に依存します。
- コメント記法には無限に近いバリエーションがあるため、曖昧な見出しは無理に階層化せずフラットで残す方針です。
- 新しい形式が見つかった場合は `tests/timestamp-cases.json` へ回帰ケースを追加してからパーサーを拡張します。

## 未確認

- GitHub Pages反映後のv1.9回帰テストページ
- iPhone / Android実機
- 長時間連続再生
- YouTube側で埋め込み制限された動画の詳細エラー表示
