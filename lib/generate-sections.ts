// Helper functions to generate section components from parsed website content

/**
 * IMPORTANT: How to use AI suggestions in section generation
 *
 * Example - Using AI to improve component naming:
 *
 * ```typescript
 * import { getComponentNameFromAI } from './ai/utils'
 *
 * export function generateSectionComponent(
 *   section: any,
 *   index: number,
 *   colors: any,
 *   aiSuggestions?: AIAnalysisResult
 * ): string {
 *   // Get AI-suggested component name instead of "Section1", "Section2", etc.
 *   const componentName = getComponentNameFromAI(
 *     index,
 *     `Section${index}`,
 *     aiSuggestions
 *   )
 *
 *   // Get AI-suggested props
 *   const props = getSuggestedPropsFromAI(componentName, aiSuggestions)
 *
 *   // Use these in generation
 *   return `export function ${componentName}({...}) { ... }`
 * }
 * ```
 *
 * The codebase-generator.tsx will pass aiSuggestions via parsedContent.aiSuggestions
 */

export function generateSectionComponent(section: any, index: number, colors: any): string {
  const sectionsHTML = (section.items || [])
    .map(
      (item: any) => `
        <div className="rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          ${item.image ? `<img src="${item.image}" alt="${item.title}" className="w-full h-48 object-cover rounded mb-4" />` : ""}
          <h3 className="font-semibold text-gray-900">${item.title}</h3>
          <p className="text-sm text-gray-600 mt-2">${item.description}</p>
          ${item.link ? `<a href="${item.link}" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">Learn more →</a>` : ""}
        </div>
      `
    )
    .join("")

  return `import React from 'react'

interface Section${index}Props {
  id?: string
}

export function Section${index}({ id = 'section-${index}' }: Section${index}Props) {
  return (
    <section id={id} className="py-16 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">${section.heading}</h2>
          ${section.subheading ? `<p className="text-gray-600 mt-4">${section.subheading}</p>` : ""}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-${section.columns || 3} gap-6">
          ${section.items ? sectionsHTML : `<p className="text-gray-600">${section.content}</p>`}
        </div>
      </div>
    </section>
  )
}
`
}

export function generateHeaderComponent(parsedContent: any): string {
  const navHTML = parsedContent.navItems
    .slice(0, 5)
    .map((item: any) => `<a href="${item.href}" className="text-gray-600 hover:text-primary-600">${item.text}</a>`)
    .join("")

  return `import React from 'react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="text-xl font-bold text-gray-900">${parsedContent.title}</div>
        <nav className="hidden md:flex items-center gap-8">
          ${navHTML}
        </nav>
      </div>
    </header>
  )
}
`
}

export function generateFooterComponent(parsedContent: any): string {
  const footerSections = parsedContent.footerLinks
    .map(
      (section: any) => `
        <div>
          <h4 className="font-medium text-gray-900 mb-4">${section.section}</h4>
          <ul className="space-y-2">
            ${section.links.map((link: any) => `<li><a href="${link.href}" className="text-gray-600 hover:text-primary-600 text-sm">${link.text}</a></li>`).join("")}
          </ul>
        </div>
      `
    )
    .join("")

  return `import React from 'react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">${parsedContent.title}</h3>
            <p className="text-gray-600 text-sm mt-2">${parsedContent.description}</p>
          </div>
          ${footerSections}
        </div>
        <div className="border-t border-gray-200 pt-8 text-center">
          <p className="text-gray-600 text-sm">&copy; ${year} ${parsedContent.title}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
`
}

export function generateHomePage(parsedContent: any): string {
  const sectionsImports = (parsedContent.sections || [])
    .map((_, i) => `Section${i + 1}`)
    .join(", ")

  const sectionsRender = (parsedContent.sections || [])
    .map((_, i) => `<Section${i + 1} />`)
    .join("\n")

  return `import React from 'react'
${sectionsImports ? `import { ${sectionsImports} } from '@/components/sections'` : ""}
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-20">
        <div className="container text-center">
          <h1 className="text-5xl font-bold text-gray-900">${parsedContent.title}</h1>
          <p className="text-xl text-gray-600 mt-6">${parsedContent.description}</p>
        </div>
      </section>

      {/* Generated Sections */}
      ${sectionsRender}

      <Footer />
    </div>
  )
}
`
}
