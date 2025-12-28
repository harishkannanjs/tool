"use client"

import JSZip from "jszip"
import {
  analyzeWebsiteStructure,
  getDefaultStructureSuggestions,
  type AIAnalysisResult,
} from "./ai/analyze-website"
import { validateImportsEnhanced, type GeneratedFile } from "./ai/validate-imports"
import { validateAndFixCodebase, generateValidationReport, type ValidationResult } from "./ai/zod-validator"

interface CrawlResult {
  html: string
  cssFiles: { url: string; content: string }[]
  jsFiles: { url: string; content: string }[]
  inlineStyles: string[]
  inlineScripts: string[]
}

interface ParsedContent {
  title: string
  description: string
  favicon: string | null
  navItems: { text: string; href: string; ariaLabel?: string }[]
  hero: { title: string; subtitle: string; ctaText: string; ctaLink: string; backgroundImage: string | null } | null
  sections: any[]
  footerLinks: any[]
  images: any[]
  formElements: any[]
  colors: { primary: string; secondary: string; accent: string; background: string; text: string }
  metadata: any
  aiSuggestions?: AIAnalysisResult
  bodyContent?: string  // The actual body HTML from the crawled site
  headContent?: string  // The head content (meta tags, etc.)
  crawledAssets?: CrawlResult  // All fetched CSS/JS assets
}

export async function generateCodebase(
  domain: string,
  parsedContent: ParsedContent,
  onProgress?: (files: string[]) => void,
): Promise<{ files: string[]; zipBlob: Blob; validationReport?: any; typeCheckReport?: string; zodValidation?: ValidationResult }> {
  const projectName = domain.replace(/\./g, "-")
  const titleName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)

  const generatedFiles: GeneratedFile[] = []
  const fileNames: string[] = []

  const addFile = (path: string, content: string) => {
    generatedFiles.push({ path, content })
    fileNames.push(path)
    onProgress?.(fileNames)
  }

  // Simulate generation delay for UX
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // ============ AI STRUCTURE ANALYSIS (Optional) ============
  // Get AI suggestions for page/component architecture (if enabled)
  // Falls back gracefully if Gemini is not available
  let aiSuggestions: AIAnalysisResult = getDefaultStructureSuggestions(
    parsedContent,
  )

  try {
    const geminiAnalysis = await analyzeWebsiteStructure(parsedContent)
    if (geminiAnalysis) {
      aiSuggestions = geminiAnalysis
    }
  } catch (error) {
    // Graceful fallback - generator continues without AI
    console.warn(
      "AI structure analysis skipped, using default suggestions",
      error,
    )
  }

  // Store AI suggestions for use during generation
  parsedContent.aiSuggestions = aiSuggestions

  // ============ CONFIG FILES ============
  addFile("package.json", generatePackageJson(projectName))
  await delay(50)

  addFile("tsconfig.json", generateTsConfig())
  await delay(30)

  addFile("tsconfig.node.json", generateTsConfigNode())
  await delay(30)

  addFile("vite.config.ts", generateViteConfig())
  await delay(30)

  addFile("tailwind.config.js", generateTailwindConfig(parsedContent.colors))
  await delay(30)

  addFile(
    "postcss.config.js",
    `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
  )
  await delay(30)

  addFile(".eslintrc.cjs", generateEslintConfig())
  await delay(30)

  addFile(".prettierrc", JSON.stringify({ semi: false, singleQuote: true, tabWidth: 2, trailingComma: "es5" }, null, 2))
  await delay(30)

  addFile(".gitignore", generateGitignore())
  await delay(30)

  addFile("README.md", generateReadme(projectName, domain, parsedContent))
  await delay(30)

  // ============ ENTRY FILES ============
  addFile("index.html", generateIndexHtml(parsedContent.title))
  await delay(30)

  addFile("src/main.tsx", generateMainTsx())
  await delay(30)

  addFile("src/App.tsx", generateAppTsx(parsedContent))
  await delay(50)

  addFile("src/vite-env.d.ts", `/// <reference types="vite/client" />`)
  await delay(20)

  // ============ TYPES ============
  addFile("src/types/index.ts", generateTypes())
  await delay(40)

  addFile("src/types/api.types.ts", generateApiTypes())
  await delay(40)

  addFile("src/types/user.types.ts", generateUserTypes())
  await delay(40)

  // ============ CONSTANTS ============
  addFile("src/constants/index.ts", generateConstants(domain, parsedContent))
  await delay(30)

  addFile("src/constants/routes.ts", generateRouteConstants(parsedContent))
  await delay(30)

  addFile("src/constants/api.ts", generateApiConstants(domain))
  await delay(30)

  // ============ UTILS ============
  addFile("src/utils/index.ts", generateUtilsIndex())
  await delay(30)

  addFile("src/utils/helpers.ts", generateHelpers())
  await delay(40)

  addFile("src/utils/validators.ts", generateValidators())
  await delay(40)

  addFile("src/utils/formatters.ts", generateFormatters())
  await delay(40)

  addFile("src/utils/storage.ts", generateStorage())
  await delay(40)

  addFile("src/utils/logger.ts", generateLogger())
  await delay(30)

  // ============ STYLES ============
  addFile("src/styles/globals.css", generateGlobalStyles(parsedContent.colors))
  await delay(30)

  // Add the bundled site CSS from crawled assets
  addFile("src/styles/site.css", generateBundledSiteCss(parsedContent))
  await delay(30)

  // ============ CONTEXT ============
  addFile("src/context/ThemeContext.tsx", generateThemeContext())
  await delay(50)

  addFile("src/context/AuthContext.tsx", generateAuthContext())
  await delay(50)

  // ============ HOOKS ============
  addFile("src/hooks/useApi.ts", generateUseApi())
  await delay(40)

  addFile("src/hooks/useAuth.ts", generateUseAuth())
  await delay(40)

  // ============ SERVICES ============
  addFile("src/services/api.service.ts", generateApiService(domain))
  await delay(50)

  addFile("src/services/auth.service.ts", generateAuthService())
  await delay(50)

  // ============ COMPONENTS - COMMON ============
  addFile("src/components/common/Button.tsx", generateButtonComponent())
  await delay(40)

  addFile("src/components/common/Input.tsx", generateInputComponent())
  await delay(40)

  addFile("src/components/common/Card.tsx", generateCardComponent())
  await delay(40)

  addFile("src/components/common/Modal.tsx", generateModalComponent())
  await delay(40)

  addFile("src/components/common/Loader.tsx", generateLoaderComponent())
  await delay(30)

  addFile(
    "src/components/common/index.ts",
    `export { Button } from './Button'
export { Input } from './Input'
export { Card } from './Card'
export { Modal } from './Modal'
export { Loader } from './Loader'
`,
  )
  await delay(20)

  // ============ COMPONENTS - LAYOUT ============
  addFile("src/components/layout/Header.tsx", generateHeaderComponentFromContent(parsedContent))
  await delay(40)

  addFile("src/components/layout/Footer.tsx", generateFooterComponentFromContent(parsedContent))
  await delay(40)

  addFile("src/components/layout/Layout.tsx", generateLayoutComponent())
  await delay(40)

  // ============ COMPONENTS - SECTIONS ============
  for (let i = 0; i < (parsedContent.sections || []).length; i++) {
    const section = parsedContent.sections[i]
    const fileName = `src/components/sections/Section${i + 1}.tsx`
    addFile(fileName, generateSectionComponentFromContent(section, i + 1, parsedContent.colors))
    await delay(40)
  }

  // Generate sections index for easier imports
  const sectionExports = (parsedContent.sections || [])
    .map((_, i) => `export { Section${i + 1} } from './Section${i + 1}'`)
    .join('\n')

  addFile(
    "src/components/sections/index.ts",
    sectionExports || "// Sections will be added here"
  )
  await delay(20)

  // ============ PAGES ============
  addFile("src/pages/Home.tsx", generateHomePageFromContent(parsedContent))
  await delay(50)

  addFile("src/pages/NotFound.tsx", generateNotFoundPage())
  await delay(30)

  // ============ VALIDATION STEP - AI ANALYSIS ============
  // ============ LAYER 1: ZOD VALIDATION & AUTO-FIX ============
  // Validate TypeScript syntax and component signatures
  // Also automatically fixes known issues
  console.log("🔍 Running TypeScript validation with Zod...")
  const { files: fixedFiles, result: zodValidation } = validateAndFixCodebase(generatedFiles)

  if (zodValidation.isValid) {
    console.log("✅ ZOD VALIDATION PASSED - No TypeScript errors detected")
  } else {
    console.error("🚨 ZOD VALIDATION FOUND ISSUES:")
    zodValidation.errors.forEach((error) => {
      console.error(`  ❌ ${error.file}${error.line ? ` (Line ${error.line})` : ''}: ${error.error}`)
      if (error.suggestion) {
        console.error(`     Suggestion: ${error.suggestion}`)
      }
    })
  }

  const typeCheckReport = generateValidationReport(zodValidation)

  // Update generatedFiles with fixed versions
  const filesAfterZodFix = fixedFiles

  // ============ LAYER 2: IMPORT VALIDATION ============
  // Validate all imports to ensure zero deployment errors
  const validationResult = validateImportsEnhanced(filesAfterZodFix)

  if (!validationResult.isValid) {
    console.error("🚨 IMPORT VALIDATION FAILED:")
    validationResult.errors.forEach((error) => {
      console.error(`  ❌ ${error.file}: ${error.error}`)
    })

    // Still create the ZIP but log warnings
    if (validationResult.warnings.length > 0) {
      console.warn("⚠️  VALIDATION WARNINGS:")
      validationResult.warnings.forEach((warning) => {
        console.warn(`  ⚠️  ${warning.file}: ${warning.error}`)
      })
    }
  } else {
    console.log("✅ IMPORT VALIDATION PASSED - All imports will resolve correctly")
  }

  // ============ FINAL: CREATE ZIP WITH VALIDATED CODE ============
  const zip = new JSZip()
  for (const file of filesAfterZodFix) {
    zip.file(file.path, file.content)
  }

  const zipBlob = await zip.generateAsync({ type: "blob" })

  // Include both validation reports in the metadata
  return {
    files: fileNames,
    zipBlob,
    validationReport: validationResult,
    typeCheckReport,
    zodValidation
  }
}

