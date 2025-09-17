# Performance History

This document contains detailed historical performance data for PDF validation tests.

## How to View Performance History

### Command Line
```bash
# View summary of all performance tests
npm run perf:history

# View full performance history
cat test/performance/performance-history.json | jq '.'

# View last 10 results
cat test/performance/performance-history.json | jq '.results[-10:]'
```

### Performance Data Structure

Each performance test result contains:
- `timestamp`: When the test was run
- `testName`: Type of test (Valid PDF Test / Invalid PDF Test)
- `filename`: Name of the PDF file tested
- `fileSize`: Size of the PDF file in bytes
- `duration`: Time taken to validate the PDF in milliseconds
- `isValid`: Whether the PDF passed validation (no empty pages)
- `gitCommit`: Git commit hash when the test was run
- `nodeVersion`: Node.js version used for the test
- `platform`: Operating system platform
- `arch`: System architecture

## Performance Trends

The performance data helps track:
- Algorithm efficiency improvements over time
- File size impact on processing time
- Performance regressions between code changes
- System-specific performance characteristics

## Accessing Historical Data

### GitHub Actions Artifacts
Historical performance data is stored as GitHub Actions artifacts with 90-day retention. You can download artifacts from the Actions tab in the GitHub repository.

### Local Development
When running performance tests locally, results are automatically appended to `test/performance/performance-history.json`.

### Regression Detection
The system automatically detects performance regressions by comparing current results with previous runs:
- **Regression**: >20% slower than previous run
- **Improvement**: >5% faster than previous run
- **Stable**: Within ±5% of previous run

## Performance Comparison

The main README shows recent performance results with change indicators:
- 🟢 Faster performance compared to previous run
- 🔴 Slower performance compared to previous run  
- ⚪ Similar performance (within 5% change)

For detailed analysis, examine the full performance history data stored in this repository or download from GitHub Actions artifacts.
