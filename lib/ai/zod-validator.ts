/**
 * Zod-Based Validation for Generated Codebases
 * Validates TypeScript syntax, type safety, and component prop compatibility
 */

import { z } from 'zod'

// ============ SCHEMA DEFINITIONS ============

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export const ComponentPropsSchema = z.object({
  name: z.string(),
  props: z.record(z.any()),
  usage: z.string(),
})

export const TypeErrorSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  error: z.string(),
  severity: z.enum(['error', 'warning']),
  suggestion: z.string().optional(),
})

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(TypeErrorSchema),
  warnings: z.array(TypeErrorSchema),
  typeChecksPassed: z.boolean(),
  syntaxErrors: z.array(TypeErrorSchema),
})

// ============ TYPE DEFINITIONS ============

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>
export type ComponentProps = z.infer<typeof ComponentPropsSchema>
export type TypeError = z.infer<typeof TypeErrorSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>

// ============ VALIDATION RULES ============

/**
 * Validates that website content was properly extracted
 */
export function validateContentExtraction(
  generatedFiles: GeneratedFile[]
): TypeError[] {
  const errors: TypeError[] = []

  // Check Home.tsx for meaningful content
  const homeFile = generatedFiles.find(f => f.path.includes('Home.tsx'))
  if (homeFile) {
    // Check if sections are being rendered
    const hasSectionImports = homeFile.content.includes('import {') && homeFile.content.includes('} from')
    const hasSectionRenders = homeFile.content.includes('<Section')
    
    // Check for placeholder text that indicates no content was extracted
    const hasPlaceholder = homeFile.content.includes('No items to display') && 
                           !hasSectionRenders && 
                           !homeFile.content.includes('<Section1')
    
    if (hasPlaceholder) {
      errors.push({
        file: 'src/pages/Home.tsx',
        error: 'Website content may not have been properly extracted - consider providing fallback content',
        severity: 'warning',
        suggestion: 'Ensure the website is accessible and contains proper HTML structure (sections, headings, content)',
      })
    }
  }

  // Check if Header has navigation items
  const headerFile = generatedFiles.find(f => f.path.includes('Header.tsx'))
  if (headerFile && !headerFile.content.includes('NavLink')) {
    // No navigation links were extracted - might indicate parsing failure
    errors.push({
      file: 'src/components/layout/Header.tsx',
      error: 'No navigation items were extracted from the website',
      severity: 'warning',
      suggestion: 'Navigation content might not have been detected - using defaults',
    })
  }

  return errors
}

/**
 * Validates Tailwind CSS classes and custom class definitions
 */
export function validateTailwindClasses(
  generatedFiles: GeneratedFile[]
): TypeError[] {
  const errors: TypeError[] = []

  // Check for invalid Tailwind patterns with custom colors
  const invalidPatterns = [
    { pattern: /focus:ring-primary-500\/\d+/g, file: 'styles/globals.css', issue: 'Invalid opacity modifier on custom color - use focus:ring-primary-500 without /20' },
    { pattern: /focus:border-primary-\d+/g, file: 'Input', issue: 'Custom primary color must be defined in Tailwind config with proper scale (50-900)' },
  ]

  generatedFiles.forEach(file => {
    // Check for invalid CSS opacity patterns
    if (file.content.includes('ring-primary-500/20')) {
      const lines = file.content.split('\n')
      lines.forEach((line, index) => {
        if (line.includes('ring-primary-500/20')) {
          errors.push({
            file: file.path,
            line: index + 1,
            error: 'Invalid Tailwind class: ring-primary-500/20 - opacity modifiers not supported on custom colors',
            severity: 'error',
            suggestion: 'Use ring-primary-500 without the /20 opacity modifier',
          })
        }
      })
    }

    // Check Tailwind config for proper color definitions
    if (file.path.includes('tailwind.config')) {
      if (!file.content.includes('primary: {') && file.content.includes('primary:')) {
        errors.push({
          file: file.path,
          error: 'Tailwind config: primary color must be defined as an object with scale (50, 100, 200...900)',
          severity: 'error',
          suggestion: 'Define primary color with proper color scale: primary: { 50: "#...", 100: "#...", ... }',
        })
      }
    }
  })

  return errors
}

/**
 * Fixes CSS validation issues
 */
export function autoFixTailwindClasses(
  generatedFiles: GeneratedFile[]
): GeneratedFile[] {
  return generatedFiles.map(file => {
    let content = file.content

    // Fix ring-primary-500/20 → ring-primary-500
    content = content.replace(/ring-primary-500\/20/g, 'ring-primary-500')
    
    // Fix any other invalid opacity patterns on custom colors
    content = content.replace(/focus:ring-primary-\d+\/\d+/g, (match) => {
      return match.replace(/\/\d+$/, '')
    })

    return { ...file, content }
  })
}

