import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { execSync } from "child_process"
import path from "path"
import { promises as fs } from "fs"

// ============ INTERFACES ============

interface CrawlResult {
  html: string
  cssFiles: { url: string; content: string }[]
  jsFiles: { url: string; content: string }[]
  inlineStyles: string[]
  inlineScripts: string[]
  rootVariables?: Record<string, string>
}

interface ParsedContent {
  title: string
  description: string
  favicon: string | null
  navItems: NavItem[]
  hero: HeroSection | null
  sections: ContentSection[]
  footerLinks: FooterLink[]
  images: ExtractedImage[]
  formElements: FormElement[]
  colors: ColorPalette
  metadata: PageMetadata
  bodyContent: string  // The actual body HTML content
  headContent: string  // The head content (meta tags, etc.)
  htmlAttributes: Record<string, string>
  bodyAttributes: Record<string, string>
  crawledAssets: CrawlResult  // All fetched assets
  headerHtml?: string
  footerHtml?: string
}

interface NavItem {
  text: string
  href: string
  ariaLabel?: string
}

interface HeroSection {
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
  backgroundImage: string | null
  rawHtml?: string
}

interface ContentSection {
  id: string
  type: "text" | "cards" | "features" | "testimonials" | "faq" | "contact" | "pricing" | "content"
  heading: string
  subheading: string
  content: string
  items?: SectionItem[]
  columns?: number
  rawHtml?: string
}

interface SectionItem {
  title: string
  description: string
  icon?: string
  image?: string
  link?: string
}

interface FooterLink {
  section: string
  links: { text: string; href: string }[]
}

interface ExtractedImage {
  src: string
  alt: string
  section: string
}

interface FormElement {
  type: string
  placeholder?: string
  required: boolean
}

interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

interface PageMetadata {
  language: string
  charset: string
  keywords: string[]
  url?: string
  ogImage?: string
  twitterCard?: string
}

// ============ MAIN HANDLER ============

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    const url = `https://${domain}`

    try {
      // Step 1 & 2: Crawl and fetch everything in one pass using the new unified crawler
      const crawledAssets = await crawlAndFetchAssets(domain)
      const html = crawledAssets.html

      // Step 3: Parse the website content (now uses the HTML returned by the crawler)
      const parsedContent = parseWebsiteContent(html, domain, crawledAssets)

      return NextResponse.json({
        success: true,
        domain,
        rawHtml: html,
        parsedContent,
        accessible: true,
      })
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)
      return NextResponse.json({
        success: true,
        domain,
        parsedContent: generateMockContent(domain),
        accessible: false,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 },
    )
  }
}

// ============ CRAWLING FUNCTIONS ============

/**
 * Crawl and fetch all CSS and JS assets from the page
 * Uses Python BeautifulSoup4 as primary method for CSS extraction, Node.js as fallback
 */
async function crawlAndFetchAssets(domain: string): Promise<CrawlResult> {
  const url = `https://${domain}`

  // Try Python crawler first (consolidated and highly accurate)
  try {
    const pythonScriptPath = path.join(process.cwd(), "lib", "python", "crawler.py")
    const pythonCmd = process.platform === "win32" ? "python" : "python3"

    console.log(`Executing Python Crawler for ${url}...`)
    const output = execSync(`${pythonCmd} "${pythonScriptPath}" "${url}"`, {
      encoding: "utf-8",
      maxBuffer: 20 * 1024 * 1024 // 20MB buffer for large sites
    })

    const result = JSON.parse(output)

    if (result && !result.error) {
      console.log("Python Crawler success")

      return {
        html: result.html,
        cssFiles: result.css_files || [],
        jsFiles: result.js_files || [],
        inlineStyles: result.inline_styles || [],
        inlineScripts: result.inline_scripts || [],
        rootVariables: result.root_variables || {}
      }
    } else if (result.error) {
      console.warn("Python Crawler reported error:", result.error)
    }
  } catch (pyError) {
    console.warn("Python crawler failed, falling back to basic Node.js fetch:", pyError instanceof Error ? pyError.message : String(pyError))
  }

  // Basic fallback fetching if Python fails
  const response = await fetch(url)
  const html = await response.text()

  // Fallback to Node.js implementation
  const $ = cheerio.load(html)
  const cssUrls = new Set<string>()
  const jsUrls = new Set<string>()
  const inlineStyles: string[] = []
  const inlineScripts: string[] = []

  // Collect CSS file URLs
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) {
      const fullUrl = normalizeUrl(href, domain)
      if (fullUrl.includes(domain) || href.startsWith('/') || !href.startsWith('http')) {
        cssUrls.add(fullUrl)
      }
    }
  })

  // Collect inline styles
  $('style').each((_, el) => {
    const content = $(el).html()
    if (content && content.trim()) {
      inlineStyles.push(content)
    }
  })

  // Collect JS file URLs
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (src) {
      const skipPatterns = ['googletagmanager', 'google-analytics', 'crisp', 'facebook', 'twitter', 'linkedin', 'hotjar', 'clarity']
      const shouldSkip = skipPatterns.some(pattern => src.toLowerCase().includes(pattern))
      if (!shouldSkip) {
        const fullUrl = normalizeUrl(src, domain)
        if (fullUrl.includes(domain) || src.startsWith('/') || !src.startsWith('http')) {
          jsUrls.add(fullUrl)
        }
      }
    }
  })

  // Collect inline scripts
  $('script:not([src])').each((_, el) => {
    const content = $(el).html()
    if (content && content.trim()) {
      const skipPatterns = ['gtag', 'dataLayer', 'fbq', '_gaq', 'analytics', 'crisp']
      const shouldSkip = skipPatterns.some(pattern => content.includes(pattern))
      if (!shouldSkip) {
        inlineScripts.push(content)
      }
    }
  })

  const cssFiles = await fetchAllFiles(Array.from(cssUrls))
  const jsFiles = await fetchAllFiles(Array.from(jsUrls))

  return { html, cssFiles, jsFiles, inlineStyles, inlineScripts }
}