// ============ GENERATOR FUNCTIONS ============

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview",
        test: "vitest",
        "test:coverage": "vitest --coverage",
      },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.26.0",
        axios: "^1.7.3",
        clsx: "^2.1.1",
        "tailwind-merge": "^2.4.0",
      },
      devDependencies: {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@typescript-eslint/eslint-plugin": "^8.0.0",
        "@typescript-eslint/parser": "^8.0.0",
        "@vitejs/plugin-react": "^4.3.1",
        autoprefixer: "^10.4.20",
        eslint: "^8.57.0",
        "eslint-plugin-react-hooks": "^4.6.2",
        "eslint-plugin-react-refresh": "^0.4.9",
        postcss: "^8.4.40",
        tailwindcss: "^3.4.7",
        typescript: "^5.5.4",
        vite: "^5.4.0",
        vitest: "^2.0.5",
        "@testing-library/react": "^16.0.0",
        "@testing-library/jest-dom": "^6.4.8",
        jsdom: "^24.1.1",
      },
    },
    null,
    2,
  )
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: ".",
        paths: {
          "@/*": ["src/*"],
        },
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }],
    },
    null,
    2,
  )
}

function generateTsConfigNode(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true,
      },
      include: ["vite.config.ts"],
    },
    null,
    2,
  )
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
`
}

function generateTailwindConfig(colors: any): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        accent: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f8b4d8',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be123c',
          800: '#9d174d',
          900: '#831843',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
`
}

function generateEslintConfig(): string {
  return `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
`
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/
`
}

function generateReadme(projectName: string, domain: string, parsedContent: ParsedContent): string {
  return `# ${parsedContent.title}

TypeScript + React codebase generated from ${domain}

${parsedContent.description ? `> ${parsedContent.description}` : ""}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## Project Structure

\`\`\`
src/
├── components/      # Reusable UI components
│   ├── common/      # Button, Input, Card, Modal, Loader
│   ├── layout/      # Header, Footer, Sidebar, Layout
│   └── user/        # User-related components
├── pages/           # Page components
├── routes/          # Routing configuration
├── services/        # API and business logic services
├── controllers/     # Request/response handlers
├── models/          # Data models and entities
├── hooks/           # Custom React hooks
├── context/         # React context providers
├── middlewares/     # Route and API middlewares
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── constants/       # Application constants
└── styles/          # Global styles and CSS variables
\`\`\`

## Features

- TypeScript for type safety
- React 18 with hooks
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Vitest for testing
- ESLint + Prettier for code quality

## License

MIT
`
}

function generateIndexHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
}

function generateMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/site.css'  // Bundled CSS from the original site

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
}


function generateAppTsx(parsedContent: ParsedContent): string {
  // If we have crawled body content, render it directly without the complex layout
  if (parsedContent.bodyContent && parsedContent.bodyContent.trim().length > 100) {
    return `import Home from './pages/Home'

function App() {
  return <Home />
}

export default App
`
  }

  // Fallback to layout-based rendering
  return `import { Layout } from './components/layout/Layout'
import Home from './pages/Home'

function App() {
  return (
    <Layout>
      <Home />
    </Layout>
  )
}

export default App
`
}


function generateTypes(): string {
  return `export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SelectOption {
  value: string
  label: string
}

export type Status = 'idle' | 'loading' | 'success' | 'error'
`
}

function generateApiTypes(): string {
  return `export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  timeout?: number
}
`
}

function generateUserTypes(): string {
  return `export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'user' | 'guest'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData extends LoginCredentials {
  name: string
  confirmPassword: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
`
}

function generateConstants(domain: string, parsedContent: ParsedContent): string {
  return `export const APP_NAME = '${domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)}'
export const APP_VERSION = '1.0.0'

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  THEME: 'theme',
} as const

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const
`
}

function generateRouteConstants(parsedContent: ParsedContent): string {
  return `export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOT_FOUND: '*',
} as const

export type RouteKey = keyof typeof ROUTES
`
}

function generateApiConstants(domain: string): string {
  return `export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.${domain}'

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id: string) => \`/users/\${id}\`,
    UPDATE: (id: string) => \`/users/\${id}\`,
    DELETE: (id: string) => \`/users/\${id}\`,
  },
} as const

export const API_TIMEOUT = 30000
`
}

function generateUtilsIndex(): string {
  return `export * from './helpers'
export * from './validators'
export * from './formatters'
export * from './storage'
export * from './logger'
`
}

function generateHelpers(): string {
  return `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
`
}

function generateValidators(): string {
  return `export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return emailRegex.test(email)
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\\+?[1-9]\\d{1,14}$/
  return phoneRegex.test(phone.replace(/[\\s-]/g, ''))
}

export function isNotEmpty(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim() !== ''
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateLoginForm(email: string, password: string): ValidationResult {
  const errors: string[] = []
  
  if (!isNotEmpty(email)) errors.push('Email is required')
  else if (!isValidEmail(email)) errors.push('Invalid email format')
  
  if (!isNotEmpty(password)) errors.push('Password is required')
  else if (!isValidPassword(password)) errors.push('Password must be at least 8 characters')
  
  return { isValid: errors.length === 0, errors }
}
`
}

function generateFormatters(): string {
  return `export function formatDate(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
`
}

function generateStorage(): string {
  return `export const storage = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  },

  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  },
}

export const sessionStorage = {
  get<T>(key: string): T | null {
    try {
      const item = window.sessionStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Session storage set error:', error)
    }
  },

  remove(key: string): void {
    window.sessionStorage.removeItem(key)
  },

  clear(): void {
    window.sessionStorage.clear()
  },
}
`
}

function generateLogger(): string {
  return `type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(\`[DEBUG] \${message}\`, ...args)
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.info(\`[INFO] \${message}\`, ...args)
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(\`[WARN] \${message}\`, ...args)
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(\`[ERROR] \${message}\`, ...args)
    }
  },
}
`
}

function generateGlobalStyles(colors: any): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-200;
  }
  
  body {
    @apply bg-white text-gray-900 antialiased;
  }
  
  html {
    @apply scroll-smooth;
  }
}

@layer components {
  .container {
    @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
  }
  
  .btn {
    @apply inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50;
  }
  
  .input {
    @apply flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
`
}

function generateCssVariables(): string {
  return `:root {
  --color-primary: 14 165 233;
  --color-secondary: 100 116 139;
  --color-success: 34 197 94;
  --color-warning: 234 179 8;
  --color-error: 239 68 68;
  
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
`
}

function generateAuthContext(): string {
  return `import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, AuthState } from '@/types/user.types'
import { authService } from '@/services/auth.service'
import { storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const token = storage.get<string>(STORAGE_KEYS.AUTH_TOKEN)
    const user = storage.get<User>(STORAGE_KEYS.USER)
    
    if (token && user) {
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      })
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const { user, token } = await authService.login(email, password)
      storage.set(STORAGE_KEYS.AUTH_TOKEN, token)
      storage.set(STORAGE_KEYS.USER, user)
      setState({ user, token, isAuthenticated: true, isLoading: false })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const { user, token } = await authService.register(name, email, password)
      storage.set(STORAGE_KEYS.AUTH_TOKEN, token)
      storage.set(STORAGE_KEYS.USER, user)
      setState({ user, token, isAuthenticated: true, isLoading: false })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = () => {
    storage.remove(STORAGE_KEYS.AUTH_TOKEN)
    storage.remove(STORAGE_KEYS.USER)
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
`
}

function generateThemeContext(): string {
  return `import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return storage.get<Theme>(STORAGE_KEYS.THEME) || 'system'
  })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = theme === 'dark' || (theme === 'system' && systemDark)
    
    setIsDark(dark)
    root.classList.toggle('dark', dark)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    storage.set(STORAGE_KEYS.THEME, newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
`
}

function generateHooksIndex(): string {
  return `export { useAuth } from './useAuth'
export { useForm } from './useForm'
export { useApi } from './useApi'
export { useLocalStorage } from './useLocalStorage'
export { useDebounce } from './useDebounce'
export { useMediaQuery } from './useMediaQuery'
`
}

function generateUseAuth(): string {
  return `'use client'

import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
`
}

function generateUseForm(): string {
  return `import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react'

interface UseFormOptions<T> {
  initialValues: T
  onSubmit: (values: T) => Promise<void> | void
  validate?: (values: T) => Partial<Record<keyof T, string>>
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const handleChange = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const handleBlur = useCallback((
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    
    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)
    }
  }, [values, validate])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    
    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)
      if (Object.keys(validationErrors).length > 0) return
    }
    
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const setValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValue,
  }
}
`
}

function generateUseApi(): string {
  return `import { useState, useCallback } from 'react'
