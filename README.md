# ASMRTube v2.1

YouTube上のASMRを自分用に整理・再生し、コメント欄にある多様なタイムスタンプを再利用するための静的Webアプリです。

GitHub PagesでURLを開くだけで利用でき、YouTube Data APIキーは不要です。

## 目的

- ASMRをタイトル・配信者・タグで整理する
- YouTubeコメント欄のタイムスタンプを貼り付けて再利用する
- 人ごとに違うタイムスタンプ書式をできるだけ壊さず解析する
- 長いASMRでも目的の区間へ素早く移動する
- 寝る前でも使いやすい表示・操作にする
- 誤削除・壊れたJSON・読み込み失敗からデータを守りやすくする
- GitHub Pagesだけで軽量に利用する

## 崩してはいけない仕様

- YouTube IFrame Playerによる再生
- GitHub Pagesだけで動作する静的構成
- YouTube Data APIキー不要
- ライブラリは `asmrtube.library.v1` を維持
- 表示設定は `asmrtube.settings.v1` を維持
- タイムスタンプ表示モードは `asmrtube.timestamp.view.v1` を維持
- JSON書き出し / 読み込み
- YouTube動画IDで重複登録を防止
- LyricTubeの保存データへ干渉しない
- 既存 `{time,label,group,tags}` タイムスタンプを読める
- v1.9の汎用タイムスタンプ解析を維持
- 見た目改善のために再生・保存・解析機能を削らない

# v2.1 品質改善

v2.0で他プロジェクトのUI・設定・Dashboardを取り込んだため、v2.1では日常利用で起きやすい失敗や面倒を減らす方向へ進めています。

## タイムスタンプまで検索

左の検索欄は次を横断して検索します。

- タイトル
- 配信者
- ASMRタグ
- タイムスタンプ本文
- タイムスタンプ見出し
- 二言語タイムスタンプの副題
- 親タイムスタンプ名
- タイムスタンプ自動タグ

例えば作品自体に `耳ふー` タグがなくても、登録済みタイムスタンプに `耳ふー` が含まれていれば、そのASMRを検索結果へ出せます。

複数単語を入れた場合は、すべての語を含む作品を表示します。

## 0件表示を改善

検索・タグ絞り込み・お気に入り等で0件になっても、左一覧を真っ白にしません。

状態に応じて次を表示します。

- 検索 / 絞り込みを解除
- すべて表示へ戻る
- ASMR追加

## YouTubeプレイヤー準備待ち

YouTube IFrame APIがまだ準備できていない時にASMRを押しても、操作を捨てません。

- 選択操作を予約
- 再生操作を予約
- Player準備後に最新の操作を反映
- cue済み動画を再生した時も `最近聴いた` へ記録

これにより、ページを開いた直後などに押した操作が無反応になりにくい構成にしています。

## 削除を元に戻す

ASMRを削除すると8秒間 `元に戻す` を表示します。

復元対象:

- ASMR本体
- プレイリスト内の位置
- 最近聴いた内の位置

再生中作品を削除した場合は、YouTubeプレイヤーを停止し、A-Bリピートも解除して選択状態を初期化します。

v2.0の削除前スナップショットも引き続き併用します。

## JSON読み込みを安全化

読み込み前にJSONを確認し、次を処理します。

- `library` が存在するか検証
- 動画ID / タイトルがない壊れた項目を除外
- URLから動画IDを復元できる場合は復元
- 同じYouTube動画IDの重複を整理
- 重複IDを再発行
- 不正なタイムスタンプを除外
- 存在しない作品を指すプレイリスト参照を除外
- 最近聴いたの壊れた参照を除外
- 読み込むASMR / プレイリスト件数を事前表示
- 最終確認後に置き換え

読み込み前にはローカルスナップショットも作成します。

## ライブラリ診断

`データ管理` に `ライブラリ診断` を追加しています。

確認対象:

- IDなし
- タイトルなし
- YouTube動画IDなし
- 動画ID重複
- 不正なタイムスタンプ時刻
- 存在しない作品を参照するプレイリスト
- 最近聴いたの壊れた参照

診断は確認のみで、勝手にデータを書き換えません。

## 再生ショートカット

入力欄やダイアログ操作中は無効になります。

```text
Space / K   再生・一時停止
J           10秒戻る
L           10秒進む
Ctrl + K    検索欄へ移動
?           ヘルプを開く
Esc         スマホサイドバーを閉じる
```

## アクセシビリティ

- Toastへ `aria-live` を設定
- 検索欄 / 音量 / シークへaria-labelを追加
- 一覧・Dashboard・タイムスタンプのキーボードフォーカスを見やすくする
- `prefers-reduced-motion` を尊重

# v2.0 Product Shell

v2.0では、自分の他プロジェクトで既に改善してきた設計をASMRTube向けに再利用しています。

## LyricTubeから応用

- スマホのドロワー式サイドバー
- 設定画面
- コンパクト表示
- サムネイル表示切替
- 動きを減らす設定
- 起動画面設定
- ヘルプ導線
- モバイルでのダイアログ操作

## Lineup Labから応用

- 枠線を増やしすぎず背景差・影・余白で情報階層を作る
- 画像を使った一覧
- データ管理を独立画面として見せる
- 重い常時アニメーションを避ける

## VReviewから応用

- Dashboard形式の概要表示
- 数値カード
- 自動解析のConfidence表示
- 自動処理結果をユーザーが確認できる設計

# 画面構成

## 左サイドバー

- 概要
- すべて
- お気に入り
- 最近聴いた
- 睡眠向け
- プレイリスト
- ASMRライブラリ
- 検索
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

## 右

- タイムスタンプ
- `見出し / すべて`
- 親見出しジャンプ
- グループ折りたたみ
- 現在位置ハイライト

# ライブラリ概要

左の `概要` からDashboardを開けます。

- 登録ASMR数
- お気に入り数
- 睡眠向け数
- 総タイムスタンプ数
- 最近聴いた / 最近追加したASMR
- よく使うタグ
- お気に入り / 睡眠向け / 最近聴いたへのクイック移動
- ASMR追加
- データ管理

設定の `起動時に概要を表示` をONにすると、サイトを開いた時に概要を最初に表示します。

# 設定

左上の歯車から開きます。

- 画面の明るさ 30〜100%
- 100 / 75 / 55 / 35%プリセット
- コンパクト表示
- サムネイル表示 / 非表示
- 動きを減らす
- 起動時に概要を表示

設定保存:

```text
asmrtube.settings.v1
```

# データ管理

左下の `データ管理` から開きます。

表示:

- ASMR件数
- 総タイムスタンプ数
- プレイリスト数
- localStorage概算保存サイズ
- ライブラリ診断

操作:

- JSONを書き出す
- JSONを読み込む
- 今の状態をローカルスナップショットへ退避
- スナップショットから復元

## スナップショット

```text
asmrtube.snapshot.v1
asmrtube.snapshot.beforeRestore.v1
```

スナップショットもlocalStorageなので、サイトデータ削除では消えます。重要なバックアップはJSON書き出しを使ってください。

# スマホ表示

900px以下では:

- 左サイドバーを `☰` ドロワーへ変更
- 背景タップ / `×` / `Esc` で閉じる
- ASMR選択後に自動で閉じる
- 上部操作を横スクロール
- タグを横スクロール
- プレイヤー → 情報 → タイムスタンプの1列構成
- ダイアログを画面内へ収める
- safe-areaを考慮

# タイムスタンプ解析