/** Helper to extract JS URLs for Python fallback mode */
function extractJsUrls(html: string, domain: string): string[] {
  const $ = cheerio.load(html)
  const jsUrls = new Set<string>()
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (src) {
      const skipPatterns = ['googletagmanager', 'google-analytics', 'crisp', 'facebook', 'twitter', 'linkedin', 'hotjar', 'clarity']
      if (!skipPatterns.some(pattern => src.toLowerCase().includes(pattern))) {
        jsUrls.add(normalizeUrl(src, domain))
      }
    }
  })
  return Array.from(jsUrls)
}

/** Helper to extract inline scripts for Python fallback mode */
function extractInlineScripts(html: string): string[] {
  const $ = cheerio.load(html)
  const scripts: string[] = []
  $('script:not([src])').each((_, el) => {
    const content = $(el).html()
    if (content && content.trim()) {
      const skipPatterns = ['gtag', 'dataLayer', 'fbq', '_gaq', 'analytics', 'crisp']
      if (!skipPatterns.some(pattern => content.includes(pattern))) {
        scripts.push(content)
      }
    }
  })
  return scripts
}

/**
 * Fetch multiple files in parallel with error handling
 * For CSS files, rewrites relative URLs to absolute URLs
 */
async function fetchAllFiles(urls: string[]): Promise<{ url: string; content: string }[]> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
        if (response.ok) {
          let content = await response.text()

          // If it's a CSS file, rewrite relative URLs to absolute
          if (url.includes('.css') || url.includes('stylesheet')) {
            content = rewriteCssUrls(content, url)
          }

          return { url, content }
        }
        return { url, content: "" }
      } catch {
        return { url, content: "" }
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{ url: string; content: string }> => r.status === "fulfilled")
    .map(r => r.value)
    .filter(r => r.content.length > 0)
}

/**
 * Rewrite relative URLs in CSS to absolute URLs
 * Handles url(), @import, etc.
 */
function rewriteCssUrls(cssContent: string, cssFileUrl: string): string {
  // Extract base URL from the CSS file URL
  const urlParts = new URL(cssFileUrl)
  const baseUrl = `${urlParts.protocol}//${urlParts.host}`
  const basePath = cssFileUrl.substring(0, cssFileUrl.lastIndexOf('/') + 1)

  // Replace url() references
  let result = cssContent.replace(/url\(['"]?([^'"\)]+)['"]?\)/gi, (match, urlPath) => {
    // Skip data URIs, absolute URLs, and CSS variables
    if (urlPath.startsWith('data:') ||
      urlPath.startsWith('http://') ||
      urlPath.startsWith('https://') ||
      urlPath.startsWith('var(') ||
      urlPath.startsWith('#')) {
      return match
    }

    let absoluteUrl: string
    if (urlPath.startsWith('//')) {
      absoluteUrl = 'https:' + urlPath
    } else if (urlPath.startsWith('/')) {
      absoluteUrl = baseUrl + urlPath
    } else {
      // Relative URL - resolve from CSS file location
      absoluteUrl = basePath + urlPath
    }

    return `url('${absoluteUrl}')`
  })

  // Replace @import references
  result = result.replace(/@import\s+['"]([^'"]+)['"];?/gi, (match, importPath) => {
    if (importPath.startsWith('http://') || importPath.startsWith('https://')) {
      return match
    }

    let absoluteUrl: string
    if (importPath.startsWith('/')) {
      absoluteUrl = baseUrl + importPath
    } else {
      absoluteUrl = basePath + importPath
    }

    return `@import '${absoluteUrl}';`
  })

  return result
}


