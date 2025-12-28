/**
 * Gemini API Integration for Website Structure Analysis
 *
 * This module acts as a software architect, analyzing parsed website content
 * and suggesting component hierarchy, page structure, and UI patterns.
 *
 * IMPORTANT: This is a semantic analysis layer ONLY
 * - Does NOT parse HTML (Cheerio does that)
 * - Does NOT generate code
 * - Does NOT validate TypeScript
 * - Suggests structure only
 */

import {
  STRUCTURE_ANALYSIS_PROMPT,
  COMPONENT_ANALYSIS_PROMPT,
  PAGE_STRUCTURE_PROMPT,
  CONSISTENCY_CHECK_PROMPT,
} from "./prompts";

export interface AIAnalysisResult {
  pages: PageSuggestion[];
  sections: SectionSuggestion[];
  components: ComponentSuggestion[];
  insights: AnalysisInsights;
}

export interface PageSuggestion {
  name: string;
  description: string;
  sections: string[];
}

export interface SectionSuggestion {
  id: string;
  name: string;
  type: "hero" | "features" | "pricing" | "form" | "footer" | "layout" | "custom";
  description: string;
  contains: string[];
}

export interface ComponentSuggestion {
  name: string;
  type: string;
  reusable: boolean;
  category: "common" | "layout" | "page";
  props: ComponentProp[];
  description: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
}

export interface AnalysisInsights {
  totalSections: number;
  reusableComponentCount: number;
  suggestedPages: string[];
  layoutStrategy: string;
}

/**
 * Analyze website content and suggest component structure
 * @param parsedContent - Cleaned, structured content from HTML parser
 * @returns AI suggestions for page/component architecture
 */
export async function analyzeWebsiteStructure(
  parsedContent: any
): Promise<AIAnalysisResult | null> {
  // Check if Gemini is enabled
  if (!isGeminiEnabled()) {
    console.debug("Gemini analysis disabled, skipping AI structure analysis");
    return null;
  }

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn("Gemini API key not found, skipping AI analysis");
      return null;
    }

    // Format parsed content for Gemini
    const analysisPrompt = formatStructureAnalysisPrompt(parsedContent);

    // Call Gemini API
    const response = await callGeminiAPI(
      apiKey,
      STRUCTURE_ANALYSIS_PROMPT,
      analysisPrompt
    );

    // Parse and validate response
    const analysis = parseGeminiResponse(response) as AIAnalysisResult;

    return analysis;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    // Fail gracefully - generator still works without AI suggestions
    return null;
  }
}

/**
 * Suggest reusable components for a specific section
 * @param sectionContent - HTML content of a section
 * @param sectionName - Name of the section
 * @returns Component suggestions
 */
export async function suggestComponentsForSection(
  sectionContent: string,
  sectionName: string
): Promise<ComponentSuggestion[] | null> {
  if (!isGeminiEnabled()) return null;

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const analysisPrompt = `Analyze this "${sectionName}" section:

${sectionContent}

Suggest reusable components.`;

    const response = await callGeminiAPI(
      apiKey,
      COMPONENT_ANALYSIS_PROMPT,
      analysisPrompt
    );

    const result = parseGeminiResponse(response);
    return result.suggestedComponents || [];
  } catch (error) {
    console.error("Component suggestion error:", error);
    return null;
  }
}

/**
 * Convert raw HTML/CSS into a modular React component using AI
 */
export async function convertHtmlToReactComponent(
  htmlSnippet: string,
  cssContext: string,
  componentName: string
): Promise<{ code: string; dependencies: string[]; props: any[] } | null> {
  if (!isGeminiEnabled()) return null;

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const { COMPONENT_CONVERSION_PROMPT } = await import("./prompts");

    const userPrompt = `html_snippet: "${htmlSnippet.substring(0, 10000)}"
css_context: "${cssContext.substring(0, 5000)}"
component_name: "${componentName}"`;

    const response = await callGeminiAPI(
      apiKey,
      COMPONENT_CONVERSION_PROMPT,
      userPrompt
    );

    const result = parseGeminiResponse(response);
    return {
      code: result.code,
      dependencies: result.dependencies || [],
      props: result.props || []
    };
  } catch (error) {
    console.error("Component conversion error:", error);
    return null;
  }
}