v1.9以降は書式ごとの単純な正規表現追加ではなく、複数段階で解析します。

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
[3:24](https://www.youtube.com/watch?v=...&t=204s) 右耳かき
```

```text
01:28-声入り
02:26 - (左右の耳をチェック)
```

```text
2:41 炭酸  耳ふー 4:46 右 5:38 左  5:55 耳塞ぎ
```

```text
お耳マッサージ
▷ 04:22 お耳マッサージからしてこうかな
┗ 05:00 さわさわ
```

```text
38:10 スライム
└ 41:20 握力52kgでスライム潰す
```

```text
28:22 タオルとんとん＋オノマトペ Tapping+Onomatopoeia
22:05 タオルとんとんTowel Tapping
```

URL時刻:

```text
https://youtu.be/VIDEO_ID?t=90s
https://youtu.be/VIDEO_ID?t=1m30s
https://www.youtube.com/watch?v=VIDEO_ID&start=90
```

追加メタデータはすべて任意です。

```text
subtitle
role
parentTime
parentLabel
confidence
sourceStyle
```

# タイムスタンプ表示

## 見出しモード

- 親見出しをコンパクトカードで一覧化
- 親を押すと先頭へシーク
- 選んだ親の子タイムスタンプを表示
- 再生中の親へ自動追従
- 親なしは `その他のタイムスタンプ`

## すべてモード

- 全タイムスタンプを時系列表示
- 親グループを折りたたみ
- 再生中グループを自動展開・強調

# 回帰テスト

```text
tests/
├ timestamp-cases.json
└ timestamp-parser.test.html
```

GitHub Pages:

```text
https://elitemay.github.io/asmrtube/tests/timestamp-parser.test.html
```

# YouTube情報取得

登録画面へURLを貼るとタイトルとチャンネル名を自動取得します。

- 第一候補: YouTube oEmbed
- フォールバック: noembed
- APIキー不要
- 失敗時は手入力可能

# 保存場所

```text
ライブラリ: asmrtube.library.v1
表示設定: asmrtube.settings.v1
タイムスタンプ表示モード: asmrtube.timestamp.view.v1
簡易スナップショット: asmrtube.snapshot.v1
復元直前の一時退避: asmrtube.snapshot.beforeRestore.v1
```

# ファイル構成

```text
├ index.html
├ favicon.svg
├ styles.css
├ asmr-overrides.css
├ ui-base-v2.css
├ product-v2.css
├ quality-v21.css
├ app.js
├ app-quality-v21.js
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

CSS:

- `styles.css` — LyricTube系の基本UI
- `asmr-overrides.css` — ASMR / タイムスタンプ固有調整
- `ui-base-v2.css` — Product Shell共通UI
- `product-v2.css` — Dashboard / 設定 / データ管理 / スマホドロワー
- `quality-v21.css` — 0件状態 / Undo / 診断 / v2.1品質UI

JavaScript:

- `app.js` — ASMRTube基本機能
- `timestamp-parser.js` — 汎用タイムスタンプ解析
- `timestamp-ui.js` — タイムスタンプ表示
- `ui-enhancements.js` — v2.0 Product Shell
- `app-quality-v21.js` — v2.1検索 / 再生安定化 / Undo / 安全な読み込み / 診断

# GitHub Pages

```text
https://elitemay.github.io/asmrtube/
```

# 注意点

- 埋め込み禁止YouTube動画は再生できません。
- YouTubeコメント自体は自動取得しません。
- タイトル / チャンネル名取得は外部oEmbed通信に依存します。
- コメント記法は非常に多いため、曖昧なものは無理に階層化せずフラットで残します。
- 新形式は回帰ケースへ追加してからパーサーを拡張します。
- ローカルスナップショットはJSONバックアップの代わりではありません。

# 未確認

- v2.1をGitHub Pages上で実ブラウザから全操作した最終確認
- YouTube APIが非常に遅い環境での2分超の準備待ち
- iPhone / Android実機でのv2.1 Undo / キーボード以外の操作
- 長時間連続再生
- YouTube埋め込み制限動画の詳細エラー表示