// ============ PARSING FUNCTIONS ============

function parseWebsiteContent(html: string, domain: string, crawledAssets: CrawlResult): ParsedContent {
  const $ = cheerio.load(html)

  // Extract basic metadata
  const title = $("title").text() || domain
  const description = $('meta[name="description"]').attr("content") || ""
  const favicon = $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || null
  const keywords = $('meta[name="keywords"]').attr("content")?.split(",").map((k: string) => k.trim()) || []
  const ogImage = $('meta[property="og:image"]').attr("content") || undefined
  const twitterCard = $('meta[name="twitter:card"]').attr("content") || undefined
  const charset = $('meta[charset]').attr("charset") || "utf-8"
  const language = $("html").attr("lang") || "en"

  // Extract head and body content
  const headContent = $('head').html() || ''
  const bodyContent = $('body').html() || ''

  const navItems: NavItem[] = []
  const images: ExtractedImage[] = []
  const formElements: FormElement[] = []

  // Extract navigation
  $("nav, header").first().find("a").each((_: number, el: any) => {
    const text = $(el).text().trim()
    const href = $(el).attr("href")
    if (text && href && text.length < 50) {
      navItems.push({
        text,
        href: normalizeUrl(href, domain),
        ariaLabel: $(el).attr("aria-label")
      })
    }
  })

  // Hero section detection
  let hero: HeroSection = {
    title: $("h1").first().text().trim() || title,
    subtitle: $("p").first().text().trim() || description,
    ctaText: "Get Started",
    ctaLink: "#",
    backgroundImage: null,
  }

  // Extract images
  $("img").each((_: number, el: any) => {
    const src = $(el).attr("src")
    if (src && !src.startsWith("data:")) {
      images.push({
        src: normalizeUrl(src, domain),
        alt: $(el).attr("alt") || "Image",
        section: $(el).closest("section").attr("class") || "general"
      })
    }
  })

  // Extract form elements
  $("input, select, textarea").each((_: number, el: any) => {
    const type = $(el).attr("type") || (el as any).tagName?.toLowerCase() || "text"
    formElements.push({
      type,
      placeholder: $(el).attr("placeholder"),
      required: $(el).attr("required") !== undefined,
    })
  })

  // Extract footer links
  const footerLinks: FooterLink[] = []
  $("footer").each((_: number, footer: any) => {
    $(footer).find("div, ul, section").each((_: number, section: any) => {
      const heading = $(section).find("h3, h4, strong").first().text().trim()
      if (heading) {
        const links: { text: string; href: string }[] = []
        $(section).find("a").each((_: number, link: any) => {
          const text = $(link).text().trim()
          const href = $(link).attr("href") || "#"
          if (text) links.push({ text, href: normalizeUrl(href, domain) })
        })
        if (links.length > 0) {
          footerLinks.push({ section: heading, links })
        }
      }
    })
  })

  // Extract layout raw HTML
  const headerHtml = $("header, nav").first().html() || ""
  const footerHtml = $("footer").first().html() || ""

  // Extract sections, excluding header/footer contents
  const sections: ContentSection[] = []
  const sectionElements = $("section, article, main > div, [class*='section'], [class*='container'] > div").filter((_: number, el: any) => {
    return $(el).closest("header, nav, footer").length === 0
  })

  sectionElements.each((index: number, el: any) => {
    const heading = $(el).find("h2, h3, h1").first().text().trim()
    const sectionRawHtml = $(el).html() || ""

    if (sectionRawHtml.length < 100) return

    sections.push({
      id: `section-\${index}`,
      type: "content",
      heading: heading || `Section \${index + 1}`,
      subheading: "",
      content: $(el).text().trim().substring(0, 500),
      rawHtml: sectionRawHtml,
      items: [],
      columns: 1
    })
  })

  const colorPalette = extractColorsFromAssets(crawledAssets)

  return {
    title,
    description,
    favicon: favicon ? normalizeUrl(favicon, domain) : null,
    navItems: navItems.slice(0, 10),
    hero,
    sections,
    footerLinks,
    images: images.slice(0, 50),
    formElements,
    colors: colorPalette,
    metadata: {
      language,
      charset,
      keywords,
      url: `https://${domain}`,
      ogImage,
      twitterCard,
    },
    bodyContent,
    headContent,
    htmlAttributes: (crawledAssets as any).metadata?.html_attributes || {},
    bodyAttributes: (crawledAssets as any).metadata?.body_attributes || {},
    crawledAssets,
    headerHtml,
    footerHtml,
  }
}

