# Performance Testing Guide

## Overview

This project includes comprehensive performance testing for PDF validation to monitor and improve the algorithm's efficiency over time. The performance tests measure the time taken to validate PDFs and track results historically.

## Running Performance Tests

### Local Testing

```bash
# Run performance tests once
npm run test:perf

# Run performance tests in watch mode (for development)
npm run test:perf:watch

# View performance history summary
npm run perf:history
```

### Prerequisites

- **Ghostscript**: Required for PDF processing
  - macOS: `brew install ghostscript`
  - Ubuntu/Debian: `sudo apt-get install ghostscript`
  - Windows: Download from [Ghostscript Downloads](https://www.ghostscript.com/download/gsdnld.html)

- **jq**: Required for viewing performance history (optional)
  - macOS: `brew install jq`
  - Ubuntu/Debian: `sudo apt-get install jq`

## How It Works

### Performance Measurement

The performance tests measure:

- **Duration**: Time taken to validate each PDF (in milliseconds)
- **File size**: Size of the PDF being tested
- **Result accuracy**: Ensures the validation result matches expected outcome
- **System information**: Node.js version, platform, architecture
- **Git commit**: Tracks which code version produced the results

### Test Files

Performance tests run against all PDFs in:
- `test/fixtures/valids/` - PDFs without empty pages
- `test/fixtures/invalids/` - PDFs with empty pages

### Data Storage

Results are stored in `test/performance/performance-history.json` with:

```json
{
  "results": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "testName": "Valid PDF Test",
      "filename": "example.pdf",
      "fileSize": 1024000,
      "duration": 1500.25,
      "isValid": true,
      "gitCommit": "abc123def456",
      "nodeVersion": "v20.10.0",
      "platform": "linux",
      "arch": "x64"
    }
  ],
  "summary": {
    "lastRun": "2024-01-15T10:30:00.000Z",
    "totalTests": 50
  }
}
```

## GitHub Actions Integration

### Automated Testing

Performance tests run automatically:

- **On push** to `main` or `develop` branches
- **On pull requests** to `main` or `develop` branches
- **Manual triggers** via GitHub Actions UI

### Performance Regression Detection

The CI automatically detects performance regressions:

- **Regression threshold**: 20% slower than previous run
- **Improvement detection**: 5% faster than previous run
- **Stability check**: Performance within acceptable range

### Artifacts and Reports

- **Performance history**: Stored as GitHub Actions artifacts (90-day retention)
- **Combined reports**: Aggregated results from all Node.js versions
- **PR comments**: Automatic performance summaries on pull requests

## Interpreting Results

### Performance Metrics

- **Duration**: Lower is better (faster validation)
- **Consistency**: Look for stable results across runs
- **File size correlation**: Larger files typically take longer

### Regression Analysis

Monitor these indicators:

- **Sudden increases** in average duration
- **New outliers** (unexpectedly slow files)
- **Platform differences** between local and CI results

### Performance Optimization

When optimizing the validation algorithm:

1. Run baseline performance test: `npm run test:perf`
2. Make code changes
3. Run performance test again
4. Compare results using `npm run perf:history`
5. Check for improvements or regressions

## Troubleshooting

### Common Issues

1. **Ghostscript not found**
   ```bash
   Error: Ghostscript is not installed
   ```
   Solution: Install Ghostscript using your system's package manager

2. **Permission errors on PDF files**
   ```bash
   Error: EACCES: permission denied
   ```
   Solution: Ensure test fixtures have read permissions

3. **Timeout errors**
   ```bash
   Test timed out after 300000ms
   ```
   Solution: Check if specific PDFs are causing issues; consider increasing timeout

### Debugging Slow Performance

1. **Identify slow files**:
   ```bash
   npm run perf:history | jq '.slowestTest'
   ```

2. **Check system resources** during test runs

3. **Profile individual PDF processing**:
   - Add console logs to `hasEmptyPagesGhostscript.ts`
   - Run single file tests

### CI/CD Debugging

1. **Check Ghostscript installation** in GitHub Actions logs
2. **Verify artifact uploads/downloads** for performance history
3. **Review Node.js version compatibility** if results differ

## Best Practices

### Test Development

- **Consistent test data**: Use the same PDF fixtures for comparable results
- **Environment isolation**: Run tests in clean environments
- **Multiple runs**: Average results across multiple runs for stability

### Performance Monitoring

- **Regular reviews**: Check daily/weekly performance trends
- **Baseline establishment**: Set performance baselines after major changes
- **Threshold tuning**: Adjust regression thresholds based on normal variation

### Optimization Workflow

1. **Measure first**: Establish current performance baseline
2. **Targeted changes**: Focus on specific bottlenecks
3. **Incremental testing**: Test small changes frequently
4. **Documentation**: Record what changes improved/worsened performance

## Integration with Development Workflow

### Pre-commit Checks

Consider adding performance checks to your development workflow:

```bash
# Add to package.json scripts for pre-push hooks
"pre-push": "npm run test:perf && npm run test"
```

### Performance Budgets

Set performance budgets for your team:

- **Maximum average duration**: e.g., 2000ms
- **Maximum individual file time**: e.g., 5000ms
- **Regression tolerance**: e.g., 15% increase

### Continuous Monitoring

- Review GitHub Actions performance reports regularly
- Set up notifications for performance regressions
- Include performance metrics in sprint reviews
