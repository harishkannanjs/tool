# AI Module - Architecture & Implementation

## Overview

The AI module uses Google Gemini API to provide **semantic understanding** of website structure. It acts as a software architect, not a parser.

## Module Structure

```
lib/ai/
├── analyze-website.ts      # Main API integration
├── prompts.ts              # Prompt templates
├── utils.ts                # Helper functions
└── [used by codebase-generator.tsx]
```

### analyze-website.ts
**Primary file for AI integration**

```typescript
export async function analyzeWebsiteStructure(
  parsedContent: any
): Promise<AIAnalysisResult | null>

export interface AIAnalysisResult {
  pages: PageSuggestion[]
  sections: SectionSuggestion[]
  components: ComponentSuggestion[]
  insights: AnalysisInsights
}
```

**Key features:**
- Calls Gemini 2.0 Flash API
- Returns structured recommendations
- Fails gracefully (returns null if error)
- Has built-in timeout handling
- Validates JSON responses

### prompts.ts
**Prompt engineering for better results**

```typescript
export const STRUCTURE_ANALYSIS_PROMPT = `...`
export const COMPONENT_ANALYSIS_PROMPT = `...`
export const PAGE_STRUCTURE_PROMPT = `...`
export const CONSISTENCY_CHECK_PROMPT = `...`
```

Each prompt guides Gemini to:
1. Understand intent (not just parse)
2. Return valid JSON
3. Focus on semantic analysis
4. Suggest reusable patterns

### utils.ts
**Utilities to apply AI suggestions**

```typescript
getComponentNameFromAI()      // Better component names
getSuggestedPropsFromAI()     // Inferred prop types
isComponentReusableFromAI()   // Detect reusable patterns
getComponentCategoryFromAI()  // Categorize components
getReusableComponentCount()   // Count reusable items
getSuggestedPages()           // Page organization
logAISuggestions()            // Debug logging
```

## Integration Points

### 1. In codebase-generator.tsx

```typescript
// Import AI functions
import { analyzeWebsiteStructure, getDefaultStructureSuggestions } from "./ai/analyze-website"

// Call after HTML parsing
let aiSuggestions = getDefaultStructureSuggestions(parsedContent)
try {
  const geminiAnalysis = await analyzeWebsiteStructure(parsedContent)
  if (geminiAnalysis) aiSuggestions = geminiAnalysis
} catch (error) {
  console.warn("AI analysis skipped", error)
}

// Store for use during generation
parsedContent.aiSuggestions = aiSuggestions
```

### 2. In section generators

```typescript
// Import utilities
import { getComponentNameFromAI } from "./ai/utils"

// Use AI suggestions
const name = getComponentNameFromAI(index, defaultName, parsedContent.aiSuggestions)
```

### 3. Optional - In component generators

```typescript
// Import utilities
import { getSuggestedPropsFromAI } from "./ai/utils"

// Get AI-recommended props
const props = getSuggestedPropsFromAI("FeatureCard", aiSuggestions)
```

## API Configuration

### Environment Variables

```bash
# .env.local
VITE_GEMINI_API_KEY=your_key_here
```

### Get API Key

1. Visit https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Copy to `.env.local`

### Security

- Never commit `.env.local`
- Use `.env.local.example` as template
- API key is passed only to Gemini, not logged
- Can be rotated anytime in Google Console

## Data Flow

### Parsing → AI → Generation

```
┌─────────────────────────────────────┐
│  Fetch HTML from domain             │
│  (route.ts - deterministic)         │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Parse with Cheerio                 │
│  Extract: navItems, sections, etc.  │
│  (generate-sections.ts - fast)      │
└────────────────┬────────────────────┘
                 ↓
         ParsedContent JSON
                 ↓
┌─────────────────────────────────────┐
│  Gemini API Analysis (optional)     │
│  Detect patterns, suggest structure │
│  (lib/ai/analyze-website.ts)        │
└────────────────┬────────────────────┘
                 ↓
       AIAnalysisResult JSON
                 ↓
┌─────────────────────────────────────┐
│  Code Generation                    │
│  Use AI suggestions for better      │
│  component structure                │
│  (codebase-generator.tsx)           │
└────────────────┬────────────────────┘
                 ↓
    100+ TypeScript files
                 ↓
       ZIP → Download
```

## What Gemini Returns

Example output for a SaaS landing page:

```json
{
  "pages": [
    {
      "name": "Home",
      "description": "Main landing page",
      "sections": ["hero", "features", "pricing", "cta", "footer"]
    }
  ],
  "sections": [
    {
      "id": "features",
      "name": "FeaturesSection",
      "type": "features",
      "description": "Grid of 3 feature cards",
      "contains": ["FeatureCard"]
    },
    {
      "id": "pricing",
      "name": "PricingSection",
      "type": "pricing",
      "description": "Three pricing tiers",
      "contains": ["PricingCard"]
    }
  ],
  "components": [
    {
      "name": "FeatureCard",
      "type": "card",
      "reusable": true,
      "category": "common",
      "props": [
        { "name": "title", "type": "string", "required": true },
        { "name": "description", "type": "string", "required": true },
        { "name": "icon", "type": "string", "required": false }
      ],
      "description": "Reusable component for feature highlights"
    },
    {
      "name": "PricingCard",
      "type": "card",
      "reusable": true,
      "category": "common",
      "props": [
        { "name": "title", "type": "string", "required": true },
        { "name": "price", "type": "string", "required": true },
        { "name": "features", "type": "string[]", "required": true }
      ],
      "description": "Reusable component for pricing options"
    }
  ],
  "insights": {
    "totalSections": 5,
    "reusableComponentCount": 2,
    "suggestedPages": ["Home"],
    "layoutStrategy": "single-column-with-sections"
  }
}
```