// ============ HELPER FUNCTIONS ============

function normalizeUrl(url: string, domain: string): string {
  if (!url) return ""
  if (url.startsWith("data:")) return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("//")) return "https:" + url
  if (url.startsWith("/")) return `https://${domain}${url}`
  return `https://${domain}/${url}`
}

function extractColorsFromAssets(crawledAssets: CrawlResult): ColorPalette {
  const colors = {
    primary: "#3b82f6",
    secondary: "#1e40af",
    accent: "#60a5fa",
    background: "#ffffff",
    text: "#1f2937"
  }

  // Combine all CSS content
  const allCss = [
    ...crawledAssets.cssFiles.map(f => f.content),
    ...crawledAssets.inlineStyles
  ].join("\n")

  // Try to extract primary color from CSS variables or common patterns
  const primaryMatch = allCss.match(/--primary[^:]*:\s*([#\w(),.]+)/i)
  if (primaryMatch) colors.primary = primaryMatch[1].trim()

  const secondaryMatch = allCss.match(/--secondary[^:]*:\s*([#\w(),.]+)/i)
  if (secondaryMatch) colors.secondary = secondaryMatch[1].trim()

  const accentMatch = allCss.match(/--accent[^:]*:\s*([#\w(),.]+)/i)
  if (accentMatch) colors.accent = accentMatch[1].trim()

  return colors
}

function detectSectionType(el: cheerio.Cheerio<cheerio.Element>): ContentSection["type"] {
  const html = el.html() || ""
  if (html.includes("testimonial") || html.includes("quote")) return "testimonials"
  if (html.includes("pricing") || html.includes("plan")) return "pricing"
  if (html.includes("faq") || html.includes("question")) return "faq"
  if (html.includes("contact") || html.includes("form")) return "contact"
  if (el.find("[class*='card']").length > 0) return "cards"
  return "features"
}

function detectColumns(el: cheerio.Cheerio<cheerio.Element>): number {
  const classList = el.attr("class") || ""
  if (classList.includes("4")) return 4
  if (classList.includes("3")) return 3
  if (classList.includes("2")) return 2
  return 1
}

function generateMockContent(domain: string): ParsedContent {
  const titleCase = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)
  return {
    title: titleCase,
    description: `Learn about ${titleCase}`,
    favicon: null,
    navItems: [
      { text: "Home", href: "/" },
      { text: "About", href: "/about" },
      { text: "Services", href: "/services" },
      { text: "Contact", href: "/contact" },
    ],
    hero: {
      title: `Welcome to ${titleCase}`,
      subtitle: "Building amazing digital experiences",
      ctaText: "Get Started",
      ctaLink: "/contact",
      backgroundImage: null,
    },
    sections: [
      {
        id: "section-1",
        type: "features",
        heading: "Why Choose Us",
        subheading: "We deliver excellence",
        content: "Our services are designed to meet your needs",
        items: [
          { title: "Fast", description: "Lightning quick performance" },
          { title: "Secure", description: "Enterprise-grade security" },
          { title: "Reliable", description: "99.9% uptime guarantee" },
        ],
        columns: 3,
      },
    ],
    footerLinks: [
      { section: "Company", links: [{ text: "About", href: "/about" }, { text: "Contact", href: "/contact" }] },
    ],
    images: [],
    formElements: [{ type: "email", placeholder: "your@email.com", required: true }],
    colors: { primary: "#3b82f6", secondary: "#1e40af", accent: "#60a5fa", background: "#ffffff", text: "#1f2937" },
    metadata: { language: "en", charset: "utf-8", keywords: [], ogImage: undefined, twitterCard: undefined },
    bodyContent: "",
    headContent: "",
    crawledAssets: { html: "", cssFiles: [], jsFiles: [], inlineStyles: [], inlineScripts: [] },
  }
}