import type { Status } from '@/types'

interface UseApiOptions<T, P extends unknown[]> {
  fn: (...args: P) => Promise<T>
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useApi<T, P extends unknown[] = []>({
  fn,
  onSuccess,
  onError,
}: UseApiOptions<T, P>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  const execute = useCallback(async (...args: P) => {
    setStatus('loading')
    setError(null)
    
    try {
      const result = await fn(...args)
      setData(result)
      setStatus('success')
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setStatus('error')
      onError?.(error)
      throw error
    }
  }, [fn, onSuccess, onError])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setStatus('idle')
  }, [])

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
  }
}
`
}

function generateUseLocalStorage(): string {
  return `import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('useLocalStorage setValue error:', error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.error('useLocalStorage removeValue error:', error)
    }
  }, [key, initialValue])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue, removeValue] as const
}
`
}

function generateUseDebounce(): string {
  return `import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
`
}

function generateUseMediaQuery(): string {
  return `import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)')
}
`
}

function generateServicesIndex(): string {
  return `export { apiService } from './api.service'
export { authService } from './auth.service'
export { userService } from './user.service'
`
}

function generateApiService(domain: string): string {
  return `import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api'
import { storage } from '@/utils/storage'
import { STORAGE_KEYS } from '@/constants'
import { logger } from '@/utils/logger'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = storage.get<string>(STORAGE_KEYS.AUTH_TOKEN)
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`
        }
        logger.debug('API Request:', config.method?.toUpperCase(), config.url)
        return config
      },
      (error) => {
        logger.error('Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('API Response:', response.status, response.config.url)
        return response
      },
      (error) => {
        logger.error('Response error:', error.response?.status, error.message)
        
        if (error.response?.status === 401) {
          storage.remove(STORAGE_KEYS.AUTH_TOKEN)
          storage.remove(STORAGE_KEYS.USER)
          window.location.href = '/login'
        }
        
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export const apiService = new ApiService()
`
}

function generateAuthService(): string {
  return `import { apiService } from './api.service'
import { API_ENDPOINTS } from '@/constants/api'
import type { User } from '@/types/user.types'

interface AuthResponse {
  user: User
  token: string
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiService.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { email, password })
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return apiService.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, { name, email, password })
  }

  async logout(): Promise<void> {
    return apiService.post(API_ENDPOINTS.AUTH.LOGOUT)
  }

  async getCurrentUser(): Promise<User> {
    return apiService.get<User>(API_ENDPOINTS.AUTH.ME)
  }

  async refreshToken(): Promise<{ token: string }> {
    return apiService.post(API_ENDPOINTS.AUTH.REFRESH)
  }
}

export const authService = new AuthService()
`
}

function generateUserService(): string {
  return `import { apiService } from './api.service'
import { API_ENDPOINTS } from '@/constants/api'
import type { User } from '@/types/user.types'
import type { PaginatedResponse } from '@/types'

interface GetUsersParams {
  page?: number
  limit?: number
  search?: string
}

class UserService {
  async getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>> {
    return apiService.get<PaginatedResponse<User>>(API_ENDPOINTS.USERS.LIST, { params })
  }

  async getUserById(id: string): Promise<User> {
    return apiService.get<User>(API_ENDPOINTS.USERS.DETAIL(id))
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return apiService.put<User>(API_ENDPOINTS.USERS.UPDATE(id), data)
  }

  async deleteUser(id: string): Promise<void> {
    return apiService.delete(API_ENDPOINTS.USERS.DELETE(id))
  }
}

export const userService = new UserService()
`
}

function generateUserModel(): string {
  return `import type { User, UserRole } from '@/types/user.types'

export class UserModel implements User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date

  constructor(data: User) {
    this.id = data.id
    this.email = data.email
    this.name = data.name
    this.avatar = data.avatar
    this.role = data.role
    this.createdAt = new Date(data.createdAt)
    this.updatedAt = new Date(data.updatedAt)
  }

  get displayName(): string {
    return this.name || this.email.split('@')[0]
  }

  get initials(): string {
    return this.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  isAdmin(): boolean {
    return this.role === 'admin'
  }

  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
`
}

function generateApiResponseModel(): string {
  return `import type { ApiResponse } from '@/types/api.types'

export class ApiResponseModel<T> implements ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string

  constructor(response: ApiResponse<T>) {
    this.success = response.success
    this.data = response.data
    this.message = response.message
    this.error = response.error
  }

  isSuccess(): boolean {
    return this.success && !this.error
  }

  getData(): T | undefined {
    return this.data
  }

  getError(): string | undefined {
    return this.error || this.message
  }
}
`
}

function generateAuthController(): string {
  return `import { authService } from '@/services/auth.service'
import type { LoginCredentials, RegisterData } from '@/types/user.types'
import { validateLoginForm } from '@/utils/validators'
import { logger } from '@/utils/logger'

export class AuthController {
  async login(credentials: LoginCredentials) {
    const validation = validateLoginForm(credentials.email, credentials.password)
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    try {
      const result = await authService.login(credentials.email, credentials.password)
      logger.info('User logged in successfully')
      return result
    } catch (error) {
      logger.error('Login failed:', error)
      throw error
    }
  }

  async register(data: RegisterData) {
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match')
    }

    const validation = validateLoginForm(data.email, data.password)
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    try {
      const result = await authService.register(data.name, data.email, data.password)
      logger.info('User registered successfully')
      return result
    } catch (error) {
      logger.error('Registration failed:', error)
      throw error
    }
  }

  async logout() {
    try {
      await authService.logout()
      logger.info('User logged out successfully')
    } catch (error) {
      logger.error('Logout failed:', error)
      throw error
    }
  }
}

export const authController = new AuthController()
`
}

