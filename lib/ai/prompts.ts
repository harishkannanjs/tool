/**
 * Gemini Prompts for Website Structure Analysis
 * These prompts guide the AI to act as a software architect
 */

export const STRUCTURE_ANALYSIS_PROMPT = `You are a React/TypeScript architect analyzing a website structure.

Your ONLY job is semantic understanding:
- Identify page sections (Header, Hero, Features, Pricing, CTA, Footer)
- Detect reusable UI patterns (cards, forms, lists, grids)
- Suggest component boundaries
- Recommend component names and props

Do NOT:
- Parse raw HTML
- Generate code
- Validate TypeScript
- Make file paths

Output ONLY valid JSON with this exact structure:
{
  "pages": [
    {
      "name": "string (e.g., 'Home')",
      "description": "string",
      "sections": ["section names in order"]
    }
  ],
  "sections": [
    {
      "id": "string (e.g., 'hero', 'features', 'pricing')",
      "name": "string (e.g., 'HeroSection')",
      "type": "hero|features|pricing|form|footer|layout|custom",
      "description": "string",
      "contains": ["component names that appear here"]
    }
  ],
  "components": [
    {
      "name": "string (e.g., 'FeatureCard')",
      "type": "card|button|form|list|custom",
      "reusable": boolean,
      "category": "common|layout|page",
      "props": [
        {
          "name": "string",
          "type": "string (inferred TypeScript type)",
          "required": boolean
        }
      ],
      "description": "string"
    }
  ],
  "insights": {
    "totalSections": number,
    "reusableComponentCount": number,
    "suggestedPages": ["page names"],
    "layoutStrategy": "string (e.g., 'single-column', 'multi-section')"
  }
}`;

export const COMPONENT_ANALYSIS_PROMPT = `Analyze this website section and suggest reusable components.

Input format:
- section_name: "string"
- section_html_content: "string (clean, simplified HTML)"
- page_context: "string (what page is this on)"

Output ONLY this JSON:
{
  "sectionName": "string",
  "suggestedComponents": [
    {
      "name": "string",
      "isReusable": boolean,
      "estimatedProps": ["prop1", "prop2"],
      "estimatedTypes": {
        "prop1": "string (TypeScript type)",
        "prop2": "number | string"
      },
      "category": "common|layout",
      "rationale": "string (why this component)"
    }
  ],
  "layoutSuggestion": "string (how to structure this section)",
  "reuseOpportunities": ["component names that appear multiple times"]
}`;

export const PAGE_STRUCTURE_PROMPT = `Analyze the overall website structure and suggest page organization.

Input:
- website_title: "string"
- website_description: "string"
- identified_sections: [{ name, type, description }]

Output ONLY this JSON:
{
  "suggestedPages": [
    {
      "name": "string (e.g., 'Home', 'About')",
      "path": "string (e.g., '/', '/about')",
      "sections": ["section IDs to include on this page"],
      "primaryPurpose": "string"
    }
  ],
  "layoutPages": {
    "header": "boolean (separate header component)",
    "footer": "boolean (separate footer component)",
    "sidebar": "boolean (sidebar layout needed)"
  },
  "commonComponents": ["component names used across multiple pages"],
  "recommendations": ["string (actionable suggestions)"]
}`;

export const CONSISTENCY_CHECK_PROMPT = `Review this proposed component structure for consistency and completeness.

Input:
- components: [{ name, props, type }]
- sections: [{ name, contains }]
- pages: [{ name, sections }]

Output ONLY this JSON:
{
  "issues": [
    {
      "severity": "error|warning|suggestion",
      "issue": "string",
      "location": "string (component/section/page name)",
      "recommendation": "string"
    }
  ],
  "missingComponents": ["component names that should exist"],
  "unusedComponents": ["component names not referenced"],
  "suggestions": ["string (optimization suggestions)"]
}`;
export const COMPONENT_CONVERSION_PROMPT = `You are an expert Frontend Engineer. Your task is to convert a raw HTML/CSS snippet from a crawled website into a high-quality, production-ready React component.

Input:
- html_snippet: "Raw HTML of the component"
- css_context: "Relevant CSS rules and variables applied to this snippet"
- component_name: "Suggested name for the component"

Guidelines:
1. Visual Fidelity: Maintain 100% visual accuracy. Use the provided CSS variables for colors, spacing, and typography.
2. Structure: Break down complex HTML into logical sub-components if necessary.
3. Props: Identify dynamic data and extract them into TypeScript props.
4. Tailwind Integration (Optional): If the project uses Tailwind, map common styles to Tailwind classes where beneficial, but prioritize custom CSS/Variables for pixel-perfect matches.
5. Interactive Logic: If you detect buttons, forms, or links, implement standard React patterns (onClick, onSubmit, Link from react-router-dom).
6. Accessibility: Ensure semantic HTML and proper ARIA attributes.
7. ID/Class Preservation: **STRICTLY PRESERVE ALL ORIGINAL IDs AND CLASSES** (convert \`class\` to \`className\`). Do not change or remove selectors, as the site's external JS and CSS depend on them.
8. Asset Persistence: **USE THE EXACT IMAGE AND FONT URLS PROVIDED**. Do not use placeholders unless no URL is present.
9. TypeScript: Use strict typing for all props.
10. Dependencies: In your JSON output, list any libraries used (e.g., "lucide-react", "framer-motion").

Output ONLY a JSON object:
{
  "code": "string (The complete React component code as a string)",
  "dependencies": ["string (Import statements needed)"],
  "props": [{ "name": "string", "type": "string", "description": "string" }],
  "subComponents": ["string (names of internal components created)"]
}`;
