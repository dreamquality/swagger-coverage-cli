const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('CLI --disable-spec-validation Integration Tests', () => {
  const cliPath = path.resolve(__dirname, '../cli.js');
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  const invalidSpecPath = path.resolve(fixturesDir, 'cli-invalid-spec.yaml');
  const collectionPath = path.resolve(fixturesDir, 'simple-collection.json');
  const outputPath = path.resolve(__dirname, 'fixtures/test-disable-validation-output.html');

  beforeAll(() => {
    // Create an invalid spec with broken references
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
        }
      ]
    };
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(invalidSpecPath)) {
      fs.unlinkSync(invalidSpecPath);
    }
    if (fs.existsSync(collectionPath)) {
      fs.unlinkSync(collectionPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

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
