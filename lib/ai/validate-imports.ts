/**
 * Import Validation Module
 * Validates that all imported modules will exist in the generated codebase
 */

export interface GeneratedFile {
  path: string
  content: string
}

export interface ValidationError {
  file: string
  line?: number
  error: string
  severity: "error" | "warning"
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Validate that all imports in generated files exist
 */
export function validateImports(
  generatedFiles: GeneratedFile[] | Map<string, string>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Convert array to map if needed
  const fileMap = new Map<string, string>()
  if (Array.isArray(generatedFiles)) {
    for (const file of generatedFiles) {
      fileMap.set(file.path, file.content)
    }
  } else {
    for (const [path, content] of generatedFiles) {
      fileMap.set(path, content)
    }
  }

  // Extract all imports from all files
  for (const [filePath, content] of fileMap) {
    const imports = extractImports(content)

    // Check each import
    for (const imp of imports) {
      if (!fileExists(imp.path, fileMap)) {
        const error: ValidationError = {
          file: filePath,
          error: `Cannot find module '${imp.path}' (imported as '${imp.name}')`,
          severity: "error",
        }
        errors.push(error)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Extract all imports from a file content
 */
function extractImports(
  content: string
): Array<{ path: string; name: string }> {
  const imports: Array<{ path: string; name: string }> = []

  // Match ES6 imports
  const importRegex = /import\s+(?:{[^}]*}|[^from]*?)\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    // Skip node_modules and relative imports starting with ./
    if (!importPath.startsWith("node_modules") && !importPath.startsWith(".")) {
      imports.push({ path: importPath, name: importPath })
    }
  }

  return imports
}

/**
 * Check if a file exists in the generated files map
 */
function fileExists(
  importPath: string,
  generatedFiles: Map<string, string>
): boolean {
  // Handle @/ aliases
  let filePath = importPath
  if (importPath.startsWith("@/")) {
    filePath = "src/" + importPath.substring(2)
  }

  // Check with various extensions
  const possiblePaths = [
    filePath,
    filePath + ".ts",
    filePath + ".tsx",
    filePath + ".js",
    filePath + ".jsx",
    filePath + "/index.ts",
    filePath + "/index.tsx",
    filePath + "/index.js",
    filePath + "/index.jsx",
  ]

  for (const possiblePath of possiblePaths) {
    if (generatedFiles.has(possiblePath)) {
      return true
    }
  }

  return false
}

/**
 * Get a report of missing imports
 */
export function getMissingImportsReport(result: ValidationResult): string {
  if (result.isValid) {
    return "✅ All imports are valid!"
  }

  let report = "❌ Import Validation Errors:\n\n"

  for (const error of result.errors) {
    report += `  File: ${error.file}\n`
    report += `  Error: ${error.error}\n\n`
  }

  return report
}

/**
 * Known safe imports that don't need to be checked
 */
const SAFE_IMPORTS = [
  "react",
  "react-dom",
  "react-router-dom",
  "next",
  "next/",
  "axios",
  "clsx",
  "cn",
  "tailwind-merge",
  "class-variance-authority",
  "@radix-ui",
  "zustand",
  "date-fns",
  "zod",
  "lodash",
  "uuid",
  "jszip",
  "geist",
]

/**
 * Check if an import is from a known safe package
 */
export function isSafeImport(importPath: string): boolean {
  return SAFE_IMPORTS.some((safe) => importPath.startsWith(safe))
}

/**
 * Enhanced validation that checks against known patterns
 */
export function validateImportsEnhanced(
  generatedFiles: GeneratedFile[] | Map<string, string>
): ValidationResult {
  const result = validateImports(generatedFiles)

  // Filter out safe imports from errors
  result.errors = result.errors.filter(
    (error) => !isSafeImport(error.error)
  )

  result.isValid = result.errors.length === 0

  return result
}
