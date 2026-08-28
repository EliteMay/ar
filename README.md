# ASMRTube v1.3

YouTube上のASMRを自分用に整理・再生するための静的Webアプリです。

## 目的

- ASMRをタイトル・配信者・タグで整理する
- YouTubeコメント欄のタイムスタンプを貼り付けて再利用する
- 好きなASMRをすぐ再生できるようにする
- 睡眠向け機能をまとめる
- GitHub PagesでURLを開くだけで使えるようにする

## UI方針

LyricTubeと同じシリーズとして使いやすいよう、LyricTubeのレイアウトと必要なCSS設計を流用します。

- 左: 検索、表示切替、プレイリスト、ASMR一覧
- 中央: YouTubeプレイヤー、再生操作、音量、A-Bリピート、作品情報
- 右: LyricTubeの歌詞パネルに相当するタイムスタンプパネル
- 配色、ボタン、パネル、ダイアログ、サイドバーなどはLyricTubeのデザインシステムを基準にする
- 歌詞専用CSSなど、ASMRTubeで不要なものは持ち込まない
- ASMR固有の調整は `asmr-overrides.css` に分離する

## 崩してはいけない仕様

- YouTube IFrame Playerによる再生
- GitHub Pagesだけで動作する静的構成
- YouTube Data APIキー不要
- localStorage保存
- JSON書き出し / 読み込み
- YouTube動画IDで重複登録を防止
- LyricTubeの保存データへ干渉しない
- ASMRTubeは `asmrtube.library.v1` を使用する

## 主な機能

- YouTube ASMR登録 / 編集 / 削除
- YouTube URL貼り付け時に動画タイトルとチャンネル名を自動取得
- 自動取得後もタイトル / 配信者を手動修正可能
- 配信者管理
- 複数タグ
- 右耳 / 左耳 / 両耳 / 交互タグ
- お気に入り
- 最近聴いた
- 睡眠向け一覧
- プレイリスト
- 検索 / タグ絞り込み
- 評価（未評価 / 普通 / 好き / かなり好き / 神）
- 作品ごとの音量保存
- YouTubeコメント欄のタイムスタンプ貼り付け解析
- `m:ss` / `mm:ss` / `h:mm:ss` 対応
- Markdownリンク形式のタイムスタンプに対応
- タイムスタンプ直前の短い見出しを自動継承
- タイムスタンプの重複防止
- タイムスタンプからシーク
- タイムスタンプ名からタグ候補を自動付与
- コンパクトなタイムスタンプ一覧
- タイムスタンプパネル内スクロール
- 現在再生中のタイムスタンプをハイライト
- A-B区間リピート
- スリープタイマー 15 / 30 / 45 / 60 / 90分
- JSONバックアップ / 復元
- PC / スマホ向けレスポンシブUI

## YouTube情報の自動取得

登録画面へYouTube URLを貼ると、タイトルとチャンネル名を自動取得します。

- 第一候補: YouTube oEmbed
- 取得失敗時のフォールバック: noembed
- APIキーは使用しません
- 取得に失敗した場合は手入力できます
- 保存前にタイトルが空の場合は再取得を試します

## タイムスタンプ取り込み

YouTubeコメント欄からタイムスタンプ付きコメントをコピーし、右側の「コメントから取込」へ貼り付けます。

通常形式:

```text
0:00 開始
3:24 右耳かき
10:51 囁き
```

見出し付き形式にも対応します。

```text
耳ふー
4:46 右
5:38 左
```

この場合は次のように補完して登録します。

```text
4:46 耳ふー 右
5:38 耳ふー 左
```

YouTubeリンクが含まれるMarkdown形式にも対応します。

```text
耳ふー
[4:46](https://www.youtube.com/watch?v=xxxxx&t=286s) 右
[5:38](https://www.youtube.com/watch?v=xxxxx&t=338s) 左
```

次の短い見出しが現れるまで、その見出しを親ラベルとして利用します。`タイムスタンプ`、URL、コメント説明文などは見出し候補から除外します。

通常表示では操作性を優先して、時間・内容・削除だけを1行で表示します。長い一覧はページ全体を伸ばさず、タイムスタンプパネル内でスクロールします。

## 保存場所

ブラウザ `localStorage` の次のキーへ保存します。

```text
asmrtube.library.v1
```

既存のv1データ形式は変更していません。ブラウザのサイトデータ削除で消えるため、重要なライブラリはJSON書き出しを推奨します。

## ファイル構成

```text
├ index.html
├ styles.css
├ asmr-overrides.css
├ app.js
├ timestamp-parser.js
├ README.md
├ 作業報告書.md
├ .nojekyll
└ data/
   └ tags.json
```

## GitHub Pages

`Settings` → `Pages` → `Deploy from a branch` を選び、Branchを `main`、Folderを `/ (root)` に設定します。

公開URL:

```text
https://elitemay.github.io/asmrtube/
```

## 注意点

- 埋め込みを禁止しているYouTube動画は再生できません。
- YouTubeコメント自体は自動取得しません。コメント本文を手動コピーして使います。
- タイトル / チャンネル名の自動取得は外部oEmbed通信に依存するため、通信失敗時は手入力が必要です。
- 見出し継承は短い見出しを対象にしたヒューリスティック処理です。誤判定した場合は保存前プレビューで修正できます。
- ブラウザやYouTube側の仕様変更でIFrame PlayerやoEmbedの動作が変わる可能性があります。

## 未確認

- 実機での長時間連続再生
- iPhone / Android実機
- YouTube側で埋め込み制限された動画の詳細エラー表示
