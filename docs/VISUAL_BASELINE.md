# ASMRTube Visual Baseline

## Status

- Candidate date: 2026-08-31
- App Version: `2.4.0`
- Reference direction: `web-project-guide` `VD-001 LyricTube Media Workspace`
- Reference project: `EliteMay/lyrictube`
- Validation state: **Implemented / Static validation pending / User visual validation pending**

この文書はASMRTube v2.4以降の見た目を比較するためのVisual Referenceです。

現時点ではコード上のDirectionを定義した段階であり、ユーザーがGitHub Pages上の実画面を確認するまでは **User Validated** へ昇格しません。

## Canonical Visual File

| Role | Source of Truth |
|---|---|
| Media Workspace composition | `workspace.css` |
| Legacy base / compatibility | `styles.css` / `asmr-overrides.css` / `ui-base-v2.css` / `product-v2.css` |
| Feature-specific detail styles | `quality-v21.css` / `library-tools-v22.css` |

`workspace.css` は旧Visual layerより後に読み込み、現在のComposition / Surface / Densityを決めます。

## Visual Invariants

### 1. Signature layout

Desktopは次の役割分担を基本にします。

```text
Library rail
→ Player / current ASMR
→ Timestamp reading surface
```

- PlayerとTimestampがPrimary surfaceであること。
- 補助機能を同じVisual weightのCard群へ戻さないこと。

### 2. Sidebar

- 高密度でもSearch / View / Playlist / Libraryの境界が分かること。
- Active itemはSurface差 + Accent lineを基本にすること。
- Accent全面塗りを一覧全体へ増やさないこと。

### 3. Player / Controls

- PlayerはMediaとして明確に強いSurfaceを維持すること。
- Transport / Seek / Volume / Item infoはSection / Divider中心にすること。
- ShadowはPlayerなどElevationが意味を持つ場所に限定すること。

### 4. Timestamp

- Timestamp panelは一覧CardではなくReading / Navigation surfaceとして扱うこと。
- Active timestampは内容を読みやすくし、現在位置が分かること。
- Parent / Chapter表示を装飾で重くしすぎないこと。

### 5. Effects

- 背景全体のGradient / Glowを通常Workspaceへ戻さない。
- 大量のShadow / Rounded CardをHierarchyの代わりに使わない。
- Typography / Spacing / Divider / Surface差を先に使う。

### 6. Responsive

- Desktopを縮めるだけでなく、狭い画面では `Player → Timestamp` の順に再構成する。
- 主要操作とTimestamp navigationを画面外へ失わない。

## Change Policy

このBaselineから意味のある変更を行う場合は次を確認します。

1. 主要Taskが改善するか
2. Player / TimestampのPrimary hierarchyを壊さないか
3. Storage / Player behavior等の機能仕様をVisual都合で変更していないか
4. Static validation後、実ブラウザまたはScreenshotで確認したか
5. ユーザー評価が得られた場合、この文書のValidation stateを更新するか
