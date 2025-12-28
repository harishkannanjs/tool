"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Globe, Download, Code2, FileCode, Folder, AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react"
import { generateCodebase } from "@/lib/codebase-generator"

type GenerationStatus = "idle" | "fetching" | "analyzing" | "generating" | "zipping" | "complete" | "error"

interface GenerationStep {
  status: GenerationStatus
  label: string
  progress: number
}

const steps: Record<GenerationStatus, GenerationStep> = {
  idle: { status: "idle", label: "Ready to generate", progress: 0 },
  fetching: { status: "fetching", label: "Fetching website content...", progress: 15 },
  analyzing: { status: "analyzing", label: "Analyzing website structure...", progress: 35 },
  generating: { status: "generating", label: "Generating TypeScript codebase...", progress: 70 },
  zipping: { status: "zipping", label: "Creating ZIP archive...", progress: 90 },
  complete: { status: "complete", label: "Generation complete!", progress: 100 },
  error: { status: "error", label: "Generation failed", progress: 0 },
}

export function CodebaseGenerator() {
  const [domain, setDomain] = useState("")
  const [status, setStatus] = useState<GenerationStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([])
  const [wasAccessible, setWasAccessible] = useState<boolean | null>(null)

  const validateDomain = (input: string): boolean => {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    return domainRegex.test(input.trim())
  }

  const handleGenerate = async () => {
    const cleanDomain = domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split("/")[0] // Remove any paths

    if (!validateDomain(cleanDomain)) {
      setError("Please enter a valid domain (e.g., example.com)")
      return
    }

    setError(null)
    setGeneratedFiles([])
    setWasAccessible(null)

    try {
      // Fetch website content
      setStatus("fetching")

      const response = await fetch("/api/fetch-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: cleanDomain }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze website")
      }

      const data = await response.json()
      setWasAccessible(data.accessible)

      setStatus("analyzing")
      await new Promise((resolve) => setTimeout(resolve, 600))

      setStatus("generating")
      const { files, zipBlob } = await generateCodebase(cleanDomain, data.parsedContent, (files) => {
        setGeneratedFiles(files)
      })

      setStatus("zipping")
      await new Promise((resolve) => setTimeout(resolve, 400))

      // Trigger download
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${cleanDomain.replace(/\./g, "-")}-typescript-codebase.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setGeneratedFiles(files)
      setStatus("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setStatus("error")
    }
  }

  const handleReset = () => {
    setStatus("idle")
    setError(null)
    setGeneratedFiles([])
    setWasAccessible(null)
  }

  const currentStep = steps[status]
  const isProcessing = ["fetching", "analyzing", "generating", "zipping"].includes(status)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Code2 className="w-4 h-4" />
          TypeScript Codebase Generator
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 text-balance">
          Convert Any Website to TypeScript
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Enter a domain and get a complete, production-ready TypeScript + React codebase. The generator analyzes the
          website structure and creates relevant components, pages, and services.
        </p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-2xl bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Globe className="w-5 h-5 text-primary" />
            Enter Domain
          </CardTitle>
          <CardDescription>Provide any valid domain to generate its TypeScript codebase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Form */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isProcessing}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground h-12 pl-4 pr-4 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isProcessing) {
                    handleGenerate()
                  }
                }}
              />
            </div>
            <Button
              onClick={status === "complete" || status === "error" ? handleReset : handleGenerate}
              disabled={isProcessing || (!domain.trim() && status === "idle")}
              className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing
                </>
              ) : status === "complete" || status === "error" ? (
                "Generate Another"
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Accessibility Info */}
          {wasAccessible === false && status === "complete" && (
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                The website was not directly accessible, so the codebase was generated using intelligent defaults based
                on the domain name.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Section */}
          {status !== "idle" && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === "complete" ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : status === "error" ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  <span className="text-sm font-medium text-foreground">{currentStep.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">{currentStep.progress}%</span>
              </div>
              <Progress value={currentStep.progress} className="h-2" />
            </div>
          )}

          {/* Generated Files Preview */}
          {generatedFiles.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                Generated Files ({generatedFiles.length})
              </h3>
              <div className="max-h-64 overflow-y-auto bg-secondary/50 rounded-lg p-3 space-y-1">
                {generatedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                    <FileCode className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl w-full">
        <FeatureCard
          icon={<Globe className="w-5 h-5" />}
          title="Website Analysis"
          description="Fetches and analyzes the website to detect navigation, forms, auth, and structure"
        />
        <FeatureCard
          icon={<Code2 className="w-5 h-5" />}
          title="Smart Generation"
          description="Creates relevant pages, components, hooks, services, and tests based on analysis"
        />
        <FeatureCard
          icon={<Download className="w-5 h-5" />}
          title="Instant Download"
          description="Get a ready-to-run ZIP file with proper project structure and dependencies"
        />
      </div>

      {/* Structure Preview */}
      <div className="mt-12 max-w-2xl w-full">
        <h2 className="text-lg font-semibold text-foreground mb-4 text-center">Generated Project Structure</h2>
        <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm text-muted-foreground overflow-x-auto">
          <pre>{`my-typescript-app/
├── src/
│   ├── components/
│   │   ├── common/    # Button, Input, Card, Modal, Loader
│   │   ├── layout/    # Header, Footer, Sidebar
│   │   └── user/      # UserCard, UserProfile
│   ├── pages/         # Home, Login, Dashboard, etc.
│   ├── routes/        # AppRoutes
│   ├── services/      # API, Auth, User services
│   ├── controllers/   # Business logic
│   ├── models/        # Data models
│   ├── hooks/         # useAuth, useForm, useApi, etc.
│   ├── context/       # AuthContext, ThemeContext
│   ├── middlewares/   # Auth middleware
│   ├── utils/         # Helpers, validators, logger
│   ├── types/         # TypeScript interfaces
│   ├── constants/     # Routes, config, API
│   └── styles/        # Global CSS, variables
├── tests/             # Component & hook tests
├── package.json
├── tsconfig.json
└── README.md`}</pre>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
