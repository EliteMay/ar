# ASMRTube v2.2

YouTube上のASMRを自分用に整理・再生し、コメント欄にある多様なタイムスタンプを再利用するための静的Webアプリです。

GitHub Pagesだけで動作し、YouTube Data APIキーは不要です。

## 目的

- ASMRをタイトル・配信者・タグ・評価で整理する
- YouTubeコメント欄のタイムスタンプを人ごとの書き方の違いごと吸収する
- 長いASMRから目的の場面へすぐ移動する
- 気に入った区間や前回の再生位置を残す
- 配信者単位でもライブラリを見返せるようにする
- 誤削除・壊れたJSON・保存データ破損へ備える
- GitHub Pagesで軽く、個人利用しやすい状態を維持する

## 崩してはいけない仕様

- YouTube IFrame Playerによる再生
- GitHub Pagesだけで動作する静的構成
- YouTube Data APIキー不要
- ライブラリ保存キー `asmrtube.library.v1` を維持
- 表示設定キー `asmrtube.settings.v1` を維持
- タイムスタンプ表示キー `asmrtube.timestamp.view.v1` を維持
- JSON書き出し / 読み込み
- YouTube動画IDによる重複登録防止
- LyricTubeの保存データへ干渉しない
- 旧 `{time,label,group,tags}` タイムスタンプを読める
- v1.9以降の汎用タイムスタンプ解析を維持

# v2.2 ライブラリ機能

## 続きから再生

動画ごとに再生位置を自動保存します。

保存される任意項目:

```text
resumeAt
resumeDuration
resumeUpdatedAt
```

仕様:

- 再生中 / 一時停止中だけ位置を保存
- YouTube Playerの `CUED` 状態では保存位置を書き換えない
- 8秒未満は保存しない
- 終了15秒前付近、または動画終了時は続き位置を消す
- 作品情報に `前回の続き` を表示
- `▶ 続きから` で保存位置へ移動して再生

既存作品にこれらの項目がなくても問題ありません。

## お気に入り区間

A-B区間や好きな場面を名前付きで保存できます。

```text
一番好きな耳ふー
12:34 〜 14:20
```

保存形式:

```text
favoriteSections: [
  { id, label, start, end, createdAt }
]
```

- A-Bが設定済みならその範囲を自動入力
- A-B未設定なら現在位置から30秒を仮入力
- 保存済み区間を押すと、その範囲をA-Bリピートで再生
- 区間名も左検索欄の検索対象
- 作品ごとに複数保存可能
- 動画切替時は前動画のA-Bを解除

## 配信者ページ

作品情報の `配信者ページ` または上部の配信者名から開けます。

- 同じ配信者の登録作品
- 作品数
- お気に入り数
- 睡眠向け数
- 総タイムスタンプ数
- よく使うタグ
- 各作品の評価
- 続き位置

作品カードを押すとそのASMRへ移動します。

## 保存済みタイムスタンプ編集

右タイムスタンプパネルの `編集` から、取り込み後のタイムスタンプを直接修正できます。

編集対象:

- 見出し `group`
- 時間
- 内容 `label`
- 副題 `subtitle`

追加:

- `＋ 現在位置`
- `＋ 空の行`
- 行削除

親タイムスタンプの時刻・名前変更時は、子の `parentTime / parentLabel` を可能な範囲で追従します。

親を削除して参照先を失った子は通常タイムスタンプへ戻します。

# v2.1 品質・安全性

## 検索

検索対象:

- タイトル
- 配信者
- 作品タグ
- タイムスタンプ本文
- 見出し
- 副題
- 親タイムスタンプ名
- タイムスタンプタグ
- v2.2 お気に入り区間名

複数語はAND検索です。

## 0件状態

検索・タグ・お気に入り等で0件になった時も真っ白にせず、状態に応じて次の操作を表示します。

- 検索 / 絞り込み解除
- すべて表示
- ASMR追加

## YouTube Player準備待ち

ページを開いた直後などYouTube IFrame APIがまだ準備できていない場合、選択 / 再生操作を捨てず、準備後に反映します。

## 削除Undo

ASMR削除後8秒間 `元に戻す` を表示します。

復元対象:

- ASMR本体
- ライブラリ位置
- プレイリスト位置
- 最近聴いた位置

## JSON読み込み安全化

読み込み前に以下を検証・整理します。

- `library` の存在
- 動画ID / タイトル不足
- URLから動画ID復元
- 同一YouTube動画の重複
- 重複ID
- 不正タイムスタンプ
- 壊れたプレイリスト参照
- 壊れた最近聴いた参照

読み込み件数を確認してから置き換えます。

## ライブラリ診断

`データ管理 → 整合性を確認` から、重複動画・壊れた参照・不正タイムスタンプなどを確認できます。

診断は勝手にデータを書き換えません。

# v2.0 Product Shell

他の自作サイトで改善してきた設計をASMRTube向けに再利用しています。

### LyricTubeから応用

- スマホドロワー
- 設定画面
- コンパクト表示
- サムネイル表示切替
- 動きを減らす
- ヘルプ導線
- モバイルダイアログ

### Lineup Labから応用

- 背景差・影・余白による情報階層
- 画像中心カード
- 独立したデータ管理画面
- 重い常時アニメーションを避ける方針

### VReviewから応用

- Dashboard
- 数値カード
- Confidence表示
- 自動処理結果をユーザーが確認する設計

# 画面構成

## 左

- 概要
- すべて
- お気に入り
- 最近聴いた
- 睡眠向け
- プレイリスト
- 検索
- ASMR一覧
- JSON書き出し / 読み込み
- データ管理

