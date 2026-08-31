# ASMRTube v3.0.0

YouTube上のASMRを自分用に整理・再生し、コメント欄の多様なタイムスタンプを「音の地図」として使う個人向け静的Webアプリです。

- GitHub Pagesのみで動作
- YouTube Data APIキー不要
- Adopted Guide: `web-project-guide` v1.11.0
- Profiles: `STATIC + DATA + MEDIA + TOOL`
- Schema Version: `1`

## v3 Design Direction — ASMR Media Deck

v2.4はLyricTubeのMedia Workspaceを参考に、装飾やCardを減らす方向へ寄せました。しかしユーザー確認では「シンプルになっただけ」と評価され、Visual完成度は40/100でした。

v3ではそのCandidateを採用せず、ASMR固有の使い方からVisualを組み直しています。

```text
Library rail
→ ASMR Media Deck
→ Sound Map / Timestamps
```

### Signature

選択中ASMRのYouTubeサムネイルを、Player周辺の弱いAmbient visualとして利用します。

装飾用のGeneric Gradientではなく、**現在聴いている作品そのもの**をVisual materialにします。

Playerは再生ボタン・A-B・Sleep・Seek・Volumeまで含む1つのMedia Deckとして扱い、右のタイムスタンプは目的の音へ移動する `Sound Map` として扱います。

### Visual Source of Truth

| Role | File |
|---|---|
| Color / theme tokens | `theme.css` |
| Main workspace / media composition | `workspace.css` |
| Dedicated settings page | `settings.css` |
| Appearance behavior | `appearance.js` |
| Timestamp hierarchy / interaction | `timestamp-ui.js` / `timestamp-ui.css` |

旧 `styles.css / product-v2.css` 等は既存機能との互換レイヤーです。現在の見た目はv3 Visual layerが後から統一します。

## 設定ページ

Sidebarの `設定`、または歯車から独立した設定ページを開きます。

### カラーテーマ

6種類をライブ切替できます。

- Moon Violet — 紫
- Soft Rose — 桃
- Deep Ocean — 青
- Quiet Forest — 緑
- Warm Lamp — 橙
- Graphite — 無彩色

Accentだけでなく、背景・Sidebar・Surface・選択状態もテーマに合わせて変わります。

### その他の表示設定

- 明るさ 30〜100%
- コンパクト表示
- サムネイル表示 / 非表示
- 動きを減らす
- 起動時に概要表示

保存先は既存のままです。

```text
asmrtube.settings.v1
```

v3ではこの設定Objectへ任意項目 `theme` を追加します。ライブラリデータは書き換えません。

## 目的

- ASMRをタイトル・配信者・タグ・評価で整理する
- 長い動画から目的の音へすぐ移動する
- YouTubeコメント欄のタイムスタンプ記法の違いを吸収する
- 気に入った区間や前回の再生位置を残す
- 配信者単位でもライブラリを見返す
- 誤削除・壊れたJSON・保存データ破損へ備える
- 寝る前でも長時間使いやすい画面にする

## 崩してはいけない仕様

- YouTube IFrame Playerによる再生
- GitHub Pagesだけで動作する静的構成
- YouTube Data APIキー不要
- `asmrtube.library.v1` を維持
- `asmrtube.settings.v1` を維持
- `asmrtube.timestamp.view.v1` を維持
- JSON書き出し / 読み込み
- YouTube動画IDによる重複登録防止
- LyricTubeの保存データへ干渉しない
- 旧 `{time,label,group,tags}` タイムスタンプを読める
- v1.9以降の汎用タイムスタンプ解析を維持
- `resumeAt / resumeDuration / favoriteSections` 等の既存任意項目を維持

## 主要機能

### ライブラリ

- ASMR追加 / 編集 / 削除
- YouTubeタイトル・チャンネル名の自動取得
- お気に入り
- 最近聴いた
- 睡眠向け
- プレイリスト
- タグ絞り込み
- タイトル / 配信者 / タグ / タイムスタンプ / お気に入り区間検索
- 評価
- 作品ごとの音量

### 再生

- YouTube Player
- 前 / 再生・一時停止 / 次
- Seek
- 音量
- A-B区間リピート
- 15 / 30 / 45 / 60 / 90分スリープタイマー
- 続きから再生
- 名前付きお気に入り区間

### タイムスタンプ

`timestamp-parser.js` が多様なYouTubeコメント記法を段階的に解析します。

対応例:

```text
0:00 開始
3:24 右耳かき
```

```text
[3:24](YouTube URL) 右耳かき
```

```text
2:41 炭酸  耳ふー 4:46 右 5:38 左
```

```text
お耳マッサージ
▷ 04:22 マッサージ開始
┗ 05:00 さわさわ
```

表示:

- `見出し / すべて`
- 見出しカード
- 親タイムスタンプ
- 親子表示
- 現在位置ハイライト
- Group折りたたみ
- 保存済みタイムスタンプ編集

v3では `timestamp-ui.js` を正式Runtimeへ接続し、`renderTimestamps / updateActiveTimestamp / showTimestampPreview` の正本として動作させます。

## データ管理

- JSON書き出し
- JSON読み込み
- ローカルスナップショット
- スナップショット復元
- ライブラリ診断
- 削除Undo

保存キー:

```text
ライブラリ: asmrtube.library.v1
表示設定: asmrtube.settings.v1
タイムスタンプ表示: asmrtube.timestamp.view.v1
簡易スナップショット: asmrtube.snapshot.v1
復元直前退避: asmrtube.snapshot.beforeRestore.v1
```

## Runtime構成

v3では「ファイルは存在するが `index.html` から読み込まれていない」状態をRegressionとして扱います。

主要Runtime:

```text
app-config.js
app.js
timestamp-parser.js
timestamp-ui.js
ui-enhancements.js
app-quality-v21.js
timestamp-polish-v21.js
library-tools-v22.js
appearance.js
```

`tests/static-check.mjs` で存在だけでなく、`index.html` への接続とLoad orderも確認します。

## 自動品質チェック

`.github/workflows/quality-check.yml` で以下を確認します。

- JavaScript構文
- JSON構文
- HTMLから参照するローカルファイルの存在
- Version / Guide / Schema metadata整合
- v3 Theme / Workspace / Settings CSSの接続順
- Product Shell / Timestamp UI / Appearance runtimeの接続順
- 設定ページと複数Themeの存在
- `asmrtube.settings.v1` の維持

## ショートカット

```text
Space / K   再生・一時停止
J           10秒戻る
L           10秒進む
Ctrl + K    検索
?           ヘルプ
Esc         スマホサイドバーを閉じる
```

## GitHub Pages

```text
https://elitemay.github.io/asmrtube/
```

## Visual validation

v3.0は大規模UI刷新です。

- Static / CI: PRと最終main Commitで確認する
- GitHub Pages deployment: merge後に確認する
- Browser / Screenshot visual review: **User確認前は未確認扱い**
- Mobile real-device: **未確認**

`CIが通った = 見た目が完成した` とは扱いません。v3のVisual Baselineはユーザーが実画面を評価した後に確定します。