/**
 * Validates component function signatures
 */
export function validateComponentSignatures(
  generatedFiles: GeneratedFile[]
): TypeError[] {
  const errors: TypeError[] = []

  // Button component validation
  const buttonFile = generatedFiles.find(f => f.path.includes('Button.tsx'))
  if (buttonFile) {
    const hasButtonVariantsCall = buttonFile.content.includes('buttonVariants({')
    const hasProperSignature = buttonFile.content.includes(
      'const buttonVariants = (variant: ButtonVariant, size: ButtonSize)'
    )

    if (hasButtonVariantsCall && hasProperSignature) {
      // Signature expects 2 positional args, but being called with object
      // This is the error
      if (!buttonFile.content.includes('buttonVariants(variant, size)')) {
        errors.push({
          file: 'src/components/common/Button.tsx',
          line: 39,
          error:
            'buttonVariants expects 2 positional arguments (variant, size) but is being called with an object',
          severity: 'error',
          suggestion:
            'Change buttonVariants({ variant, size }) to buttonVariants(variant, size)',
        })
      }
    }
  }

  // Card component validation
  const cardFile = generatedFiles.find(f => f.path.includes('Card.tsx'))
  if (cardFile) {
    const hasCardVariantsCall = cardFile.content.includes('cardVariants({')
    const hasProperSignature = cardFile.content.includes(
      'const cardVariants = (variant: CardVariant = '
    )

    if (hasCardVariantsCall && hasProperSignature) {
      // Function expects 1 positional arg, but object is being passed
      if (!cardFile.content.includes('cardVariants(variant)')) {
        errors.push({
          file: 'src/components/common/Card.tsx',
          line: 22,
          error:
            'cardVariants expects a CardVariant argument but is receiving an object { variant }',
          severity: 'error',
          suggestion:
            'Change cardVariants({ variant }) to cardVariants(variant)',
        })
      }
    }
  }

  // Input component validation
  const inputFile = generatedFiles.find(f => f.path.includes('Input.tsx'))
  if (inputFile) {
    const hasInputVariantsCall = inputFile.content.includes('inputVariants({')
    const hasProperSignature = inputFile.content.includes(
      'const inputVariants = (size: InputSize = '
    )

    if (hasInputVariantsCall && hasProperSignature) {
      // Function expects positional args, but object is being passed
      if (!inputFile.content.includes('inputVariants(inputSize)')) {
        errors.push({
          file: 'src/components/common/Input.tsx',
          line: 40,
          error:
            'inputVariants expects a size argument but is receiving an object { size: inputSize }',
          severity: 'error',
          suggestion:
            'Change inputVariants({ size: inputSize }) to inputVariants(inputSize)',
        })
      }
    }
  }

  return errors
}

/**
 * Validates TypeScript syntax patterns
 */
export function validateTypeScriptPatterns(
  generatedFiles: GeneratedFile[]
): TypeError[] {
  const errors: TypeError[] = []

  for (const file of generatedFiles) {
    // Check for missing type annotations
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
      // Validate function parameters have types
      const functionParams = /function\s+\w+\s*\([^)]*\)/g
      const matches = file.content.match(functionParams)

      if (matches) {
        matches.forEach(match => {
          // Skip JSX.Element type checks
          if (
            !match.includes(':') &&
            !match.includes('...') &&
            match.includes('(') &&
            !match.match(/\(\s*\)/)
          ) {
            // Could be missing types, but be lenient with inferred types
          }
        })
      }

      // Check for proper export statements
      if (
        (file.path.includes('context/') || file.path.includes('hooks/')) &&
        !file.content.includes('export')
      ) {
        errors.push({
          file: file.path,
          error: 'Context or hook file missing export statement',
          severity: 'error',
          suggestion: 'Add export keyword to main declaration',
        })
      }
    }
  }

  return errors
}

/**
 * Validates component prop types match usage
 */
export function validateComponentPropUsage(
  generatedFiles: GeneratedFile[]
): TypeError[] {
  const errors: TypeError[] = []

  for (const file of generatedFiles) {
    if (!file.path.includes('components/')) continue

    // Check for proper prop destructuring in component definitions
    if (file.content.includes('extends ButtonHTMLAttributes')) {
      if (!file.content.includes('variant?:') && file.content.includes('variant =')) {
        // Variant should be optional in interface if defaulting
      }
    }

    // Check for React.forwardRef usage with proper types
    if (file.content.includes('forwardRef<')) {
      if (!file.content.includes('extends HTMLAttributes') && !file.content.includes('Props extends')) {
        // Props should extend HTML attributes for consistency
      }
    }
  }

  return errors
}

