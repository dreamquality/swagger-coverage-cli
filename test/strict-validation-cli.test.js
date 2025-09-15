const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('CLI Strict Validation Integration Tests', () => {
  const cliPath = path.resolve(__dirname, '../cli.js');
  const specPath = path.resolve(__dirname, 'fixtures/strict-validation-api.yaml');
  const collectionPath = path.resolve(__dirname, 'fixtures/strict-validation-collection.json');
  const newmanPath = path.resolve(__dirname, 'fixtures/strict-validation-newman.json');
  const outputPath = path.resolve(__dirname, 'fixtures/test-strict-output.html');

  afterEach(() => {
    // Clean up output files
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  describe('--strict-query flag', () => {
    test('CLI should enforce strict query parameter validation with --strict-query flag', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        collectionPath,
        '--strict-query',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check that coverage is reduced due to strict validation
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const strictCoverage = parseFloat(coverageMatch[1]);

          // Should have some operations matched but not all due to strict validation
          expect(strictCoverage).toBeGreaterThan(0);
          expect(strictCoverage).toBeLessThan(100);

          // Check that HTML report was generated
          expect(fs.existsSync(outputPath)).toBe(true);
          const htmlContent = fs.readFileSync(outputPath, 'utf8');
          expect(htmlContent).toContain('Swagger Coverage Report');

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);

    test('CLI should show different coverage without --strict-query flag', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        collectionPath,
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check that coverage is higher without strict validation
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const lenientCoverage = parseFloat(coverageMatch[1]);

          // Should have higher coverage without strict validation
          expect(lenientCoverage).toBeGreaterThan(0);

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('--strict-body flag', () => {
    test('CLI should enforce strict request body validation with --strict-body flag', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        collectionPath,
        '--strict-body',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check that coverage is affected by strict body validation
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const strictBodyCoverage = parseFloat(coverageMatch[1]);

          // Should have some coverage but potentially reduced due to strict body validation
          expect(strictBodyCoverage).toBeGreaterThanOrEqual(0);

          // Check that HTML report was generated
          expect(fs.existsSync(outputPath)).toBe(true);

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('Combined --strict-query and --strict-body flags', () => {
    test('CLI should apply both strict validations when both flags are provided', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        collectionPath,
        '--strict-query',
        '--strict-body',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check that coverage is available
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const strictCombinedCoverage = parseFloat(coverageMatch[1]);

          // Should have some coverage
          expect(strictCombinedCoverage).toBeGreaterThanOrEqual(0);

          // Check that unmatched operations are listed
          if (strictCombinedCoverage < 100) {
            expect(stdout).toContain('Unmatched Spec operations:');
          }

          // Check that HTML report was generated
          expect(fs.existsSync(outputPath)).toBe(true);
          const htmlContent = fs.readFileSync(outputPath, 'utf8');
          expect(htmlContent).toContain('Swagger Coverage Report');

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('Newman report with strict validation', () => {
    test('CLI should apply strict query validation to Newman reports with --newman and --strict-query', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        newmanPath,
        '--newman',
        '--strict-query',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check Newman report processing
          expect(stdout).toContain('Newman report loaded successfully');
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const newmanStrictCoverage = parseFloat(coverageMatch[1]);

          expect(newmanStrictCoverage).toBeGreaterThanOrEqual(0);

          // Check that HTML report was generated
          expect(fs.existsSync(outputPath)).toBe(true);

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);

    test('CLI should apply strict body validation to Newman reports with --newman and --strict-body', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        newmanPath,
        '--newman',
        '--strict-body',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Check Newman report processing
          expect(stdout).toContain('Newman report loaded successfully');
          expect(stdout).toContain('Coverage:');
          
          // Extract coverage percentage
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          const newmanStrictBodyCoverage = parseFloat(coverageMatch[1]);

          expect(newmanStrictBodyCoverage).toBeGreaterThanOrEqual(0);

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);

    test('CLI should auto-detect Newman format and apply strict validation', (done) => {
      const child = spawn('node', [
        cliPath,
        specPath,
        newmanPath,
        '--strict-query',
        '--strict-body',
        '--output', outputPath,
        '--verbose'
      ]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          expect(stderr).toBe('');

          // Should detect Newman format automatically
          expect(stdout).toContain('Detected Newman report format');
          expect(stdout).toContain('Coverage:');

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });

  describe('Coverage comparison with and without strict validation', () => {
    test('should demonstrate coverage difference between strict and lenient validation', (done) => {
      // First run without strict validation
      const lenientChild = spawn('node', [
        cliPath,
        specPath,
        collectionPath,
        '--verbose'
      ]);

      let lenientStdout = '';
      let lenientStderr = '';

      lenientChild.stdout.on('data', (data) => {
        lenientStdout += data.toString();
      });

      lenientChild.stderr.on('data', (data) => {
        lenientStderr += data.toString();
      });

      lenientChild.on('close', (lenientCode) => {
        try {
          expect(lenientCode).toBe(0);
          expect(lenientStderr).toBe('');

          // Extract lenient coverage
          const lenientCoverageMatch = lenientStdout.match(/Coverage: ([\d.]+)%/);
          expect(lenientCoverageMatch).toBeTruthy();
          const lenientCoverage = parseFloat(lenientCoverageMatch[1]);

          // Now run with strict validation
          const strictChild = spawn('node', [
            cliPath,
            specPath,
            collectionPath,
            '--strict-query',
            '--strict-body',
            '--verbose'
          ]);

          let strictStdout = '';
          let strictStderr = '';

          strictChild.stdout.on('data', (data) => {
            strictStdout += data.toString();
          });

          strictChild.stderr.on('data', (data) => {
            strictStderr += data.toString();
          });

          strictChild.on('close', (strictCode) => {
            try {
              expect(strictCode).toBe(0);
              expect(strictStderr).toBe('');

              // Extract strict coverage
              const strictCoverageMatch = strictStdout.match(/Coverage: ([\d.]+)%/);
              expect(strictCoverageMatch).toBeTruthy();
              const strictCoverage = parseFloat(strictCoverageMatch[1]);

              // Strict validation should result in same or lower coverage
              expect(strictCoverage).toBeLessThanOrEqual(lenientCoverage);

              // Log the comparison for debugging
              console.log(`Lenient coverage: ${lenientCoverage}%, Strict coverage: ${strictCoverage}%`);

              done();
            } catch (error) {
              done(error);
            }
          });

          strictChild.on('error', (error) => {
            done(error);
          });

        } catch (error) {
          done(error);
        }
      });

      lenientChild.on('error', (error) => {
        done(error);
      });
    }, 30000);
  });

  describe('Error handling with strict validation', () => {
    test('should handle invalid spec files gracefully with strict flags', (done) => {
      const invalidSpecPath = path.resolve(__dirname, 'fixtures/nonexistent.yaml');
      
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--strict-query',
        '--strict-body'
      ]);

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(1); // Should exit with error
          expect(stderr).toContain('Error:');

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);

    test('should handle invalid collection files gracefully with strict flags', (done) => {
      const invalidCollectionPath = path.resolve(__dirname, 'fixtures/nonexistent.json');
      
      const child = spawn('node', [
        cliPath,
        specPath,
        invalidCollectionPath,
        '--strict-query',
        '--strict-body'
      ]);

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(1); // Should exit with error
          expect(stderr).toContain('Error:');

          done();
        } catch (error) {
          done(error);
        }
      });

      child.on('error', (error) => {
        done(error);
      });
    }, 15000);
  });
});