function generateUserController(): string {
  return `import { userService } from '@/services/user.service'
import { UserModel } from '@/models/User'
import { logger } from '@/utils/logger'

export class UserController {
  async getUsers(page = 1, limit = 10, search?: string) {
    try {
      const response = await userService.getUsers({ page, limit, search })
      return {
        ...response,
        data: response.data.map((user) => new UserModel(user)),
      }
    } catch (error) {
      logger.error('Failed to fetch users:', error)
      throw error
    }
  }

  async getUserById(id: string) {
    try {
      const user = await userService.getUserById(id)
      return new UserModel(user)
    } catch (error) {
      logger.error('Failed to fetch user:', error)
      throw error
    }
  }

  async updateUser(id: string, data: Partial<UserModel>) {
    try {
      const user = await userService.updateUser(id, data)
      logger.info('User updated successfully:', id)
      return new UserModel(user)
    } catch (error) {
      logger.error('Failed to update user:', error)
      throw error
    }
  }

  async deleteUser(id: string) {
    try {
      await userService.deleteUser(id)
      logger.info('User deleted successfully:', id)
    } catch (error) {
      logger.error('Failed to delete user:', error)
      throw error
    }
  }
}

export const userController = new UserController()
`
}

function generateAuthMiddleware(): string {
  return `import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { Loader } from '@/components/common'

interface AuthMiddlewareProps {
  children: ReactNode
  requireAuth?: boolean
  requireGuest?: boolean
  requiredRole?: 'admin' | 'user'
}

export function AuthMiddleware({
  children,
  requireAuth = false,
  requireGuest = false,
  requiredRole,
}: AuthMiddlewareProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (requireGuest && isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <>{children}</>
}
`
}

function generateAppRoutes(): string {
  return `import { Routes, Route } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Home, About, Contact, Login, Register, Dashboard, Profile, NotFound } from '@/pages'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.ABOUT} element={<About />} />
      <Route path={ROUTES.CONTACT} element={<Contact />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PROFILE}
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  )
}
`
}

function generateProtectedRoute(): string {
  return `import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { Loader } from '@/components/common'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
`
}

function generateButtonComponent(): string {
  return `import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants = (variant: ButtonVariant, size: ButtonSize) => {
  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
    ghost: 'bg-transparent hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10',
  }
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size]
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants(variant, size), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin\" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
`
}

function generateButtonStyles(): string {
  return `import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500',
        ghost: 'bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
export type ButtonSize = VariantProps<typeof buttonVariants>['size']
`
}

function generateInputComponent(): string {
  return `import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/helpers'

type InputSize = 'sm' | 'md' | 'lg'

const inputVariants = (size: InputSize = 'md', className?: string) => {
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  }
  return cn(
    'flex w-full rounded-md border border-gray-300 bg-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    sizeStyles[size],
    className
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  inputSize?: InputSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, inputSize = 'md', id, ...props }, ref) => {
    const inputId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            inputVariants(inputSize),
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
`
}

function generateInputStyles(): string {
  return `import { cva, type VariantProps } from 'class-variance-authority'

export const inputVariants = cva(
  'flex w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export type InputSize = VariantProps<typeof inputVariants>['size']
`
}

function generateCardComponent(): string {
  return `import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/helpers'

type CardVariant = 'default' | 'bordered' | 'elevated'

const cardVariants = (variant: CardVariant = 'default') => {
  const variants = {
    default: 'rounded-lg border border-gray-200 bg-white',
    bordered: 'rounded-lg border-2 border-gray-300 bg-white',
    elevated: 'rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow',
  }
  return variants[variant]
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children: ReactNode
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants(variant), className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-100', className)} {...props}>
      {children}
    </div>
  )
}
`
}

function generateCardStyles(): string {
  return `import { cva, type VariantProps } from 'class-variance-authority'

export const cardVariants = cva('rounded-lg bg-white', {
  variants: {
    variant: {
      default: 'border border-gray-200 shadow-sm',
      elevated: 'shadow-md',
      outline: 'border-2 border-gray-200',
      flat: 'bg-gray-50',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type CardVariant = VariantProps<typeof cardVariants>['variant']
`
}

function generateModalComponent(): string {
  return `import { type ReactNode, useEffect, useCallback } from 'react'
import { cn } from '@/utils/helpers'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full rounded-lg bg-white p-6 shadow-xl',
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
`
}

function generateLoaderComponent(): string {
  return `import { cn } from '@/utils/helpers'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function Loader({ size = 'md', className }: LoaderProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className={cn('animate-spin text-primary-600', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}
`
}

function generateHeaderComponent(title: string): string {
  return `import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/common'
import { cn } from '@/utils/helpers'

export function Header() {
  const { isAuthenticated, logout, user } = useAuth()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors hover:text-primary-600',
      isActive ? 'text-primary-600' : 'text-gray-600'
    )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to={ROUTES.HOME} className="text-xl font-bold text-gray-900">
            ${title}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to={ROUTES.HOME} className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to={ROUTES.ABOUT} className={navLinkClass}>
              About
            </NavLink>
            <NavLink to={ROUTES.CONTACT} className={navLinkClass}>
              Contact
            </NavLink>
            {isAuthenticated && (
              <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>
                Dashboard
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">Hi, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN}>
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
`
}

function generateFooterComponent(title: string): string {
  return `import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">${title}</h3>
            <p className="mt-2 text-sm text-gray-600">
              Building amazing experiences with TypeScript and React.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Navigation</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to={ROUTES.HOME} className="text-sm text-gray-600 hover:text-primary-600">
                  Home
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ABOUT} className="text-sm text-gray-600 hover:text-primary-600">
                  About
                </Link>
              </li>
              <li>
                <Link to={ROUTES.CONTACT} className="text-sm text-gray-600 hover:text-primary-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Account</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to={ROUTES.LOGIN} className="text-sm text-gray-600 hover:text-primary-600">
                  Login
                </Link>
              </li>
              <li>
                <Link to={ROUTES.REGISTER} className="text-sm text-gray-600 hover:text-primary-600">
                  Register
                </Link>
              </li>
              <li>
                <Link to={ROUTES.DASHBOARD} className="text-sm text-gray-600 hover:text-primary-600">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-primary-600">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-600 hover:text-primary-600">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} ${title}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
`
}

function generateSidebarComponent(): string {
  return `import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/helpers'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const menuItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: '📊' },
  { label: 'Profile', path: ROUTES.PROFILE, icon: '👤' },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: '⚙️' },
]

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-50 text-primary-600'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform md:relative md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <span className="text-lg font-semibold text-gray-900">Menu</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} className={navLinkClass} onClick={onClose}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
`
}

