# ASMRTube Project Learnings

この文書は、日々の変更履歴ではなく、今後のASMRTube修正で再利用価値が高い判断・失敗・成功を残す長期メモです。

## L-002 Media hierarchyとVisual austerityを混同しない

- **Date:** 2026-09-01
- **Type:** Visual / Product Design
- **Guide candidate:** yes — Validated Directionを別Projectへ適用するときの失敗例として再利用価値あり

### Context

v2.4では、ユーザー評価済みLyricTubeの `VD-001 LyricTube Media Workspace` を参考に、ASMRTubeを高密度Library / Player / TimestampのMedia Workspaceへ整理した。

構造上の意図は妥当だったが、実装ではLyricTube側の「Gradient / Shadow / Cardを減らす」判断まで強く移植し、ASMRTube固有のVisual materialや雰囲気まで弱めた。

ユーザー確認では「シンプルになっただけ」と評価され、全体評価は **40 / 100**。v2.4 Visual Candidateは採用しない。

さらに確認すると、Repositoryに存在する `ui-enhancements.js / timestamp-ui.js / app-config.js` が当時の `index.html` から正式Runtimeへ接続されておらず、作成済みUIが実サイトで働かない構造的Regressionもあった。

### Decision

Media Workspaceの基本Hierarchyは残してよいが、**Visual identityはASMRTubeのContent / Taskから作る**。

v3では次をSignatureにする。

```text
Library rail
→ ASMR Media Deck
→ Sound Map / Timestamps
```

- 選択中YouTubeサムネイルをPlayer周辺の弱いAmbient visualとして利用する
- Player、再生操作、Seek、Volumeを1つのMedia Deckとして扱う
- TimestampはLyricsの代用品ではなく「音の場所を探すSound Map」として扱う
- Themeをユーザー選択可能にし、AccentだけでなくBackground / Surface / Selected stateも連動させる
- Card / Shadow / Gradientは全面禁止せず、Media focusや独立Surfaceなど意味がある場所で使う
- 「シンプルにした量」を品質指標にしない

### Regression guard

- `theme.css / workspace.css / settings.css` をv3 Visual Source of Truthとして明示する
- `tests/static-check.mjs` でCSSのLoad orderを確認する
- `app-config.js / timestamp-ui.js / ui-enhancements.js / appearance.js` 等の正式Runtime接続をCIで確認する
- 設定Themeは既存 `asmrtube.settings.v1` 内の任意項目とし、Library Schemaへ混ぜない
- User-facing UIの大変更は、Static ValidationだけでVisual完成扱いにしない

### Do not do

- User Validatedな別Projectの「減らしたもの」まで、そのまま成功要因だと決めつけない
- `minimal / simple / clean` をVisual品質そのものとして扱わない
- Repositoryにファイルが存在するだけで実装済みと扱わない。`index.html` のRuntime Pathまで確認する
- 色違いだけで新しいDesign Directionを作ったことにしない

---

## L-001 Media workspaceではPlayerとTimelineを主役にする

- **Date:** 2026-08-31
- **Type:** Visual / Architecture
- **Guide candidate:** no — `web-project-guide` の `VD-001 LyricTube Media Workspace` に既に一般化済み
- **Status:** Partially superseded by L-002

### Context

ASMRTube v2.0ではLyricTube、Lineup Lab、VReviewの見た目を組み合わせ、Gradient背景、Dashboard Hero、Stat Card、複数のCard surfaceを追加した。

機能整理には役立ったが、ASMRを日常的に「選ぶ → 再生する → タイムスタンプへ飛ぶ」という主要Taskに対しては、補助UIのVisual weightがPlayer / Timestampと競合しやすかった。

### Decision

ASMRTubeは `MEDIA + TOOL` として、LyricTubeでユーザー評価済みの `VD-001 LyricTube Media Workspace` をVisual Referenceとして使う。

```text
Library rail
→ Player / current ASMR
→ Timestamp reading surface
```

再利用するのは具体的な色や幅ではなく、次の構造。

- 左Libraryを高密度だが明確なRailにする
- Playerを最も強いSurfaceにする
- TimestampをLyrics同様のReading Surfaceとして扱う
- Transport / Volume / Item info等は同じ強さのCard群にせずSection / Dividerで整理する
- Active stateは大きなAccent塗りよりSurface差 + Accent lineを優先する
- Gradient / Glow / ShadowはHierarchyの代わりに使わない

### Revision after v2.4 user review

L-001の「Hierarchy」の判断は維持するが、「LyricTubeの装飾削減もASMRTubeに適する」という解釈は撤回する。

ASMRTubeではASMR Artwork / Theme / Player deck等、TaskとContentに由来するVisual identityを別途持たせる。

### Regression guard

- Visualを意味のある範囲で変更した場合は、最終状態を実ブラウザまたはScreenshotで確認する。確認できない場合は作業報告へ `Visual: Not verified` と記録する
- 見た目を合わせるためにStorage key / Timestamp schema / Player behaviorを変更しない
