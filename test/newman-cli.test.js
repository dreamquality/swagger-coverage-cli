const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('CLI Newman Integration Tests', () => {
  let testApiPath, newmanReportPath, complexNewmanReportPath;

  beforeAll(() => {
    // Ensure fixtures directory exists
    const fixturesDir = path.resolve(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir);
    }

    // Create test API spec file
    testApiPath = path.resolve(fixturesDir, 'test-api.yaml');
    const testApiSpec = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        '200':
          description: Success
    post:
      operationId: createUser
      responses:
        '201':
          description: Created
        '400':
          description: Bad Request
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Success
        '404':
          description: Not Found
`;
    fs.writeFileSync(testApiPath, testApiSpec);

    // Create Newman report file
    newmanReportPath = path.resolve(fixturesDir, 'test-newman-report.json');
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
              responseTime: 150
            },
            assertions: [
              { assertion: 'Status code is 200', error: null }
            ]
          },
          {
            item: { name: 'Create User' },
            request: {
              method: 'POST',
              url: { raw: 'https://api.example.com/users' },
              body: {
                mode: 'raw',
                raw: '{"name": "John Doe"}'
              }
            },
            response: { 
              code: 201, 
              status: 'Created',
              responseTime: 89
            },
            assertions: [
              { assertion: 'Status code is 201', error: null }
            ]
          }
        ]
      }
    };
    fs.writeFileSync(newmanReportPath, JSON.stringify(newmanReport, null, 2));

    // Create complex Newman report with failures
    complexNewmanReportPath = path.resolve(fixturesDir, 'complex-newman-report.json');
    const complexNewmanReport = {
      collection: { info: { name: 'Complex Newman Collection' } },
      run: {
        executions: [
          {
            item: { name: 'Get Users - Success' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/users' }
            },
            response: { 
              code: 200, 
              status: 'OK',
              responseTime: 95
            },
            assertions: [
              { assertion: 'Status code is 200', error: null }
            ]
          },
          {
            item: { name: 'Get User by ID - Not Found' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/users/999' }
            },
            response: { 
              code: 404, 
              status: 'Not Found',
              responseTime: 67
            },
            assertions: [
              { 
                assertion: 'Status code is 200',
                error: {
                  name: 'AssertionError',
                  message: 'expected 404 to equal 200'
                }
              }
            ]
          },
          {
            item: { name: 'Create User - Validation Error' },
            request: {
              method: 'POST',
              url: { raw: 'https://api.example.com/users' },
              body: {
                mode: 'raw',
                raw: '{"name": ""}'
              }
            },
            response: { 
              code: 400, 
              status: 'Bad Request',
              responseTime: 45
            },
            assertions: [
              { assertion: 'Response contains validation errors', error: null }
            ]
          }
        ]
      }
    };
    fs.writeFileSync(complexNewmanReportPath, JSON.stringify(complexNewmanReport, null, 2));
  });

  afterAll(() => {
    // Clean up test files
    const testFiles = [testApiPath, newmanReportPath, complexNewmanReportPath];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // Clean up any generated reports
    const possibleReports = [
      'coverage-report.html',
      'newman-cli-test.html',
      'complex-newman-cli-test.html'
    ];
    possibleReports.forEach(report => {
      if (fs.existsSync(report)) {
        fs.unlinkSync(report);
      }
    });
  });

  test('CLI should process Newman report with --newman flag', (done) => {
    const outputFile = 'newman-cli-test.html';
    const child = spawn('node', [
      'cli.js',
      testApiPath,
      newmanReportPath,
      '--newman',
      '--verbose',
      '--output',
      outputFile
    ], {
      cwd: path.resolve(__dirname, '..')
    });

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
        
        // Check console output
        expect(stdout).toContain('Newman report loaded successfully');
        expect(stdout).toContain('Test Newman Collection');
        expect(stdout).toContain('Coverage: 40.00%'); // 2 out of 5 operations
        expect(stdout).toContain('HTML report saved to: newman-cli-test.html');

        // Check that HTML file was created
        expect(fs.existsSync(outputFile)).toBe(true);
        
        const htmlContent = fs.readFileSync(outputFile, 'utf8');
        expect(htmlContent).toContain('Test Newman Collection');
        expect(htmlContent).toContain('40.00%');
        expect(htmlContent).toContain('Get Users');
        expect(htmlContent).toContain('Create User');

        done();
      } catch (error) {
        done(error);
      }
    });
  }, 10000);

  test('CLI should auto-detect Newman report format without --newman flag', (done) => {
    const outputFile = 'auto-detect-newman.html';
    const child = spawn('node', [
      'cli.js',
      testApiPath,
      newmanReportPath,
      '--verbose',
      '--output',
      outputFile
    ], {
      cwd: path.resolve(__dirname, '..')
    });

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
        expect(stdout).toContain('Coverage: 40.00%');

        // Check that HTML file was created
        expect(fs.existsSync(outputFile)).toBe(true);
        
        done();
      } catch (error) {
        done(error);
      }
    });
  }, 10000);

  test('CLI should handle complex Newman report with failures', (done) => {
    const outputFile = 'complex-newman-cli-test.html';
    const child = spawn('node', [
      'cli.js',
      testApiPath,
      complexNewmanReportPath,
      '--newman',
      '--verbose',
      '--output',
      outputFile
    ], {
      cwd: path.resolve(__dirname, '..')
    });

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
        
        // Check console output
        expect(stdout).toContain('Complex Newman Collection');
        expect(stdout).toContain('Coverage: 60.00%'); // 3 out of 5 operations covered
        expect(stdout).toContain('HTML report saved to: complex-newman-cli-test.html');

        // Check that HTML file was created and contains expected data
        expect(fs.existsSync(outputFile)).toBe(true);
        
        const htmlContent = fs.readFileSync(outputFile, 'utf8');
        expect(htmlContent).toContain('Complex Newman Collection');
        expect(htmlContent).toContain('60.00%');
        expect(htmlContent).toContain('Get Users - Success');
        expect(htmlContent).toContain('Get User by ID - Not Found');
        expect(htmlContent).toContain('Create User - Validation Error');

        done();
      } catch (error) {
        done(error);
      }
    });
  }, 10000);

  test('CLI should show proper error for invalid Newman report', (done) => {
    const invalidReportPath = path.resolve(__dirname, 'fixtures', 'invalid-newman.json');
    fs.writeFileSync(invalidReportPath, JSON.stringify({ invalid: 'format' }));

    const child = spawn('node', [
      'cli.js',
      testApiPath,
      invalidReportPath,
      '--newman'
    ], {
      cwd: path.resolve(__dirname, '..')
    });

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
        expect(code).toBe(1); // Should exit with error
        expect(stderr).toContain('Invalid Newman report format');

        // Clean up invalid file
        fs.unlinkSync(invalidReportPath);
        
        done();
      } catch (error) {
        done(error);
      }
    });
  }, 10000);

  test('CLI should generate report comparing Newman vs Postman collection coverage', (done) => {
    // Create a simple Postman collection with only one request
    const postmanCollectionPath = path.resolve(__dirname, 'fixtures', 'simple-postman.json');
    const postmanCollection = {
      info: { name: 'Simple Postman Collection', version: '1.0.0' },
      item: [
        {
          name: 'Get Users Only',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users'
          }
        }
      ]
    };
    fs.writeFileSync(postmanCollectionPath, JSON.stringify(postmanCollection, null, 2));

    // Test Postman collection first
    const postmanOutputFile = 'postman-comparison.html';
    const postmanChild = spawn('node', [
      'cli.js',
      testApiPath,
      postmanCollectionPath,
      '--verbose',
      '--output',
      postmanOutputFile
    ], {
      cwd: path.resolve(__dirname, '..')
    });

    let postmanStdout = '';

    postmanChild.stdout.on('data', (data) => {
      postmanStdout += data.toString();
    });

    postmanChild.on('close', (postmanCode) => {
      try {
        expect(postmanCode).toBe(0);
        expect(postmanStdout).toContain('Coverage: 0.00%'); // No operations matched due to strict matching

        // Now test Newman report
        const newmanOutputFile = 'newman-comparison.html';
        const newmanChild = spawn('node', [
          'cli.js',
          testApiPath,
          newmanReportPath,
          '--newman',
          '--verbose',
          '--output',
          newmanOutputFile
        ], {
          cwd: path.resolve(__dirname, '..')
        });

        let newmanStdout = '';

        newmanChild.stdout.on('data', (data) => {
          newmanStdout += data.toString();
        });

        newmanChild.on('close', (newmanCode) => {
          try {
            expect(newmanCode).toBe(0);
            expect(newmanStdout).toContain('Coverage: 40.00%'); // 2 out of 5 operations

            // Verify both reports were created
            expect(fs.existsSync(postmanOutputFile)).toBe(true);
            expect(fs.existsSync(newmanOutputFile)).toBe(true);

            // Newman should have better coverage than Postman collection
            const postmanContent = fs.readFileSync(postmanOutputFile, 'utf8');
            const newmanContent = fs.readFileSync(newmanOutputFile, 'utf8');

            expect(postmanContent).toContain('0.00%');
            expect(newmanContent).toContain('40.00%');

            // Clean up
            fs.unlinkSync(postmanCollectionPath);
            fs.unlinkSync(postmanOutputFile);
            fs.unlinkSync(newmanOutputFile);

            done();
          } catch (error) {
            done(error);
          }
        });
      } catch (error) {
        done(error);
      }
    });
  }, 15000);
});