function generateLayoutComponent(): string {
  return `import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
`
}

function generateUserCardComponent(): string {
  return `import type { User } from '@/types/user.types'
import { Card, CardContent } from '@/components/common'
import { formatDate } from '@/utils/formatters'

interface UserCardProps {
  user: User
  onClick?: () => void
}

export function UserCard({ user, onClick }: UserCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
      onClick={onClick}
    >
      <CardContent>
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar || "/placeholder.svg"}
              alt={user.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 capitalize">
            {user.role}
          </span>
          <span className="text-gray-400">Joined {formatDate(user.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
`
}

function generateUserProfileComponent(): string {
  return `import type { User } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/common'
import { formatDateTime } from '@/utils/formatters'

interface UserProfileProps {
  user: User
  onEdit?: () => void
}

export function UserProfile({ user, onEdit }: UserProfileProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profile</CardTitle>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {user.avatar ? (
            <img
              src={user.avatar || "/placeholder.svg"}
              alt={user.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-3xl text-primary-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-400">Role:</span>{' '}
                <span className="font-medium text-gray-900 capitalize">{user.role}</span>
              </div>
              <div>
                <span className="text-gray-400">Joined:</span>{' '}
                <span className="font-medium text-gray-900">{formatDateTime(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
`
}

function generateHomePage(title: string): string {
  return `import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/common'

export function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-20">
        <div className="container text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to <span className="text-primary-600">${title}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            A modern TypeScript + React application with everything you need to build amazing products.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to={ROUTES.ABOUT}>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-gray-900">Features</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Everything you need to build production-ready applications
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-6">
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-lg text-primary-100">
            Join thousands of developers building with our platform.
          </p>
          <Link to={ROUTES.REGISTER}>
            <Button variant="secondary" size="lg" className="mt-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Optimized for speed with modern build tools and best practices.',
  },
  {
    icon: '🔒',
    title: 'Secure by Default',
    description: 'Built-in authentication and authorization with best security practices.',
  },
  {
    icon: '📱',
    title: 'Fully Responsive',
    description: 'Looks great on any device with mobile-first design approach.',
  },
  {
    icon: '🎨',
    title: 'Customizable',
    description: 'Easy to customize with Tailwind CSS and component variants.',
  },
  {
    icon: '🧪',
    title: 'Well Tested',
    description: 'Comprehensive test coverage for reliability and confidence.',
  },
  {
    icon: '📚',
    title: 'Well Documented',
    description: 'Clear documentation and examples to get you started quickly.',
  },
]
`
}

function generateAboutPage(title: string): string {
  return `export function About() {
  return (
    <div className="py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900">About ${title}</h1>
          <div className="mt-8 prose prose-lg text-gray-600">
            <p>
              We are a team of passionate developers dedicated to building the best tools
              and experiences for our users. Our mission is to make development faster,
              easier, and more enjoyable.
            </p>
            <h2>Our Story</h2>
            <p>
              Founded in 2024, we started with a simple idea: create a platform that
              developers would love to use. Since then, we've grown into a thriving
              community of builders and creators.
            </p>
            <h2>Our Values</h2>
            <ul>
              <li><strong>Quality</strong> - We never compromise on quality.</li>
              <li><strong>Simplicity</strong> - We believe in keeping things simple.</li>
              <li><strong>Community</strong> - We value our community above all.</li>
              <li><strong>Innovation</strong> - We constantly push boundaries.</li>
            </ul>
            <h2>Our Team</h2>
            <p>
              We're a diverse team of engineers, designers, and product people working
              together to build something amazing. We're always looking for talented
              individuals to join our team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
`
}

function generateContactPage(): string {
  return `import { useState } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/common'
import { useForm } from '@/hooks/useForm'
import { isValidEmail, isNotEmpty } from '@/utils/validators'

interface ContactFormValues {
  name: string
  email: string
  message: string
}

export function Contact() {
  const [submitted, setSubmitted] = useState(false)

  const validate = (values: ContactFormValues) => {
    const errors: Partial<Record<keyof ContactFormValues, string>> = {}
    if (!isNotEmpty(values.name)) errors.name = 'Name is required'
    if (!isNotEmpty(values.email)) errors.email = 'Email is required'
    else if (!isValidEmail(values.email)) errors.email = 'Invalid email format'
    if (!isNotEmpty(values.message)) errors.message = 'Message is required'
    return errors
  }

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useForm<ContactFormValues>({
      initialValues: { name: '', email: '', message: '' },
      validate,
      onSubmit: async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setSubmitted(true)
      },
    })

  if (submitted) {
    return (
      <div className="py-16">
        <div className="container">
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="py-12">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
              <p className="mt-2 text-gray-600">
                Your message has been sent. We'll get back to you soon.
              </p>
              <Button className="mt-6" onClick={() => setSubmitted(false)}>
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16">
      <div className="container">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-4 text-lg text-gray-600">
            Have a question or feedback? We'd love to hear from you.
          </p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.name ? errors.name : undefined}
                  placeholder="Your name"
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email ? errors.email : undefined}
                  placeholder="your@email.com"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={values.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows={5}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Your message..."
                  />
                  {touched.message && errors.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                  )}
                </div>
                <Button type="submit" isLoading={isSubmitting} className="w-full">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
`
}

function generateLoginPage(): string {
  return `import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from '@/hooks/useForm'
import { ROUTES } from '@/constants/routes'
import { isValidEmail, isNotEmpty } from '@/utils/validators'

interface LoginFormValues {
  email: string
  password: string
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD

  const validate = (values: LoginFormValues) => {
    const errors: Partial<Record<keyof LoginFormValues, string>> = {}
    if (!isNotEmpty(values.email)) errors.email = 'Email is required'
    else if (!isValidEmail(values.email)) errors.email = 'Invalid email format'
    if (!isNotEmpty(values.password)) errors.password = 'Password is required'
    return errors
  }

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useForm<LoginFormValues>({
      initialValues: { email: '', password: '' },
      validate,
      onSubmit: async (values) => {
        setError(null)
        try {
          await login(values.email, values.password)
          navigate(from, { replace: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Login failed')
        }
      },
    })

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <Input
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email ? errors.email : undefined}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? errors.password : undefined}
              placeholder="••••••••"
            />
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to={ROUTES.REGISTER} className="font-medium text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
`
}

