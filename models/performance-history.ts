import type { PerformanceResult } from './performance-result'
import type { PerformanceSummary } from './performance-summary'

export interface PerformanceHistory {
  results: PerformanceResult[]
  summary: PerformanceSummary
}
