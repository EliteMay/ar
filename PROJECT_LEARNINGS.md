# ASMRTube Project Learnings

この文書は、日々の変更履歴ではなく、今後のASMRTube修正で再利用価値が高い判断・失敗・成功を残す長期メモです。

## L-001 Media workspaceではPlayerとTimelineを主役にする

- **Date:** 2026-08-31
- **Type:** Visual / Architecture
- **Guide candidate:** no — `web-project-guide` の `VD-001 LyricTube Media Workspace` に既に一般化済み

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

### Regression guard

- `workspace.css` を現在Visual compositionのSource of Truthとして、旧 `product-v2.css` より後に読み込む
- `tests/static-check.mjs` で `workspace.css` の存在とLoad orderを確認する
- Visualを意味のある範囲で変更した場合は、最終状態を実ブラウザまたはScreenshotで確認する。確認できない場合は作業報告へ `Visual: Not verified` と記録する

### Do not do

- LyricTubeの紫Accent、Sidebar幅、3 Pane寸法を万能Templateとして固定しない
- 見た目を合わせるためにStorage key / Timestamp schema / Player behaviorを変更しない
- 旧Product ShellのGradient / Shadow / Cardを別CSSで再び積み上げてVisual hierarchyを二重化しない
