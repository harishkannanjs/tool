/**
 * Utilities to apply AI suggestions to code generation
 * This module bridges AI recommendations and deterministic generation
 */

import { AIAnalysisResult } from "./ai/analyze-website";

/**
 * Get a better component name for a section based on AI suggestions
 */
export function getComponentNameFromAI(
  sectionIndex: number,
  defaultName: string,
  aiSuggestions?: AIAnalysisResult
): string {
  if (!aiSuggestions?.sections?.[sectionIndex]) {
    return defaultName;
  }

  const section = aiSuggestions.sections[sectionIndex];
  return section.name || defaultName;
}

/**
 * Get suggested props for a component from AI analysis
 */
export function getSuggestedPropsFromAI(
  componentName: string,
  aiSuggestions?: AIAnalysisResult
): { name: string; type: string; required: boolean }[] {
  if (!aiSuggestions?.components) {
    return [];
  }

  const component = aiSuggestions.components.find(
    (c) => c.name === componentName
  );
  return component?.props || [];
}

/**
 * Check if a component should be reusable based on AI analysis
 */
export function isComponentReusableFromAI(
  componentName: string,
  aiSuggestions?: AIAnalysisResult
): boolean {
  if (!aiSuggestions?.components) {
    return false;
  }

  const component = aiSuggestions.components.find(
    (c) => c.name === componentName
  );
  return component?.reusable ?? false;
}

/**
 * Get suggested category for a component (common, layout, page)
 */
export function getComponentCategoryFromAI(
  componentName: string,
  aiSuggestions?: AIAnalysisResult
): "common" | "layout" | "page" | null {
  if (!aiSuggestions?.components) {
    return null;
  }

  const component = aiSuggestions.components.find(
    (c) => c.name === componentName
  );
  return component?.category || null;
}

/**
 * Get the total number of suggested reusable components
 */
export function getReusableComponentCount(
  aiSuggestions?: AIAnalysisResult
): number {
  if (!aiSuggestions?.components) {
    return 0;
  }

  return aiSuggestions.components.filter((c) => c.reusable).length;
}

/**
 * Get suggested pages based on AI analysis
 */
export function getSuggestedPages(
  aiSuggestions?: AIAnalysisResult
): string[] {
  return aiSuggestions?.insights?.suggestedPages || ["Home"];
}

/**
 * Log AI suggestions to console for debugging
 */
export function logAISuggestions(
  aiSuggestions?: AIAnalysisResult
): void {
  if (!aiSuggestions) {
    console.log("No AI suggestions available");
    return;
  }

  console.log("=== AI Structure Analysis ===");
  console.log(`Pages: ${aiSuggestions.pages.length}`);
  console.log(`Sections: ${aiSuggestions.sections.length}`);
  console.log(`Components: ${aiSuggestions.components.length}`);
  console.log(
    `Reusable components: ${aiSuggestions.insights.reusableComponentCount}`
  );
  console.log(`Layout strategy: ${aiSuggestions.insights.layoutStrategy}`);
  console.log("=============================");
}
