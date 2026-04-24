import {
  Activity,
  Book,
  CheckSquare,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  List,
  Lock,
  Network,
  Play,
  Radio,
  Settings,
  Share2,
  Shield,
  TestTube,
  Webhook,
  Zap,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: any
  href: string
}

export interface NavGroup {
  category: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    category: 'GETTING_STARTED',
    items: [
      { id: 'intro', label: 'INTRODUCTION', icon: Book, href: '/docs/intro' },
      { id: 'quickstart', label: 'QUICKSTART', icon: Play, href: '/docs/quickstart' },
      { id: 'structure', label: 'PROJECT_STRUCTURE', icon: List, href: '/docs/structure' },
    ],
  },
  {
    category: 'TECHNICAL_ARCHITECTURE',
    items: [
      { id: 'routing', label: 'ROUTING_SYSTEM', icon: Share2, href: '/docs/routing' },
      { id: 'patterns', label: 'PATTERN_GALLERY', icon: Layers, href: '/patterns' },
      { id: 'proxy', label: 'PROXIES_GATEWAY', icon: Globe, href: '/docs/proxy' },
      { id: 'cbor', label: 'CBOR_PROTOCOL', icon: Cpu, href: '/docs/cbor' },
      { id: 'htmx', label: 'HTMX_PRISM_HDA', icon: Layers, href: '/docs/htmx' },
      { id: 'context', label: 'CONTEXT_API', icon: Activity, href: '/docs/context' },
    ],
  },
  {
    category: 'CORE_LIFECYCLE',
    items: [
      { id: 'middleware', label: 'MIDDLEWARE_MATRIX', icon: Layers, href: '/docs/middleware' },
      { id: 'exceptions', label: 'EXCEPTION_HANDLING', icon: Shield, href: '/docs/exceptions' },
      { id: 'validation', label: 'DATA_VALIDATION', icon: CheckSquare, href: '/docs/validation' },
      { id: 'performance', label: 'PERF_TUNING', icon: Settings, href: '/docs/performance' },
    ],
  },
  {
    category: 'PHYSICAL_LAYER',
    items: [
      { id: 'ilo', label: 'INSTRUCTION_LEVEL_OPT', icon: Cpu, href: '/docs/ilo' },
      { id: 'zero-copy', label: 'ZERO_COPY_BUFFERING', icon: HardDrive, href: '/docs/zero-copy' },
      { id: 'memory', label: 'RECYCLED_CONTEXT', icon: Activity, href: '/docs/memory' },
    ],
  },
  {
    category: 'FULLSTACK_SUITE',
    items: [
      { id: 'prism', label: 'PRISM_TEMPLATES', icon: Layers, href: '/docs/prism' },
      { id: 'ion', label: 'ION_SPA_BRIDGE', icon: Share2, href: '/docs/ion' },
      { id: 'atlas', label: 'ATLAS_ORM', icon: Database, href: '/docs/atlas' },
      { id: 'ssg', label: 'STATIC_SITE_GEN', icon: Globe, href: '/docs/ssg' },
    ],
  },
  {
    category: 'EXTENSIONS_ECO',
    items: [
      { id: 'ecosystem', label: 'ECOSYSTEM_REGISTRY', icon: Zap, href: '/ecosystem' },
      { id: 'chromatic', label: 'CHROMATIC_COLORS', icon: Layers, href: '/docs/chromatic' },
      { id: 'resilience', label: 'ENTERPRISE_RESILIENCE', icon: Shield, href: '/docs/resilience' },
      { id: 'rpc-beam', label: 'BEAM_RPC_CLIENT', icon: Network, href: '/docs/rpc-beam' },
      { id: 'testing', label: 'TESTING_SUITE', icon: TestTube, href: '/docs/testing' },
      { id: 'auth', label: 'SENTINEL_AUTH', icon: Lock, href: '/docs/auth' },
      { id: 'realtime', label: 'REALTIME_RIPPLE', icon: Radio, href: '/docs/realtime' },
      { id: 'webhooks', label: 'WEBHOOK_ECHO', icon: Webhook, href: '/docs/webhooks' },
      { id: 'deployment', label: 'BUN_DEPLOYMENT', icon: Globe, href: '/docs/deployment' },
      {
        id: 'integrations',
        label: '3RD_PARTY_INTEGRATIONS',
        icon: Layers,
        href: '/docs/integrations',
      },
    ],
  },
  {
    category: 'LAB_EXPERIMENTS',
    items: [
      {
        id: 'ex-hello-world',
        label: 'ULTRA_HELLO_WORLD',
        icon: Play,
        href: '/docs/ex-hello-world',
      },
      {
        id: 'ex-file-stream',
        label: 'ZERO_COPY_STREAM',
        icon: HardDrive,
        href: '/docs/ex-file-stream',
      },
      {
        id: 'ex-middleware',
        label: 'MIDDLEWARE_PULSE',
        icon: Activity,
        href: '/docs/ex-middleware',
      },
      {
        id: 'ex-crud-atlas',
        label: 'ATOMIC_CRUD_ATLAS',
        icon: Database,
        href: '/docs/ex-crud-atlas',
      },
      {
        id: 'ex-file-upload',
        label: 'ZERO_COPY_UPLOADS',
        icon: HardDrive,
        href: '/docs/ex-file-upload',
      },
    ],
  },
]

// Flat version for easy lookups
export const navItems = navGroups.flatMap((g) => g.items)