## 中央

- YouTubeプレイヤー
- 前 / 再生 / 次
- A-B区間リピート
- スリープタイマー
- シーク
- 音量
- 作品情報
- 続きから再生
- 配信者ページ
- お気に入り区間

## 右

- タイムスタンプ
- `見出し / すべて`
- 親見出しジャンプ
- 親タイムスタンプジャンプ
- 親子表示
- 現在位置ハイライト
- コメントから取込
- 保存済みタイムスタンプ編集

# 汎用タイムスタンプ解析

v1.9以降、単純な書式別正規表現ではなく段階的に解析します。

1. 入力文字の正規化
2. 時刻トークン抽出
3. Markdown / URL / YouTube絵文字ノイズ整理
4. 見出し・親子記号解析
5. ラベル・二言語・タグ候補解析
6. 同一 / ±1秒付近の重複整理

対応例:

```text
0:00 開始
3:24 右耳かき
```

```text
[3:24](YouTube URL) 右耳かき
```

```text
01:28-声入り
```

```text
2:41 炭酸  耳ふー 4:46 右 5:38 左
```

```text
お耳マッサージ
▷ 04:22 マッサージ開始
┗ 05:00 さわさわ
```

```text
38:10 スライム
└ 41:20 握力52kgでスライム潰す
```

```text
28:22 タオルとんとん＋オノマトペ Tapping+Onomatopoeia
```

任意メタデータ:

```text
subtitle
role
parentTime
parentLabel
confidence
sourceStyle
```

# 回帰テスト

```text
tests/
├ timestamp-cases.json
├ timestamp-parser.test.html
└ static-check.mjs
```

タイムスタンプ回帰テスト:

```text
https://elitemay.github.io/asmrtube/tests/timestamp-parser.test.html
```

# 自動品質チェック

GitHub Actionsでmainへのpush / PRごとに自動チェックします。

```text
.github/workflows/quality-check.yml
```

確認内容:

- 全 `.js / .mjs` を `node --check`
- JSONファイルをすべて構文解析
- `index.html` のローカルCSS / JS参照先が存在するか
- 主要ファイルが不足していないか
- `index.html` がv2.2 CSS / JSを読み込んでいるか

これにより、今後の変更でJavaScript構文エラーやファイル参照漏れをmainへ残しにくくします。

# 設定

左上の歯車から開きます。

- 明るさ 30〜100%
- コンパクト表示
- サムネイル表示 / 非表示
- 動きを減らす
- 起動時に概要表示

保存:

```text
asmrtube.settings.v1
```

# データ管理

- JSON書き出し
- JSON読み込み
- ローカルスナップショット
- スナップショット復元
- ライブラリ診断

保存キー:

```text
ライブラリ: asmrtube.library.v1
表示設定: asmrtube.settings.v1
タイムスタンプ表示: asmrtube.timestamp.view.v1
簡易スナップショット: asmrtube.snapshot.v1
復元直前退避: asmrtube.snapshot.beforeRestore.v1
```

`resumeAt` や `favoriteSections` は別localStorageを作らず、各ライブラリ作品内の任意フィールドとして保存します。

# ショートカット

```text
Space / K   再生・一時停止
J           10秒戻る
L           10秒進む
Ctrl + K    検索
?           ヘルプ
Esc         スマホサイドバーを閉じる
```

入力欄やダイアログ操作中は再生ショートカットを無効にします。

# ファイル構成

```text
├ .github/
│  └ workflows/
│     └ quality-check.yml
├ index.html
├ favicon.svg
├ styles.css
├ asmr-overrides.css
├ ui-base-v2.css
├ product-v2.css
├ quality-v21.css
├ library-tools-v22.css
├ app.js
├ app-quality-v21.js
├ ui-enhancements.js
├ library-tools-v22.js
├ timestamp-parser.js
├ timestamp-ui.js
├ timestamp-polish-v21.js
├ README.md
├ 作業報告書.md
├ .nojekyll
├ data/
│  └ tags.json
└ tests/
   ├ timestamp-cases.json
   ├ timestamp-parser.test.html
   └ static-check.mjs
```

役割:

- `app.js` — 基本機能
- `timestamp-parser.js` — 汎用解析
- `timestamp-ui.js` — 基本タイムスタンプUI
- `timestamp-polish-v21.js` — 親子 / 副題表示補強
- `ui-enhancements.js` — v2.0 Product Shell
- `app-quality-v21.js` — v2.1安定化・安全性
- `library-tools-v22.js` — v2.2ライブラリ機能
- `tests/static-check.mjs` — 静的整合性確認

# GitHub Pages

```text
https://elitemay.github.io/asmrtube/
```

# 注意点

- 埋め込み禁止YouTube動画は再生できません。
- YouTubeコメント自体は自動取得しません。
- タイトル / チャンネル名取得は外部oEmbed通信に依存します。
- コメント記法は非常に多いため、曖昧なものは無理に階層化せずフラットで残します。
- ローカルスナップショットはJSONバックアップの代わりではありません。
- ブラウザのサイトデータを削除するとライブラリ・設定・スナップショットも消える場合があります。

# 未確認

- v2.2の実ブラウザでの全操作確認
- 続き位置の長時間連続再生時の保存挙動
- お気に入り区間を多数保存した場合の表示密度
- 100件以上のタイムスタンプを手動編集する場合の操作感
- iPhone / Android実機
- YouTube埋め込み制限動画の詳細エラー表示