/**
 * Validate component structure for consistency
 */
export async function validateComponentStructure(
  components: ComponentSuggestion[],
  sections: SectionSuggestion[]
): Promise<{ issues: any[]; suggestions: string[] } | null> {
  if (!isGeminiEnabled()) return null;

  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;

    const analysisPrompt = `Validate this structure:

Components:
${JSON.stringify(components, null, 2)}

Sections:
${JSON.stringify(sections, null, 2)}

Check for consistency and missing pieces.`;

    const response = await callGeminiAPI(
      apiKey,
      CONSISTENCY_CHECK_PROMPT,
      analysisPrompt
    );

    const result = parseGeminiResponse(response);
    return result;
  } catch (error) {
    console.error("Validation error:", error);
    return null;
  }
}

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */

function isGeminiEnabled(): boolean {
  // In browser environment
  if (typeof window !== "undefined") {
    return (
      window.location.search.includes("use_ai=1") ||
      localStorage.getItem("ENABLE_GEMINI") === "true"
    );
  }
  return false;
}

function getGeminiApiKey(): string | null {
  // Try multiple sources
  if (typeof window !== "undefined") {
    return (
      (window as any).__GEMINI_API_KEY__ ||
      localStorage.getItem("GEMINI_API_KEY") ||
      null
    );
  }
  return process.env.VITE_GEMINI_API_KEY || null;
}

async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Gemini API error: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    JSON.stringify({
      error: "No response from Gemini",
    })
  );
}

function formatStructureAnalysisPrompt(parsedContent: any): string {
  return `Analyze this website structure:

Title: ${parsedContent.title}
Description: ${parsedContent.description}

Sections found:
${(parsedContent.sections || [])
      .map(
        (s: any, i: number) =>
          `${i + 1}. ${s.heading || "Section " + (i + 1)}: ${s.content?.substring(0, 100) || "content"}`
      )
      .join("\n")}

Navigation items:
${(parsedContent.navItems || []).map((n: any) => `- ${n.text} (${n.href})`).join("\n")}

Footer links:
${(parsedContent.footerLinks || [])
      .flatMap((f: any) => (f.links || []).map((l: any) => `- ${l.text}`))
      .join("\n")}

Suggest the optimal React component structure for this website.`;
}

function parseGeminiResponse(response: string): any {
  try {
    // Try to parse as JSON
    return JSON.parse(response);
  } catch {
    // If not JSON, wrap in structure
    console.warn("Gemini response was not JSON, treating as text");
    return {
      analysis: response,
      error: "Response was not valid JSON",
    };
  }
}

/**
 * Create AI suggestions as fallback when Gemini is disabled or fails
 * This ensures deterministic behavior
 */
export function getDefaultStructureSuggestions(
  parsedContent: any
): AIAnalysisResult {
  const sectionCount = (parsedContent.sections || []).length;

  return {
    pages: [
      {
        name: "Home",
        description: "Main landing page",
        sections: Array.from({ length: sectionCount }, (_, i) => `section-${i}`),
      },
    ],
    sections: (parsedContent.sections || []).map((s: any, i: number) => ({
      id: `section-${i}`,
      name: `Section${i + 1}`,
      type: "custom" as const,
      description: s.heading || `Section ${i + 1}`,
      contains: ["content"],
    })),
    components: [
      {
        name: "Button",
        type: "button",
        reusable: true,
        category: "common" as const,
        props: [
          { name: "children", type: "ReactNode", required: true },
          { name: "onClick", type: "() => void", required: false },
        ],
        description: "Reusable button component",
      },
      {
        name: "Header",
        type: "layout",
        reusable: false,
        category: "layout" as const,
        props: [],
        description: "Page header with navigation",
      },
      {
        name: "Footer",
        type: "layout",
        reusable: false,
        category: "layout" as const,
        props: [],
        description: "Page footer",
      },
    ],
    insights: {
      totalSections: sectionCount,
      reusableComponentCount: 5,
      suggestedPages: ["Home"],
      layoutStrategy: "single-page",
    },
  };
}
