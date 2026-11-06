---
status: accepted
---

# Photon 使用獨立 GitHub repository 與發布生命週期

為降低 Photon 與 Gravito CI 互相牽動，Photon 移至獨立 GitHub repository，自主管理版本、發布與必要 CI；跨 repository 相容性驗證另外執行，不作為 Photon 日常修改等待 Gravito 完整測試的前提。接受跨 repository 維護及版本整合成本，取代 ADR 0001「保留 Monorepo」的限制；其餘引擎與整合責任邊界仍有效。

此次搬遷維持目前套件名稱、使用方式與公開 API，不另外引入 API 改版。新 repository 保留篩選後的 Photon 相關提交歷史，原 repository 保留既有歷史；篩選可能改變 commit SHA。

目標為公開的 `gravito-framework/photon`，套件名稱維持 `@gravito/photon`。搬遷 Photon 本體、測試、benchmark、套件文件、發布流程及 Photon 官網；官網保留既有技術與網址，改用已發布的 Gravito 依賴，部署失敗不阻擋引擎發布。

`@gravito/photon-gravito` 留在 Gravito repository，由 Gravito 維護配對版本與整合測試。Gravito 改用 registry 發布的 Photon 版本，不保留 Photon 原始碼副本或 Git submodule；跨 repository 修改透過預發布版本驗證，接受額外發布步驟以維持 CI 獨立。

首次獨立發布以 `3.0.0-beta.1` 驗證，再發布 `3.0.0`。major 反映先前引擎獨立化的 API 遷移，本次 repository 搬遷不新增 API 變動；registry 上既有 `2.0.1` 仍是依賴 Gravito 的舊產物，不能用來代替目前本地獨立引擎。

切換順序為：新 repository 通過獨立驗證、發布 beta、驗證 Gravito 整合，再發布正式版；原 repository 的 Photon 原始碼與發布入口僅在消費端完成切換後移除。切換期間短暫凍結 Photon 修改；驗證失敗則維持原流程，不提前切換。引擎與官網 CI 按路徑分開觸發，共享設定變更才同時驗證兩者；官網建置與部署不列為引擎發布的必要關卡。

上述原則於 2026-11-06 經使用者確認完整方案。歷史抽取基準為 `e045d3bf764bab212444e426bd8fc0cf375d22e3`，另納入相關 Bun 1.4.4 未提交設定，保留原工作樹其他修改；此決策不代表已執行搬遷或發布。共用 runner 或組織額度造成的排隊仍需另外驗證，拆分本身不保證消除所有等待。

2026-11-06 後續確認採分階段執行：先完成引擎獨立，官網相容性修正與部署切換延後。官網原始碼與歷史保留於新 repository，但其 workflow 暫存 `docs/deferred/`，不觸發 CI 或部署；原站維持既有部署。官網未完成不阻擋引擎 repository 建立與引擎自身的發布驗證，亦不作為引擎正式發布的必要條件。
