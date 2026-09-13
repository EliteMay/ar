# ASMRTube v3.0.1 Defect Fix Work Report

- Date: 2026-09-13
- Target: `EliteMay/ar`
- Base commit: `49b1494ce12b3e09b50329fa3372b5ec6d22817a`
- Guide baseline: `EliteMay/web-project-guide@20e0d8dec40f05eaca57002ba7d0f99716b5cef0`
- Change type: bugfix / reliability / security / architecture / testing

## Purpose

2026-09-13のRepository監査で確認した欠陥を、保存Schemaと既存Storage keyを維持したまま修正する。

## Fixed

1. Timestamp Importを`timestamp-parser.js`のCanonical Parserへ接続。
2. Parser regressionをNode testとBrowser smokeへ接続。
3. JSON Importを`core-utils.js`でvalidate / normalizeし、unsafe ID / videoId / unknown fieldをCanonical Dataへ流さない。
4. Storage write失敗を成功扱いせずLast Durable StateへRollbackし、診断とUser feedbackを残す。
5. App Version / Build / Schemaの表示Ownerを`app-config.js`へ一本化。
6. YouTube Playerを`youtube-runtime.js` Adapterへ統合し、Global function monkey patchを削除。
7. 動画URL変更時にLoaded Player stateをinvalidate。
8. Playback shortcutがButton / Link / Form control / Dialog操作を横取りしないよう修正。
9. Thumbnail非表示時はLibrary / Dashboard / selected artworkの画像要素・ambient URLを作らない。
10. Volume保存を毎input writeからdebounce + change flushへ変更。
11. Snapshot Restore前状態へ戻すUIをData Managementへ追加。
12. Metadata fetchへ6秒timeoutとstale-response guardを追加。
13. YouTube URL host / 11文字Video IDを厳格化。
14. 起動時Selected itemをDefault sort（追加順）の先頭と一致させる。
15. Dashboard終了時にCanonical Selectionを再renderしTopbarを復元。
16. `app-quality-v21.js / timestamp-polish-v21.js / library-tools-v22.js`等のVersion別Patch Runtimeを退役。
17. Local-only bounded Runtime Diagnosticsを追加。
18. Headless Chrome Browser SmokeをCIへ追加。

## Compatibility

- `asmrtube.library.v1`: unchanged
- `asmrtube.settings.v1`: unchanged
- `asmrtube.timestamp.view.v1`: unchanged
- Library schema version: `1` unchanged
- Existing old timestamp objects remain readable
- YouTube Data API key remains unnecessary
- GitHub Pages static hosting remains supported

New local diagnostic key:

```text
asmrtube.diagnostics.v1
```

Diagnostics is non-canonical and can be cleared without affecting Library data.

## Validation

Required before merge:

- shared JavaScript / JSON baseline
- `node tests/static-check.mjs`
- `node tests/core-utils.test.mjs`
- `node tests/timestamp-parser.test.mjs`
- Headless Chrome `tests/browser-smoke.html`
- final PR / main CI success

Browser smoke covers Library render, selection, Settings open/close, Canonical Parser import, Dashboard exit, thumbnail-off network element suppression and focused-button Space handling.

## Not verified here

- Mobile real device
- Long-running YouTube playback under every browser extension / blocker combination
- User-facing visual preference / final visual approval

These are not treated as verified by Static / CI checks alone.
