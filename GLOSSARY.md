# Photon 獨立化

此處定義 Photon 與 Gravito 整合的責任用語。

## Language

**Photon Engine**:
可獨立使用的 HTTP 引擎，涵蓋路由、請求與回應、中介層及 HTTP 錯誤處理。
_Avoid_: Gravito 微核心

**Gravito Adapter**:
連接 Photon Engine 與 Gravito 框架服務的整合層。
_Avoid_: 未限定用途的 Adapter

**Runtime Adapter**:
連接 Photon Engine 與特定執行環境的整合層。
_Avoid_: Gravito Adapter
