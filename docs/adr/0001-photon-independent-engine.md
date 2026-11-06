---
status: accepted
---

# Photon 擁有獨立 HTTP 引擎，Gravito 透過專用套件整合

> 2026-11-06：[ADR 0002](0002-photon-independent-repository.md) 取代本文「保留 Monorepo」限制，其餘決策仍有效。

Photon 現有 HTTP 實作與公開型別依賴 core，工作區原始碼與發布依賴亦解析至不同 core 版本。為達成 Library First，Photon 下一個 major 將擁有 Routing、Request/Response、Middleware、HTTP Error Handling 與 Runtime Adapter 的必要能力，優先遷移及整理現有實作，不重寫穩定引擎。

Gravito Adapter 由獨立整合套件承接，依賴 Photon 與明確支援的 core 版本；Photon 不反向依賴 core 或整合套件，公開 declarations 也不得要求它們。容器、RequestScope 與命名路由 URL 生成屬框架整合層；獨立 Context 不建立框架服務。Runtime Adapter 與 Gravito Adapter 是不同責任。

JWT、Rate Limit 等既有選用入口第一階段保留，不全面拆包；其依賴不得重新引入 core。Circuit Breaker 連同 resilience 整合移至 Gravito 側，保留既有能力與遷移方式，不為去除相依而重寫實作。

## 相容性與遷移

- 在 Photon 下一個 major 切換，提供版本配對、遷移文件與 Gravito 整合測試；具體版本範圍由 Spec 與驗證確定。
- 基本路由、中介層與錯誤處理 API 優先維持。框架相關舊入口改為明確遷移，不在 Photon 留下會載入 core 的轉接出口。
- adapter、Circuit Breaker 的匯入移至整合套件；native、router 等底層 API 逐項列替代方式。能獨立維持的名稱可保留別名，其他列為 Breaking Changes。
- 不承諾所有歷史 core 版本，也不增加舊版功能回補工作。

## 取捨與後續約束

同包可選 peer／轉接出口雖可減少匯入路徑變動，但容易混淆框架與獨立型別邊界；選擇獨立整合套件，接受 major 遷移成本。全面拆分 JWT、Rate Limit 等則超出最小獨立引擎範圍，暫不採用。

保留 Monorepo，Bun 1.4.4 為完整驗收環境；既有其他 Runtime 僅做回歸盤點，不新增支援承諾。套件名稱、精確 exports、型別擴充機制與版本配對由後續 Spec 定義；此 ADR 不代表這些細節或產品實作已完成。

決策於 2026-11-05 經使用者兩輪確認。完成標準仍為乾淨 Bun/TypeScript 專案無 core、無 workspace 的基本 HTTP API，以及獨立建置、測試、打包驗證、文件與可重現 Benchmark。
