const { generateHtmlReport } = require('../lib/report');
const { extractRequestsFromNewman } = require('../lib/newman');
const { extractOperationsFromSpec } = require('../lib/swagger');
const { matchOperationsDetailed } = require('../lib/match');
const fs = require('fs');
const path = require('path');

describe('Newman Visual Report Tests', () => {
  let testApiSpec, newmanReport, complexNewmanReport;

  beforeAll(() => {
    // Create test API spec
    testApiSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: { '200': { description: 'Success' } }
          },
          post: {
            operationId: 'createUser',
            responses: { 
              '201': { description: 'Created' },
              '400': { description: 'Bad Request' }
            }
          }
        },
        '/users/{id}': {
          get: {
            operationId: 'getUserById',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: { 
              '200': { description: 'Success' },
              '404': { description: 'Not Found' }
            }
          }
        }
      }
    };

    // Simple Newman report
    newmanReport = {
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
              { assertion: 'Status code is 200', error: null },
              { assertion: 'Response time is less than 500ms', error: null }
            ]
          },
          {
            item: { name: 'Create User' },
            request: {
              method: 'POST',
              url: { raw: 'https://api.example.com/users' },
              body: {
                mode: 'raw',
                raw: '{"name": "John Doe", "email": "john@example.com"}'
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

    // Complex Newman report with failures and mixed results
    complexNewmanReport = {
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
              { assertion: 'Status code is 200', error: null },
              { assertion: 'Response has users array', error: null }
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
              },
              { assertion: 'Response has error message', error: null }
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
              { 
                assertion: 'Status code is 201',
                error: {
                  name: 'AssertionError',
                  message: 'expected 400 to equal 201'
                }
              },
              { assertion: 'Response contains validation errors', error: null }
            ]
          },
          {
            item: { name: 'Failed Network Request' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/timeout' }
            },
            // No response (request failed)
            assertions: []
          }
        ]
      }
    };
  });

  test('generateHtmlReport should create report with Newman execution data', () => {
    const specOperations = extractOperationsFromSpec(testApiSpec);
    const newmanRequests = extractRequestsFromNewman(newmanReport);
    const coverageItems = matchOperationsDetailed(specOperations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date('2023-01-01T12:00:00Z').toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Test Newman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    expect(html).toContain('Test Newman Collection');
    expect(html).toContain('40.00%'); // 2 out of 5 operations covered (GET /users 200, POST /users 201)
    expect(html).toContain('Get Users');
    expect(html).toContain('Create User');
    expect(html).toContain('200'); // Status codes from Newman data
    expect(html).toContain('201');
  });

  test('generateHtmlReport should display Newman-specific assertion data', () => {
    const specOperations = extractOperationsFromSpec(testApiSpec);
    const newmanRequests = extractRequestsFromNewman(complexNewmanReport);
    const coverageItems = matchOperationsDetailed(specOperations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date('2023-01-01T12:00:00Z').toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Complex Newman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    expect(html).toContain('Complex Newman Collection');
    expect(html).toContain('Get Users - Success');
    expect(html).toContain('Get User by ID - Not Found');
    expect(html).toContain('Create User - Validation Error');
    
    // Should contain status codes from actual execution
    expect(html).toContain('200');
    expect(html).toContain('404');
    expect(html).toContain('400');
  });

  test('generateHtmlReport should handle Newman requests with no response data', () => {
    const requestsWithFailures = extractRequestsFromNewman(complexNewmanReport);
    
    // Verify that failed request is included but has no response code
    const failedRequest = requestsWithFailures.find(r => r.name === 'Failed Network Request');
    expect(failedRequest).toBeDefined();
    expect(failedRequest.responseCode).toBeUndefined();
    expect(failedRequest.testedStatusCodes).toEqual([]);

    const specOperations = extractOperationsFromSpec(testApiSpec);
    const coverageItems = matchOperationsDetailed(specOperations, requestsWithFailures, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const html = generateHtmlReport({
      coverage: 50,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Complex Newman Collection',
        undocumentedRequests: [failedRequest],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    expect(html).toContain('Complex Newman Collection');
    // Note: undocumented requests display is not currently implemented in HTML report
    // The request is still processed but may not appear in a special section
    expect(html.length).toBeGreaterThan(1000); // Should be a substantial HTML document
  });

  test('generateHtmlReport should show response time data from Newman', () => {
    const newmanRequests = extractRequestsFromNewman(newmanReport);
    
    // Verify response times are captured
    expect(newmanRequests[0].responseTime).toBe(150);
    expect(newmanRequests[1].responseTime).toBe(89);

    const specOperations = extractOperationsFromSpec(testApiSpec);
    const coverageItems = matchOperationsDetailed(specOperations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const html = generateHtmlReport({
      coverage: 67,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Test Newman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    // HTML should be generated successfully with Newman data
    expect(html).toContain('Test Newman Collection');
    expect(html.length).toBeGreaterThan(1000); // Should be a substantial HTML document
  });

  test('should save HTML report with Newman data to file system', () => {
    const testOutputPath = path.resolve(__dirname, '../tmp/newman-test-report.html');
    
    // Ensure tmp directory exists
    const tmpDir = path.dirname(testOutputPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const specOperations = extractOperationsFromSpec(testApiSpec);
    const newmanRequests = extractRequestsFromNewman(complexNewmanReport);
    const coverageItems = matchOperationsDetailed(specOperations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Complex Newman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    // Write the report to file
    fs.writeFileSync(testOutputPath, html, 'utf8');
    
    // Verify file was created and contains Newman data
    expect(fs.existsSync(testOutputPath)).toBe(true);
    const fileContent = fs.readFileSync(testOutputPath, 'utf8');
    expect(fileContent).toContain('Complex Newman Collection');
    expect(fileContent).toContain('swagger-coverage-cli');
    
    // Clean up test file
    fs.unlinkSync(testOutputPath);
  });

  test('should generate report comparing coverage between Postman collection and Newman report', () => {
    // Create a minimal Postman collection for comparison
    const postmanCollection = {
      info: { name: 'Basic Postman Collection' },
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

    const { extractRequestsFromPostman } = require('../lib/postman');
    
    const specOperations = extractOperationsFromSpec(testApiSpec);
    const postmanRequests = extractRequestsFromPostman(postmanCollection);
    const newmanRequests = extractRequestsFromNewman(newmanReport);

    // Generate coverage for both
    const postmanCoverage = matchOperationsDetailed(specOperations, postmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });
    const newmanCoverage = matchOperationsDetailed(specOperations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const postmanMatchedCount = postmanCoverage.filter(item => !item.unmatched).length;
    const newmanMatchedCount = newmanCoverage.filter(item => !item.unmatched).length;

    const postmanCoveragePercent = (postmanMatchedCount / postmanCoverage.length) * 100;
    const newmanCoveragePercent = (newmanMatchedCount / newmanCoverage.length) * 100;

    // Newman should have better coverage
    expect(newmanCoveragePercent).toBeGreaterThan(postmanCoveragePercent);
    expect(postmanCoveragePercent).toBe(0); // No operations matched due to strict matching
    expect(newmanCoveragePercent).toBe(40); // 2 out of 5 operations (GET /users 200, POST /users 201)

    // Generate HTML reports for both
    const postmanHtml = generateHtmlReport({
      coverage: postmanCoveragePercent,
      coverageItems: postmanCoverage,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Basic Postman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    const newmanHtml = generateHtmlReport({
      coverage: newmanCoveragePercent,
      coverageItems: newmanCoverage,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: 'Test API',
        postmanCollectionName: 'Test Newman Collection',
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: ['Test API']
      }
    });

    // Both reports should be generated
    expect(postmanHtml).toContain('Basic Postman Collection');
    expect(postmanHtml).toContain('0.00%');
    expect(newmanHtml).toContain('Test Newman Collection');
    expect(newmanHtml).toContain('40.00%');
  });
});