export interface PerformanceResult {
  timestamp: string
  testName: string
  filename: string
  fileSize: number
  duration: number
  isValid: boolean
  gitCommit?: string
  nodeVersion: string
  platform: string
  arch: string
}