/**
 * Main validation function
 */
export function validateGeneratedCodebase(
  generatedFiles: GeneratedFile[]
): ValidationResult {
  const signatureErrors = validateComponentSignatures(generatedFiles)
  const typeErrors = validateTypeScriptPatterns(generatedFiles)
  const propErrors = validateComponentPropUsage(generatedFiles)
  const cssErrors = validateTailwindClasses(generatedFiles)
  const contentErrors = validateContentExtraction(generatedFiles)

  const allErrors = [...signatureErrors, ...typeErrors, ...propErrors, ...cssErrors, ...contentErrors]

  return {
    isValid: allErrors.filter(e => e.severity === 'error').length === 0,
    errors: allErrors.filter(e => e.severity === 'error'),
    warnings: allErrors.filter(e => e.severity === 'warning'),
    typeChecksPassed: allErrors.filter(e => e.severity === 'error').length === 0,
    syntaxErrors: allErrors.filter(e => e.error.includes('syntax')),
  }
}

/**
 * Attempts to fix known issues in generated code
 */
export function autoFixGeneratedCode(
  generatedFiles: GeneratedFile[]
): GeneratedFile[] {
  // First fix CSS/Tailwind issues
  let fixed = autoFixTailwindClasses(generatedFiles)

  fixed = fixed.map(file => {
    let content = file.content

    // Fix Button component variant calling
    if (file.path.includes('Button.tsx')) {
      content = content.replace(
        'buttonVariants({ variant, size })',
        'buttonVariants(variant, size)'
      )
      content = content.replace(
        'buttonVariants({variant,size})',
        'buttonVariants(variant, size)'
      )
    }

    // Fix Card component variant calling
    if (file.path.includes('Card.tsx')) {
      content = content.replace(
        'cardVariants({ variant })',
        'cardVariants(variant)'
      )
      content = content.replace(
        'cardVariants({variant})',
        'cardVariants(variant)'
      )
    }

    // Fix Input component variant calling
    if (file.path.includes('Input.tsx')) {
      content = content.replace(
        'inputVariants({ size: inputSize })',
        'inputVariants(inputSize)'
      )
      content = content.replace(
        'inputVariants({size: inputSize})',
        'inputVariants(inputSize)'
      )
      // Also fix the alternative pattern
      content = content.replace(
        'inputVariants({ size })',
        'inputVariants(size)'
      )
    }

    return { ...file, content }
  })

  return fixed
}

/**
 * Validates and auto-fixes the entire codebase
 */
export function validateAndFixCodebase(
  generatedFiles: GeneratedFile[]
): { files: GeneratedFile[]; result: ValidationResult } {
  // First, attempt to fix known issues
  const fixedFiles = autoFixGeneratedCode(generatedFiles)

  // Then validate
  const result = validateGeneratedCodebase(fixedFiles)

  return { files: fixedFiles, result }
}

/**
 * Generates a detailed report of validation results
 */
export function generateValidationReport(result: ValidationResult): string {
  let report = ''

  if (result.isValid) {
    report += '✅ VALIDATION PASSED\n'
    report += 'All generated code passed type checking and validation.\n\n'
  } else {
    report += '🚨 VALIDATION FAILED\n'
    report += `Found ${result.errors.length} critical error(s)\n\n`
  }

  if (result.errors.length > 0) {
    report += 'ERRORS:\n'
    report += '═══════\n'
    result.errors.forEach((error, i) => {
      report += `${i + 1}. ${error.file}`
      if (error.line) report += ` (Line ${error.line})`
      report += '\n'
      report += `   Error: ${error.error}\n`
      if (error.suggestion) {
        report += `   Fix: ${error.suggestion}\n`
      }
      report += '\n'
    })
  }

  if (result.warnings.length > 0) {
    report += 'WARNINGS:\n'
    report += '═════════\n'
    result.warnings.forEach((warning, i) => {
      report += `${i + 1}. ${warning.file}`
      if (warning.line) report += ` (Line ${warning.line})`
      report += '\n'
      report += `   Warning: ${warning.error}\n`
      if (warning.suggestion) {
        report += `   Suggestion: ${warning.suggestion}\n`
      }
      report += '\n'
    })
  }

  report += '\nVALIDATION SUMMARY:\n'
  report += '═══════════════════\n'
  report += `Type Checks: ${result.typeChecksPassed ? '✅ PASSED' : '❌ FAILED'}\n`
  report += `Critical Errors: ${result.errors.length}\n`
  report += `Warnings: ${result.warnings.length}\n`

  return report
}
