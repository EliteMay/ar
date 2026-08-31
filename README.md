# ASMRTube v3.0.0

YouTube上のASMRを自分用に整理・再生し、コメント欄にある多様なタイムスタンプを再利用するための静的Webアプリです。

GitHub Pagesだけで動作し、YouTube Data APIキーは不要です。

- Adopted Guide: `web-project-guide` v1.11.0
- Profiles: `STATIC + DATA + MEDIA + TOOL`
- Visual Direction: `ASMR Media Deck`
- Visual Status: Candidate / User review pending

## v3で基礎から見直した理由

v2.4ではLyricTubeのMedia Workspaceを強く参考にし、Gradient / Shadow / Card chromeを減らす方向へ整理しました。

しかし実画面のユーザー評価は **40 / 100** で、主な問題は「シンプルになっただけでASMRTubeとしての魅力が弱い」ことでした。

そのためv2.4を完成Visualとして継続せず、`web-project-guide` v1.11.0のDesign Direction手順へ戻って基礎から再設計しました。

比較した方向:

1. LyricTube型3 Paneをさらに磨く
2. Playerを上、情報を下へ置くTheater型
3. Library rail + Media Deck + Sound Map

採用: **3. ASMR Media Deck**

```text
Library rail
→ ASMR Media Deck
→ Sound Map / Timestamps
```

## v3 Visual

### Library rail

- YouTubeサムネイルを残し、作品を選ぶ場所として視覚的に機能させる
- Search / View / Playlist / Libraryを同じ階層に潰さない
- 選択中作品はAccent line + Surface差で表示

### ASMR Media Deck

Player / Transport / Seek / Volumeを別々の箱ではなく、1つの再生Deckとして扱います。

選択したYouTubeサムネイルをPlayer周辺の弱いAmbient visualへ使い、登録作品そのものを見た目の材料にします。

### Sound Map

タイムスタンプは「LyricTubeのLyrics代替」ではなく、長いASMRから聴きたい音を探すNavigationとして扱います。

- 見出し / すべて
- 親 / 子
- 再生中Highlight
- コメントから取込
- 保存済みタイムスタンプ編集

を維持します。

## 設定ページ

Sidebar下の `設定` から独立ページを開きます。

### カラーテーマ

6テーマを用意しています。

- Moon Violet — 紫
- Soft Rose — 桃
- Deep Ocean — 青
- Quiet Forest — 緑
- Warm Lamp — 橙
- Graphite — 無彩色

ThemeはAccentだけでなく次へ連動します。

- Page background
- Sidebar
- Surface
- Selected / Active
- Player control
- Range
- Timestamp
- Focus state

保存は既存 `asmrtube.settings.v1` に `theme` を追加するだけで、Library dataには影響しません。

### 表示設定

- 明るさ 30〜100%
- コンパクト表示
- サムネイル表示 / 非表示
- 動きを減らす
- 起動時に概要表示

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
- ライブラリ保存キー `asmrtube.library.v1`
- 表示設定キー `asmrtube.settings.v1`
- タイムスタンプ表示キー `asmrtube.timestamp.view.v1`
- JSON書き出し / 読み込み
- YouTube動画IDによる重複登録防止
- LyricTube保存データへ干渉しない
- 旧 `{time,label,group,tags}` タイムスタンプを読める
- v1.9以降の汎用タイムスタンプ解析
- v2.1の安全性改善
- v2.2の続きから再生 / お気に入り区間 / 配信者 / タイムスタンプ編集

## 保存データ

Library:

```text
asmrtube.library.v1
```

Settings:

```text
asmrtube.settings.v1
```

Timestamp view:

```text
asmrtube.timestamp.view.v1
```

Snapshot:

```text
asmrtube.snapshot.v1
asmrtube.snapshot.beforeRestore.v1
```

Schema Versionは `1` のままです。

## Runtime

v3では次を `index.html` から正式に読み込みます。

```text
app-config.js
app.js
timestamp-parser.js
ui-enhancements.js
app-quality-v21.js
timestamp-polish-v21.js
library-tools-v22.js
appearance.js
```

`timestamp-ui.js` は `timestamp-parser.js` から読み込まれ、`renderTimestamps / updateActiveTimestamp / showTimestampPreview` の正式Rendererへ接続します。

v2.4ではRepoに存在していた一部UI Moduleが本番Runtimeから外れていたため、v3のStatic CheckではRuntime接続も検査します。

## Visual Source of Truth

```text
theme.css       Color / Surface / Accent tokens
workspace.css   Library / Media Deck / Sound Map composition
settings.css    Dedicated settings page
```

旧CSSは互換Layerとして残りますが、v3の見た目は上記を最後に読み込んで決定します。

Visual判断・不採用理由・変更条件は `docs/VISUAL_BASELINE.md` と `PROJECT_LEARNINGS.md` を確認してください。

## 回帰テスト / CI

```text
tests/
├ timestamp-cases.json
├ timestamp-parser.test.html
└ static-check.mjs
```

GitHub Actions:

```text
.github/workflows/quality-check.yml
```

確認対象:

- JavaScript syntax
- JSON parse
- index.html local reference
- App / Guide / Schema Version整合
- v3 CSS load order
- settings page存在
- theme selector 6種類
- appearance.js接続
- Product Shell接続
- timestamp-ui.js接続
- v2.1 / v2.2 Runtime維持

PR #4では、JavaScript / JSON共通BaselineとASMRTube Static Checkが **success** しています。

## 現在の確認状態

- Implemented: Yes
- Library Schema change: No
- Existing storage key change: No
- PR Static Validation: Passed
- Browser / Screenshot visual review: Not verified
- Mobile real-device: Not verified

User-facing Visualは、実際のGitHub Pages画面を見てユーザー確認されるまでは完成扱いにしません。
