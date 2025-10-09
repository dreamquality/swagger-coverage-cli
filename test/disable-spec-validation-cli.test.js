const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('CLI --disable-spec-validation Integration Tests', () => {
  const cliPath = path.resolve(__dirname, '../cli.js');
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  const invalidSpecPath = path.resolve(fixturesDir, 'cli-invalid-spec.yaml');
  const invalidJsonSpecPath = path.resolve(fixturesDir, 'cli-invalid-spec.json');
  const collectionPath = path.resolve(fixturesDir, 'simple-collection.json');
  const newmanReportPath = path.resolve(fixturesDir, 'simple-newman-report.json');
  const outputPath = path.resolve(__dirname, 'fixtures/test-disable-validation-output.html');
  const multiApiSpec1Path = path.resolve(fixturesDir, 'cli-invalid-spec-1.yaml');
  const multiApiSpec2Path = path.resolve(fixturesDir, 'cli-invalid-spec-2.yaml');

  beforeAll(() => {
    // Create an invalid YAML spec with broken references
    const invalidSpec = `openapi: 3.0.0
info:
  title: Invalid Refs API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NonExistentSchema'
    post:
      summary: Create user
      responses:
        '201':
          description: Created
  /products:
    get:
      summary: Get products
      responses:
        '200':
          description: Success
`;
    fs.writeFileSync(invalidSpecPath, invalidSpec);

    // Create an invalid JSON spec with broken references
    const invalidJsonSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Invalid JSON API',
        version: '1.0.0'
      },
      paths: {
        '/orders': {
          get: {
            summary: 'Get orders',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MissingOrder'
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    fs.writeFileSync(invalidJsonSpecPath, JSON.stringify(invalidJsonSpec, null, 2));

    // Create a simple Postman collection
    const collection = {
      info: { name: 'Test Collection' },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/users' }
          }
        },
        {
          name: 'Get Products',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/products' }
          }
        },
        {
          name: 'Get Orders',
          request: {
            method: 'GET',
            url: { raw: 'https://api.example.com/orders' }
          }
        }
      ]
    };
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

    // Create a Newman report
    const newmanReport = {
      collection: { info: { name: 'Test Newman Collection' } },
      run: {
        executions: [
          {
            item: { name: 'Get Users' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/users' }
            },
            response: {
              code: 200,
              status: 'OK',
              responseTime: 100
            }
          },
          {
            item: { name: 'Get Products' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/products' }
            },
            response: {
              code: 200,
              status: 'OK',
              responseTime: 120
            }
          }
        ]
      }
    };
    fs.writeFileSync(newmanReportPath, JSON.stringify(newmanReport, null, 2));

    // Create multi-API specs for testing
    const multiSpec1 = `openapi: 3.0.0
info:
  title: Users API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MissingUsers'
`;
    fs.writeFileSync(multiApiSpec1Path, multiSpec1);

    const multiSpec2 = `openapi: 3.0.0
info:
  title: Products API
  version: 1.0.0
paths:
  /products:
    get:
      summary: Get products
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MissingProducts'
`;
    fs.writeFileSync(multiApiSpec2Path, multiSpec2);
  });

  afterAll(() => {
    // Clean up test files
    const testFiles = [
      invalidSpecPath, 
      invalidJsonSpecPath, 
      collectionPath, 
      newmanReportPath,
      multiApiSpec1Path,
      multiApiSpec2Path,
      outputPath
    ];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Basic validation behavior', () => {
    test('CLI should fail with invalid spec when validation is enabled (default)', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--output', outputPath
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

    test('CLI should succeed with invalid spec when --disable-spec-validation is used', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
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
          expect(code).toBe(0); // Should succeed
          expect(stderr).toBe('');
          
          // Should have coverage information
          expect(stdout).toContain('Coverage:');
          expect(stdout).toContain('operations in spec');
          
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

    test('CLI should show coverage for matched operations even with invalid spec', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--output', outputPath
      ]);

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          
          // Extract coverage information
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();
          
          const coverage = parseFloat(coverageMatch[1]);
          expect(coverage).toBeGreaterThanOrEqual(0);
          expect(coverage).toBeLessThanOrEqual(100);
          
          // Should show matched operations
          expect(stdout).toContain('Matched operations');

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

  describe('JSON spec format', () => {
    test('CLI should handle invalid JSON specs with --disable-spec-validation', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidJsonSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--output', outputPath
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

  describe('Newman report support', () => {
    test('CLI should work with Newman reports and --disable-spec-validation', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        newmanReportPath,
        '--newman',
        '--disable-spec-validation',
        '--output', outputPath
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
          expect(stdout).toContain('Coverage:');
          
          // Verify Newman-specific output
          const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
          expect(coverageMatch).toBeTruthy();

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

  describe('Multi-API support', () => {
    test('CLI should handle multiple invalid API specs with --disable-spec-validation', (done) => {
      const child = spawn('node', [
        cliPath,
        `${multiApiSpec1Path},${multiApiSpec2Path}`,
        collectionPath,
        '--disable-spec-validation',
        '--output', outputPath
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
          expect(stdout).toContain('Coverage:');
          expect(stdout).toContain('APIs analyzed:');
          
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

  describe('Interaction with other flags', () => {
    test('CLI should work with --disable-spec-validation and --strict-query', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--strict-query',
        '--output', outputPath
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

    test('CLI should work with --disable-spec-validation and --strict-body', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--strict-body',
        '--output', outputPath
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

    test('CLI should work with all flags combined', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--strict-query',
        '--strict-body',
        '--verbose',
        '--output', outputPath
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
          expect(stdout).toContain('Coverage:');
          expect(stdout).toContain('OpenAPI specification loaded successfully');
          
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

  describe('Output verification', () => {
    test('HTML report should contain correct spec name for invalid spec', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--output', outputPath
      ]);

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          
          const htmlContent = fs.readFileSync(outputPath, 'utf8');
          expect(htmlContent).toContain('Invalid Refs API');
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

    test('Console output should show correct metrics with invalid spec', (done) => {
      const child = spawn('node', [
        cliPath,
        invalidSpecPath,
        collectionPath,
        '--disable-spec-validation',
        '--output', outputPath
      ]);

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        try {
          expect(code).toBe(0);
          
          // Should show summary
          expect(stdout).toContain('=== Swagger Coverage Report ===');
          expect(stdout).toContain('Total operations in spec');
          expect(stdout).toContain('Matched operations');
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
});
