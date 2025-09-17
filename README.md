# PDF Validation API

Author: Ramon Morcillo
Collaborator: César Alberca ([website](https://cesalberca.com/))
Company: Matcha Solutions LLC

## Overview

The PDF Validation API is a Node.js Express API that provides a simple endpoint to check if a PDF document contains an empty page. This can be especially useful when working with PDFs in various applications, ensuring the integrity of your documents.




## Performance Results

### Summary
- **Total tests run**: 64
- **Average duration**: 3590.57ms
- **Fastest test**: Asdasdasd.pdf (68.51ms)
- **Slowest test**: EJEMPLO 2 CON HOJAS EN BLANCO.pdf (36906.64ms)

### Recent Test Results

| File | Size (KB) | Duration (ms) | Performance Change |
|------|-----------|--------------------|--------------------|
| LIBRO ORDENES.pdf | 4052.9 | 1460.57 | N/A |
| PROYECTO_BASICO_Y_EJECUCION_CALLE_AGRET6_SUBSA2_signed.pdf | 15997.8 | 4735.46 | N/A |
| PROYECTO_EJECUTIVO_ANEXOS_2_mxc.pdf | 5753.8 | 2693.09 | N/A |
| valid.pdf | 67.8 | 120.37 | N/A |
| Asdasdasd.pdf | 33.7 | 115.92 | N/A |
| EJEMPLO 1 CON HOJAS EN BLANCO.pdf | 44748.3 | 11653.54 | N/A |
| EJEMPLO 2 CON HOJAS EN BLANCO.pdf | 61788.4 | 36906.64 | 🔴 109.5% slower |
| EJEMPLO 3 CON MAS DE UNA HOJA.pdf | 14974.5 | 4794.91 | 🔴 69.8% slower |
| NAVE_JACARILLA_firmado.pdf | 4262.3 | 1330.43 | 🔴 66.2% slower |
| invalid2.pdf | 12.8 | 166.34 | 🔴 53.3% slower |

*Performance results are automatically updated by GitHub Actions after each test run.*

*Performance changes are compared to the previous test run for the same file.*

## Prerequisites

Before using the PDF Validation API, make sure you have Node.js and Ghostscript installed on your system. 

### Installing Node.js

If you don't have Node.js installed, you can download and install it from the official website: [Node.js Download](https://nodejs.org/)

### Installing Ghostscript

If you're using macOS, you can install Ghostscript with Homebrew:

```sh
brew install ghostscript
```

For Linux, use the following commands to install Ghostscript:

```sh
sudo apt-get update
sudo apt-get install -y ghostscript
```

### Installing Git LFS (Required for Development)

This project uses Git LFS (Large File Storage) to manage large PDF test fixtures. All team members need to install and configure Git LFS:

**macOS (using Homebrew):**
```bash
brew install git-lfs
```

**Ubuntu/Debian:**
```bash
sudo apt install git-lfs
```

**Windows:**
Download from: https://git-lfs.github.io/

**Initialize Git LFS:**
```bash
git lfs install
```

**Verify LFS is working:**
```bash
git lfs ls-files
```

This should list all PDF and image files in the test/fixtures directory.

## How to Use

To use the API, follow these steps:

1. Install the project dependencies:

```sh
npm install
```

2. Start the API:

```sh
npm start
```

3. You can now access the API documentation at the following URL:

```text
http://localhost:3000/api-docs
```

4. Follow the API documentation to make requests and check if a PDF document contains an empty page.

### Using PM2 for Process Management (Recommended)

[PM2](https://pm2.keymetrics.io/) is a popular process manager for Node.js applications. It can help you manage the PDF Validation API, ensuring that it runs smoothly and automatically restarts in case of failures.

1. **Install PM2:**

    If `pm2` is not already installed on your server, you can install it globally using npm:

    ```bash
    npm install pm2 -g
    ```

2. **Starting the API with PM2:**

    To start the API using `pm2`, navigate to the project's root directory and run the following command:

    ```bash
    pm2 start app.js --name pdf-validation-api
    ```

    This command will start the API and assign it the name `pdf-validation-api` for easy reference.

3. **Viewing Application Logs:**

    To view the application logs, use the following command:

    ```bash
    pm2 logs pdf-validation-api
    ```

4. **Managing the Application:**

    - To stop the API, use:

      ```bash
      pm2 stop pdf-validation-api
      ```

    - To restart it, use:

      ```bash
      pm2 restart pdf-validation-api
      ```

    - To delete the process (stop and remove it from the process list), use:

      ```bash
      pm2 delete pdf-validation-api
      ```

5. **Automatically Start on Boot:**

    If you want the PDF Validation API to start automatically when your server reboots, use the following command:

    ```bash
    pm2 startup
    ```

    Follow the instructions displayed in the terminal to set up the startup script.

By using `pm2`, you can ensure that your API runs continuously, automatically recovers from crashes, and starts at boot, providing a robust and reliable service.

## Performance Testing

This project includes comprehensive performance testing to monitor and improve PDF validation speed over time. Performance tests measure validation duration and track results historically.

### Running Performance Tests

```bash
# Run performance tests locally
npm run test:perf

# Run performance tests in watch mode (for development)
npm run test:perf:watch

# View performance history summary (requires jq)
npm run perf:history
```

### Automated Performance Testing

Performance tests run automatically in GitHub Actions:

- **On push/PR** to main or develop branches
- **Daily at 2 AM UTC** (scheduled runs)
- **Manual triggers** via GitHub Actions UI

The CI system:
- Tests on multiple Node.js versions (18.x, 20.x)
- Detects performance regressions (>20% slower)
- Stores performance history as artifacts
- Comments on PRs with performance results
- Generates combined performance reports

### Performance Data

Results include:
- Validation duration per PDF
- File size correlation
- Git commit tracking
- System information
- Historical trends and comparisons

For detailed information, see [Performance Testing Guide](docs/PERFORMANCE_TESTING.md).

## Development

### Testing

```bash
# Run functional tests
npm test

# Run performance tests
npm run test:perf

# Run all tests
npm test && npm run test:perf
```