function generateRegisterPage(): string {
  return `import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from '@/hooks/useForm'
import { ROUTES } from '@/constants/routes'
import { isValidEmail, isValidPassword, isNotEmpty } from '@/utils/validators'

interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const validate = (values: RegisterFormValues) => {
    const errors: Partial<Record<keyof RegisterFormValues, string>> = {}
    if (!isNotEmpty(values.name)) errors.name = 'Name is required'
    if (!isNotEmpty(values.email)) errors.email = 'Email is required'
    else if (!isValidEmail(values.email)) errors.email = 'Invalid email format'
    if (!isNotEmpty(values.password)) errors.password = 'Password is required'
    else if (!isValidPassword(values.password)) errors.password = 'Password must be at least 8 characters'
    if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    return errors
  }

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } =
    useForm<RegisterFormValues>({
      initialValues: { name: '', email: '', password: '', confirmPassword: '' },
      validate,
      onSubmit: async (values) => {
        setError(null)
        try {
          await register(values.name, values.email, values.password)
          navigate(ROUTES.DASHBOARD, { replace: true })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Registration failed')
        }
      },
    })

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="mt-2 text-gray-600">Sign up to get started</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <Input
              label="Name"
              name="name"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.name ? errors.name : undefined}
              placeholder="Your name"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email ? errors.email : undefined}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? errors.password : undefined}
              placeholder="••••••••"
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              placeholder="••••••••"
            />
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create Account
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
`
}

function generateDashboardPage(): string {
  return `import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common'

export function Dashboard() {
  const { user } = useAuth()

  const stats = [
    { label: 'Total Views', value: '12,345', change: '+12%' },
    { label: 'Active Users', value: '1,234', change: '+8%' },
    { label: 'Revenue', value: '$45,678', change: '+23%' },
    { label: 'Conversion', value: '3.2%', change: '+0.5%' },
  ]

  return (
    <div className="py-8">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                  </div>
                  <span className="text-sm text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const recentActivity = [
  { icon: '📝', title: 'New user registered', description: 'john@example.com signed up', time: '5 min ago' },
  { icon: '💳', title: 'Payment received', description: 'Invoice #1234 paid', time: '1 hour ago' },
  { icon: '📦', title: 'Order shipped', description: 'Order #5678 is on its way', time: '3 hours ago' },
  { icon: '⭐', title: 'New review', description: '5-star rating from Sarah', time: '5 hours ago' },
]
`
}

function generateProfilePage(): string {
  return `import { useAuth } from '@/hooks/useAuth'
import { UserProfile } from '@/components/user'
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/common'
import { useForm } from '@/hooks/useForm'
import { useState } from 'react'

export function Profile() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  const { values, handleChange, handleSubmit, isSubmitting } = useForm({
    initialValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
    onSubmit: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsEditing(false)
    },
  })

  if (!user) return null

  return (
    <div className="py-8">
      <div className="container">
        <div className="mx-auto max-w-2xl space-y-6">
          <UserProfile user={user} onEdit={() => setIsEditing(true)} />

          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={isSubmitting}>
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Two-factor authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
`
}

function generateNotFoundPage(): string {
  return `import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/common'

export function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mt-4 text-lg text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link to={ROUTES.HOME}>
          <Button className="mt-8">Go Home</Button>
        </Link>
      </div>
    </div>
  )
}
`
}

function generateTestSetup(): string {
  return `import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
`
}

function generateButtonTest(): string {
  return `import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/common'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="danger">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })
})
`
}

function generateUseAuthTest(): string {
  return `import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('handles login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    // Mock the login - in real tests you'd mock the API
    await act(async () => {
      try {
        await result.current.login('test@example.com', 'password')
      } catch {
        // Expected to fail without API
      }
    })
  })

  it('handles logout', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    act(() => {
      result.current.logout()
    })
    
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
`
}

// ============ DYNAMIC SECTION GENERATORS ============

function generateHeaderComponentFromContent(parsedContent: ParsedContent): string {
  const navItems = parsedContent.navItems || []
  const navItemsCode = navItems
    .map(
      (item) =>
        `    <NavLink to="${item.href || '#'}" className={navLinkClass}>
      ${item.text}
    </NavLink>`
    )
    .join('\n')

  return `import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/common'
import { cn } from '@/utils/helpers'

export function Header() {
  const { isAuthenticated, logout, user } = useAuth()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'text-sm font-medium transition-colors hover:text-primary-600',
      isActive ? 'text-primary-600' : 'text-gray-600'
    )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to={ROUTES.HOME} className="text-xl font-bold text-gray-900">
            ${parsedContent.title || 'Site'}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            ${navItemsCode || '<NavLink to={ROUTES.HOME} className={navLinkClass}>Home</NavLink>'}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">Hi, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN}>
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
`
}

function generateFooterComponentFromContent(parsedContent: ParsedContent): string {
  const footerLinks = parsedContent.footerLinks || []

  const sectionsCode = footerLinks
    .map(
      (section: any) =>
        `          <div>
            <h4 className="font-medium text-gray-900">${section.section || 'Links'}</h4>
            <ul className="mt-4 space-y-2">
              ${(section.links || [])
          .map(
            (link: any) =>
              `<li><a href="${link.href || '#'}" className="text-sm text-gray-600 hover:text-primary-600">${link.text}</a></li>`
          )
          .join('\n              ')}
            </ul>
          </div>`
    )
    .join('\n')

  return `export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">${parsedContent.title || 'Site'}</h3>
            <p className="mt-2 text-sm text-gray-600">
              ${parsedContent.description || 'Building amazing experiences with TypeScript and React.'}
            </p>
          </div>
          ${sectionsCode || `<div>
            <h4 className="font-medium text-gray-900">Navigation</h4>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">Home</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-primary-600">About</a></li>
            </ul>
          </div>`}
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 text-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} ${parsedContent.title || 'Site'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
`
}

