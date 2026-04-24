import { Boxes, Cpu, Database, GitBranch, Lock, Network, Shield, Zap } from 'lucide-react'

import type { TranslationMap } from './types'

export interface PatternsTranslations {
  breadcrumb: string
  title: string
  subtitle: string
  intro: string
  composable_title: string
  composable_subtitle: string
  composable_desc: string
  hero_title: string
  hero_subtitle: string
  hero_desc: string
  example_code: string
  explore_routing: string
  review_metrics: string
  reliability_label: string
  reliability_title: string
  production_ready: string
  patterns: {
    id: string
    title: string
    desc: string
    technical: string
    tags: string[]
    icon: any
    code: string
    category: string
  }[]
}

export const patternsTranslations: TranslationMap<PatternsTranslations> = {
  en: {
    breadcrumb: 'HOME',
    title: 'Patterns',
    subtitle: 'The Architectural Guide',
    intro: 'INTRODUCTION',
    hero_title: 'Architectural',
    hero_subtitle: 'Patterns',
    hero_desc:
      'Proven structures for building invisible, high-performance orchestration layers. Tested across millions of requests.',
    composable_title: 'Composable',
    composable_subtitle: 'System_Design',
    composable_desc:
      'Photon patterns are designed to be composable. Mix and match these architectural blocks to create the ultimate orchestration kernel.',
    explore_routing: 'Explore Routing Protocol',
    review_metrics: 'Review Performance Metrics',
    reliability_label: 'SYSTEM_RELIABILITY',
    reliability_title: 'High_Availability_Cluster',
    production_ready: 'PRODUCTION_READY',
    example_code: 'EXAMPLE_CODE',
    patterns: [
      {
        id: 'PTN_01',
        icon: Zap,
        title: 'Reverse Proxy Proxy',
        category: 'Performance',
        desc: 'Direct instruction-level forwarding between nodes without intermediate shims.',
        technical: 'ZERO_COPY_PROXY',
        tags: ['Fast', 'Low Memory'],
        code: 'app.get("/*", proxy.pipe("upstream.node"))',
      },
      {
        id: 'PTN_02',
        icon: Shield,
        title: 'Validation Guard',
        category: 'Type Safety',
        desc: 'Compile-time schema validation ensuring 100% type safety for inbound payloads.',
        technical: 'AOT_VALIDATION',
        tags: ['Secure', 'Type Safe'],
        code: 'app.post("/data", { schema }, handler)',
      },
      {
        id: 'PTN_03',
        icon: Database,
        title: 'Atomic CRUD',
        category: 'Data Persistence',
        desc: 'Standardized data access patterns optimized for Atlas ORM v1.6.0 and SQL pooling.',
        technical: 'ATOMIC_IO',
        tags: ['Database', 'SQL'],
        code: 'const user = await User.find(id)',
      },
      {
        id: 'PTN_04',
        icon: Lock,
        title: 'Sentinel Shield',
        category: 'Security',
        desc: 'Middleware-based authentication and authorization using the Sentinel protocol.',
        technical: 'ID_MANAGEMENT',
        tags: ['Auth', 'Security'],
        code: 'app.use(sentinel.shield())',
      },
      {
        id: 'PTN_05',
        icon: GitBranch,
        title: 'Resource Controller',
        category: 'API Design',
        desc: 'MVC-compliant resource management for complex entity relationships.',
        technical: 'CONTROLLER_DISPATCH',
        tags: ['MVC', 'Structure'],
        code: 'routes.resource("photos", PhotoController)',
      },
      {
        id: 'PTN_06',
        icon: Boxes,
        title: 'Context Pooling',
        category: 'Memory',
        desc: 'Recycling request context objects to eliminate garbage collection overhead.',
        technical: 'MEM_RECYCLING',
        tags: ['Performance', 'GC Free'],
        code: 'const ctx = contextPool.acquire()',
      },
      {
        id: 'PTN_07',
        icon: Network,
        title: 'Model Injection',
        category: 'Developer Experience',
        desc: 'Automatic entity resolution based on route parameters and database state.',
        technical: 'ENTITY_BINDING',
        tags: ['DX', 'Automation'],
        code: 'routes.model("user", User)',
      },
      {
        id: 'PTN_08',
        icon: Cpu,
        title: 'Static Dispatch',
        category: 'Compile-Time',
        desc: 'Directly dispatching to handler instructions bypassing the router middleware stack.',
        technical: 'STATIC_COMPILATION',
        tags: ['Runtime', 'Kernel'],
        code: '// Automatic optimization based on handler analysis',
      },
      {
        id: 'PTN_09',
        icon: Boxes,
        title: 'Request Context (ALS)',
        category: 'Kernel',
        desc: 'Global request-scoped storage using AsyncLocalStorage, eliminating prop drilling.',
        technical: 'ASYNC_LOCAL_STORAGE',
        tags: ['Kernel', 'DX'],
        code: 'const userId = reqCtx.get("user_id")',
      },
    ],
  },
  'zh-TW': {
    breadcrumb: '首頁',
    title: '架構模式',
    subtitle: '技術架構指南',
    intro: '介紹',
    hero_title: '架構',
    hero_subtitle: '模式',
    hero_desc: '用於構建隱形、高性能協調層的成熟結構。經過數百萬次請求測試。',
    composable_title: '可組合的',
    composable_subtitle: '系統設計',
    composable_desc: 'Photon 模式設計為可組合的。混合搭配這些架構塊，打造終極協調核心。',
    explore_routing: '探索路由協議',
    review_metrics: '查看效能指標',
    reliability_label: '系統可靠性',
    reliability_title: '高可用性叢集',
    production_ready: '生產就緒',
    example_code: '範例代碼',
    patterns: [
      {
        id: 'PTN_01',
        icon: Zap,
        title: '反向代理轉發',
        category: '效能優化',
        desc: '節點之間的直接指令級轉發，不需中間墊片。',
        technical: '零拷貝代理',
        tags: ['極速', '低記憶體'],
        code: 'app.get("/*", proxy.pipe("upstream.node"))',
      },
      {
        id: 'PTN_02',
        icon: Shield,
        title: '驗證防護',
        category: '型別安全',
        desc: '編譯時架構驗證，確保入站負載 100% 型別安全。',
        technical: 'AOT 驗證',
        tags: ['安全', '型別安全'],
        code: 'app.post("/data", { schema }, handler)',
      },
      {
        id: 'PTN_03',
        icon: Database,
        title: '原子 CRUD',
        category: '資料持久化',
        desc: '針對 Atlas ORM v1.6.0 和 SQL 連接池優化的標準化資料存取模式。',
        technical: '原子 I/O',
        tags: ['資料庫', 'SQL'],
        code: 'const user = await User.find(id)',
      },
      {
        id: 'PTN_04',
        icon: Lock,
        title: 'Sentinel 盾牌',
        category: '安全性',
        desc: '使用 Sentinel 協議的基於中介軟體的身份驗證和授權。',
        technical: '身份管理',
        tags: ['驗證', '安全'],
        code: 'app.use(sentinel.shield())',
      },
      {
        id: 'PTN_05',
        icon: GitBranch,
        title: '資源控制器',
        category: 'API 設計',
        desc: '符合 MVC 規範的資源管理，適用於複雜的實體關係。',
        technical: '控制器調度',
        tags: ['MVC', '結構'],
        code: 'routes.resource("photos", PhotoController)',
      },
      {
        id: 'PTN_06',
        icon: Boxes,
        title: 'Context 連接池',
        category: '記憶體優化',
        desc: '回收請求 Context 對象，消除垃圾回收開銷。',
        technical: '記憶體回收',
        tags: ['效能', '無 GC'],
        code: 'const ctx = contextPool.acquire()',
      },
      {
        id: 'PTN_07',
        icon: Network,
        title: '模型注入',
        category: '開發者體驗',
        desc: '基於路由參數和資料庫狀態的自動實體解析。',
        technical: '實體綁定',
        tags: ['DX', '自動化'],
        code: 'routes.model("user", User)',
      },
      {
        id: 'PTN_08',
        icon: Cpu,
        title: '靜態調度',
        category: '編譯時優化',
        desc: '直接調度到處理程序指令，繞過路由中介軟體堆疊。',
        technical: '靜態編譯',
        tags: ['執行階段', '內核'],
        code: '// 根據處理程序分析進行自動優化',
      },
      {
        id: 'PTN_09',
        icon: Boxes,
        title: '請求上下文 (ALS)',
        category: '核心引擎',
        desc: '使用 AsyncLocalStorage 的全域請求作用域存儲，消除參數透傳 (Prop Drilling)。',
        technical: '非同步本地存儲',
        tags: ['內核', '開發者體驗'],
        code: 'const userId = reqCtx.get("user_id")',
      },
    ],
  },
}