## Error Handling

All errors are caught and logged. Generation **always continues**:

```typescript
try {
  const geminiAnalysis = await analyzeWebsiteStructure(parsedContent)
  if (geminiAnalysis) aiSuggestions = geminiAnalysis
} catch (error) {
  // Missing API key? Network error? Use defaults!
  console.warn("AI analysis skipped, using defaults", error)
  aiSuggestions = getDefaultStructureSuggestions(parsedContent)
}

// Generator continues with either AI or defaults
```

### Common Error Scenarios

| Scenario | Behavior |
|----------|----------|
| No API key | Uses defaults, logs debug message |
| Invalid key | Uses defaults, logs error |
| Network error | Uses defaults, logs error |
| API timeout (>10s) | Uses defaults, logs warning |
| Invalid JSON response | Uses defaults, logs warning |
| Gemini down | Uses defaults, logs error |

## Performance

### Speed
- **Typical**: 2-5 seconds
- **Worst case**: 10 seconds (timeout)
- **No internet**: Instant fallback to defaults

### Cost
- **Per site**: ~$0.001 (essentially free)
- **Per 100 sites**: ~$0.10
- **Per 10,000 sites**: ~$10/month

### Budget Example
```
- Input: 2KB average = 400 tokens
- Output: 2KB average = 400 tokens

Per site:
- Input cost: 400 / 1M * $0.075 = $0.00003
- Output cost: 400 / 1M * $0.30 = $0.00012
- Total: ~$0.0002 per site

Scaling:
- 1,000 sites: $0.20
- 10,000 sites: $2
- 100,000 sites: $20
```

## Customization

### Change Prompts

Edit `lib/ai/prompts.ts`:

```typescript
export const STRUCTURE_ANALYSIS_PROMPT = `
  You are a React architect analyzing a website.
  Focus on: [your custom focus areas]
  Ignore: [what to ignore]
  Return JSON with: [expected structure]
`
```

### Use Different Model

Change in `analyze-website.ts`:

```typescript
// From Gemini 2.0 Flash
"gemini-2.0-flash"

// To Gemini 1.5 Pro (more powerful, slower)
"gemini-1.5-pro"

// To Gemini 1.5 Flash (faster, cheaper)
"gemini-1.5-flash"
```

### Add Caching

Wrap `callGeminiAPI()`:

```typescript
async function callGeminiAPIWithCache(
  domain: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Check cache
  const cached = await cache.get(domain)
  if (cached) return cached

  // Call API
  const result = await callGeminiAPI(apiKey, systemPrompt, userPrompt)

  // Store in cache
  await cache.set(domain, result, { ttl: 86400 }) // 24 hours

  return result
}
```

### Swap to Different AI Provider

Replace `callGeminiAPI()` function:

```typescript
// Use OpenAI instead
async function callGeminiAPI(apiKey: string, systemPrompt: string, userPrompt: string) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  })
}

// Or use Anthropic Claude
// Or use Meta Llama
// Or use any model with an API
```

## Testing

### Enable AI for Testing

```javascript
// In browser console
localStorage.setItem("ENABLE_GEMINI", "true")
```

Or add to URL:
```
?use_ai=1
```

### View AI Suggestions

```typescript
import { logAISuggestions } from "@/lib/ai/utils"

logAISuggestions(parsedContent.aiSuggestions)
```

Output:
```
=== AI Structure Analysis ===
Pages: 1
Sections: 5
Components: 7
Reusable components: 3
Layout strategy: single-column-with-sections
=============================
```

## Debugging

### Check if AI is enabled

```javascript
// Browser console
localStorage.getItem("ENABLE_GEMINI")
```

### Check API key

```javascript
// Browser console
console.log(localStorage.getItem("GEMINI_API_KEY"))
```

### Monitor API calls

Add to `analyze-website.ts`:

```typescript
console.time("Gemini API")
const response = await callGeminiAPI(...)
console.timeEnd("Gemini API")
```

### Check response format

```typescript
console.log("Gemini response:", JSON.stringify(response, null, 2))
```

## Files Reference

| File | Purpose |
|------|---------|
| `lib/ai/analyze-website.ts` | Main API integration |
| `lib/ai/prompts.ts` | Prompt templates |
| `lib/ai/utils.ts` | Helper functions |
| `lib/codebase-generator.tsx` | Calls AI, uses suggestions |
| `lib/generate-sections.ts` | Can optionally use AI suggestions |
| `GEMINI_SETUP.md` | Setup guide |
| `GEMINI_QUICK_REF.md` | Quick reference |
| `GEMINI_INTEGRATION_EXAMPLE.ts` | Full example with before/after |

## Next Steps

1. ✅ Get API key: https://aistudio.google.com/app/apikey
2. ✅ Add to `.env.local`: `VITE_GEMINI_API_KEY=...`
3. ✅ Test with a real domain
4. ✅ Review AI suggestions in browser console
5. ✅ Customize prompts if needed
6. ✅ Monitor usage and costs