function generateSectionComponentFromContent(section: any, index: number, colors: any): string {
  const items = section.items || []

  // Generate items code, but handle empty items gracefully
  const itemsCode = items.length > 0
    ? items
      .map(
        (item, i) =>
          `    <div key="${i}" className="rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      ${item.image ? `<img src="${item.image}" alt="${item.title}" className="mb-4 h-48 w-full object-cover rounded" />` : ''}
      <h3 className="font-semibold text-gray-900">${item.title || 'Item'}</h3>
      <p className="mt-2 text-sm text-gray-600">${item.description || ''}</p>
      ${item.link ? `<a href="${item.link}" className="mt-4 inline-block text-primary-600 font-medium">Learn more →</a>` : ''}
    </div>`
      )
      .join('\n')
    : '<div className="col-span-full text-center py-8 text-gray-500">Content loading...</div>'

  // Ensure we have a valid column count
  const columns = section.columns || 3
  const maxColumns = Math.min(columns, items.length || 3)

  return `export function Section${index}() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900">${section.heading || `Section ${index}`}</h2>
          ${section.content ? `<p className="mt-4 text-lg text-gray-600">${section.content}</p>` : ''}
        </div>
        ${items.length > 0 ? `<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-${maxColumns}">
          ${itemsCode}
        </div>` : '<div className="text-center py-8 text-gray-600">No items to display</div>'}
      </div>
    </section>
  )
}
`
}

// ============ HTML TO JSX CONVERSION ============

/**
 * Convert HTML to valid JSX
 * Handles class -> className, self-closing tags, inline styles, etc.
 */
function convertHtmlToJsx(html: string): string {
  if (!html) return ''

  return html
    // Replace HTML attributes with JSX equivalents
    .replace(/\bclass=/g, 'className=')
    .replace(/\bfor=/g, 'htmlFor=')
    .replace(/\btabindex=/g, 'tabIndex=')
    .replace(/\bcellpadding=/gi, 'cellPadding=')
    .replace(/\bcellspacing=/gi, 'cellSpacing=')
    .replace(/\bcolspan=/gi, 'colSpan=')
    .replace(/\browspan=/gi, 'rowSpan=')
    .replace(/\bmaxlength=/gi, 'maxLength=')
    .replace(/\bminlength=/gi, 'minLength=')
    .replace(/\breadonly/gi, 'readOnly')
    .replace(/\bautocomplete=/gi, 'autoComplete=')
    .replace(/\bautofocus/gi, 'autoFocus')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Self-close void elements
    .replace(/<br\s*>/gi, '<br />')
    .replace(/<hr\s*>/gi, '<hr />')
    .replace(/<img([^>]*)(?<!\/)\s*>/gi, '<img$1 />')
    .replace(/<input([^>]*)(?<!\/)\s*>/gi, '<input$1 />')
    .replace(/<meta([^>]*)(?<!\/)\s*>/gi, '<meta$1 />')
    .replace(/<link([^>]*)(?<!\/)\s*>/gi, '<link$1 />')
    // Escape curly braces in text
    .replace(/\{(?![\{\'])/g, "{'{'}")
    .replace(/\}(?![\}\'])/g, "{'}'}")
    // Handle inline styles - convert to JSX object format
    .replace(/style="([^"]*)"/g, (_, styles: string) => {
      const jsxStyle = convertCssToJsxStyle(styles)
      return `style={${jsxStyle}}`
    })
}

/**
 * Convert CSS string to JSX style object
 */
function convertCssToJsxStyle(cssString: string): string {
  if (!cssString) return '{}'

  const styles = cssString.split(';').filter((s: string) => s.trim())
  const jsxPairs = styles.map((style: string) => {
    const [prop, ...valueParts] = style.split(':')
    if (!prop || valueParts.length === 0) return ''

    const value = valueParts.join(':').trim()
    // Convert kebab-case to camelCase
    const camelProp = prop.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
    return `${camelProp}: '${value.replace(/'/g, "\\'")}'`
  }).filter((p: string) => p)

  return `{ ${jsxPairs.join(', ')} }`
}

/**
 * Generate the bundled site CSS from crawled assets
 */
function generateBundledSiteCss(parsedContent: ParsedContent): string {
  const crawledAssets = parsedContent.crawledAssets
  if (!crawledAssets) {
    return '/* No crawled CSS available */\n'
  }

  const parts: string[] = []

  // Add CSS from external files
  for (const cssFile of crawledAssets.cssFiles) {
    parts.push(`/* Source: ${cssFile.url} */`)
    parts.push(cssFile.content)
    parts.push('')
  }

  // Add inline styles
  for (let i = 0; i < crawledAssets.inlineStyles.length; i++) {
    parts.push(`/* Inline style block ${i + 1} */`)
    parts.push(crawledAssets.inlineStyles[i])
    parts.push('')
  }

  return parts.join('\n')
}

function generateHomePageFromContent(parsedContent: ParsedContent): string {
  // Check if we have the actual body HTML from the crawled site
  const bodyContent = parsedContent.bodyContent

  if (bodyContent && bodyContent.trim().length > 100) {
    // Convert HTML to JSX and use it directly
    const jsxContent = convertHtmlToJsx(bodyContent)

    return `export default function Home() {
  return (
    <div 
      className="site-content"
      dangerouslySetInnerHTML={{ 
        __html: \`${jsxContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` 
      }} 
    />
  )
}
`
  }

  // Fallback to generated components if body content not available
  const sectionImports = (parsedContent.sections || [])
    .map((_: any, i: number) => `Section${i + 1}`)
    .map((name: string) => `  ${name},`)
    .join('\n')

  const sectionComponents = (parsedContent.sections || [])
    .map((_: any, i: number) => `      <Section${i + 1} />`)
    .join('\n')

  const sectionsContent = sectionComponents ? sectionComponents : `      <section className="py-16 bg-gray-50">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-gray-900">Explore More</h2>
          <p className="mt-4 text-gray-600">More content coming soon...</p>
        </div>
      </section>`

  return `import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/common'
${sectionImports ? `import {\n${sectionImports}\n} from '@/components/sections'\n` : ''}

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-20">
        <div className="container text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            ${parsedContent.title || 'Welcome'}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            ${parsedContent.description || 'A modern TypeScript + React application with everything you need.'}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to={ROUTES.ABOUT}>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      ${sectionsContent}

      {/* CTA Section */}
      <section className="bg-primary-600 py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-lg text-primary-100">
            Join thousands of users of our platform.
          </p>
          <Link to={ROUTES.REGISTER}>
            <Button variant="secondary" size="lg" className="mt-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
`
}

