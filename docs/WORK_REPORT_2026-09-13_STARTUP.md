# ASMRTube Startup Loading Fix Work Report

Date: 2026-09-13

## Symptom

GitHub PagesのASMRTubeは画面自体が表示される一方、Chromeのタブが読み込み完了にならない状態が継続した。再読み込みやDevTools Console操作も反応しにくかった。

Chrome Task Managerの実測では、ASMRTubeタブのCPUが約114%まで上がっている一方、Networkは0だった。

## Root Cause

前回はYouTube IFrame APIが初期Critical Pathにあることを原因候補として遅延読込へ変更したが、今回の実測はNetwork待ちではなくMain Thread側のbusy loopを示していた。

`app-config.js` はDocument全体を `childList + subtree` で監視する `MutationObserver` を使い、callbackごとに `applyVersion()` を実行していた。`applyVersion()` は `document.title` を書き換えるため、その書き換え自身が新しいDOM mutationを発生させる。

`app.js` が初期DOMを更新した時点では `.sidebar-version strong` がまだ存在せずObserverが解除されないため、startup中に自己再発火する経路が成立していた。これが後続Scriptのparser進行や通常操作を阻害するFailure Mechanismと判断した。

## Fix

- `app-config.js` のDocument-wide `MutationObserver` を削除
- Version / Build反映は `DOMContentLoaded` 後に1回だけ実行
- YouTube reliability runtimeの遅延読込は維持
- Buildを `20260913-1` へ更新
- `tests/static-check.mjs` にstartup observer再導入禁止のRegression Guardを追加
- `PROJECT_LEARNINGS.md` にL-003として原因・予防を記録

## Compatibility

- Library Schema変更なし
- Storage key変更なし
- Timestamp Schema変更なし
- App Versionは3.0.0のまま
- YouTube Playerは引き続きOn Demand load

## Validation

- PR CI quality check: success
- Static check: startup observer guardを含めてsuccess
- 実Chrome / GitHub Pages: Merge / deploy後にユーザー確認が必要

## Completion Condition

次を満たして初めてこの不具合を解消済みとする。

1. GitHub Pagesの最終revisionが公開される
2. ASMRTubeを新しく開いたときChromeのタブ読み込み表示が終了する
3. Chrome Task ManagerでASMRTubeタブのCPUが高止まりしない
4. ライブラリ / 設定 / 再生導線が通常操作できる
