const { loadNewmanReport, extractRequestsFromNewman } = require('../lib/newman');
const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const { matchOperationsDetailed } = require('../lib/match');
const { generateHtmlReport } = require('../lib/report');
const fs = require('fs');
const path = require('path');

describe('Newman Sample Demo Tests', () => {
  let sampleApiSpec, sampleNewmanReport, sampleApiPath, sampleNewmanPath;

  beforeAll(async () => {
    sampleApiPath = path.resolve(__dirname, 'fixtures', 'sample-api.yaml');
    sampleNewmanPath = path.resolve(__dirname, 'fixtures', 'sample-newman-report.json');
    
    // Load the sample data
    sampleApiSpec = await loadAndParseSpec(sampleApiPath);
    sampleNewmanReport = loadNewmanReport(sampleNewmanPath);
  });

  test('should load sample API spec and Newman report successfully', () => {
    expect(sampleApiSpec).toBeDefined();
    expect(sampleApiSpec.info.title).toBe('Sample API for Newman Demo');
    
    expect(sampleNewmanReport).toBeDefined();
    expect(sampleNewmanReport.collection.info.name).toBe('Comprehensive API Test Collection');
    expect(sampleNewmanReport.run.executions.length).toBe(8);
  });

  test('should extract operations from sample API spec', () => {
    const operations = extractOperationsFromSpec(sampleApiSpec, true);
    
    expect(operations.length).toBeGreaterThan(10); // Should have multiple operations with different status codes
    
    // Check some specific operations
    const getUsersOp = operations.find(op => op.method === 'get' && op.path === '/users' && op.statusCode === '200');
    expect(getUsersOp).toBeDefined();
    expect(getUsersOp.operationId).toBe('getUsers');
    expect(getUsersOp.tags).toContain('Users');

    const createUserOp = operations.find(op => op.method === 'post' && op.path === '/users' && op.statusCode === '201');
    expect(createUserOp).toBeDefined();
    expect(createUserOp.operationId).toBe('createUser');

    const adminOp = operations.find(op => op.method === 'get' && op.path === '/admin/users');
    expect(adminOp).toBeDefined();
    expect(adminOp.tags).toContain('Admin');
    expect(adminOp.tags).toContain('Users');
  });

  test('should extract requests from sample Newman report', () => {
    const requests = extractRequestsFromNewman(sampleNewmanReport, true);
    
    expect(requests.length).toBe(8);
    
    // Check specific requests
    const getUsersReq = requests.find(r => r.name === 'Get Users - Successful');
    expect(getUsersReq).toBeDefined();
    expect(getUsersReq.method).toBe('get');
    expect(getUsersReq.responseCode).toBe(200);
    expect(getUsersReq.responseTime).toBe(125);
    expect(getUsersReq.executed).toBe(true);
    expect(getUsersReq.assertions.length).toBe(3);
    expect(getUsersReq.assertions.every(a => a.passed)).toBe(true);

    const createUserReq = requests.find(r => r.name === 'Create User - Success');
    expect(createUserReq).toBeDefined();
    expect(createUserReq.method).toBe('post');
    expect(createUserReq.responseCode).toBe(201);
    expect(createUserReq.bodyInfo).toBeDefined();
    expect(createUserReq.bodyInfo.mode).toBe('raw');

    const authFailReq = requests.find(r => r.name === 'Authentication Test - Unauthorized');
    expect(authFailReq).toBeDefined();
    expect(authFailReq.responseCode).toBe(401);
    expect(authFailReq.assertions.some(a => !a.passed)).toBe(true); // Has a failed assertion
  });

  test('should match operations and calculate coverage correctly', () => {
    const operations = extractOperationsFromSpec(sampleApiSpec);
    const requests = extractRequestsFromNewman(sampleNewmanReport);
    
    const coverageItems = matchOperationsDetailed(operations, requests, {
      verbose: true,
      strictQuery: false,
      strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coveragePercent = (matchedCount / coverageItems.length) * 100;

    console.log(`Total operations: ${coverageItems.length}, Matched: ${matchedCount}, Coverage: ${coveragePercent.toFixed(2)}%`);

    expect(coveragePercent).toBeGreaterThan(40); // Should have decent coverage (44.44%)
    expect(matchedCount).toBeGreaterThan(5); // Should match several operations

    // Check that we have both matched and unmatched operations
    const unmatchedItems = coverageItems.filter(item => item.unmatched);
    expect(unmatchedItems.length).toBeGreaterThan(0); // Should have some unmatched operations
  });

  test('should generate comprehensive HTML report with Newman data', () => {
    const operations = extractOperationsFromSpec(sampleApiSpec);
    const requests = extractRequestsFromNewman(sampleNewmanReport);
    const coverageItems = matchOperationsDetailed(operations, requests, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: sampleApiSpec.info.title,
        postmanCollectionName: sampleNewmanReport.collection.info.name,
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: [sampleApiSpec.info.title]
      }
    });

    // Check that HTML contains expected content
    expect(html).toContain('Sample API for Newman Demo');
    expect(html).toContain('Comprehensive API Test Collection');
    expect(html).toContain('Get Users - Successful');
    expect(html).toContain('Create User - Success');
    expect(html).toContain('Authentication Test - Unauthorized');
    
    // Check that status codes are present
    expect(html).toContain('200');
    expect(html).toContain('201');
    expect(html).toContain('400');
    expect(html).toContain('401');
    expect(html).toContain('404');

    // Should be a substantial HTML document
    expect(html.length).toBeGreaterThan(5000);
  });

  test('should save visual demo report to file system', () => {
    const outputPath = path.resolve(__dirname, '../tmp/newman-demo-report.html');
    
    // Ensure tmp directory exists
    const tmpDir = path.dirname(outputPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const operations = extractOperationsFromSpec(sampleApiSpec);
    const requests = extractRequestsFromNewman(sampleNewmanReport);
    const coverageItems = matchOperationsDetailed(operations, requests, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: sampleApiSpec.info.title,
        postmanCollectionName: sampleNewmanReport.collection.info.name,
        undocumentedRequests: [],
        apiCount: 1,
        apiNames: [sampleApiSpec.info.title]
      }
    });

    // Write the report to file
    fs.writeFileSync(outputPath, html, 'utf8');
    
    // Verify file was created
    expect(fs.existsSync(outputPath)).toBe(true);
    const fileContent = fs.readFileSync(outputPath, 'utf8');
    expect(fileContent).toContain('Newman');
    expect(fileContent).toContain('swagger-coverage-cli');
    
    console.log(`✅ Demo Newman report generated: ${outputPath}`);
    console.log(`📊 Coverage: ${coverage.toFixed(2)}% (${matchedCount}/${coverageItems.length} operations)`);
    console.log(`🧪 Executed requests: ${requests.length}`);
    console.log(`⚡ Average response time: ${sampleNewmanReport.run.timings.responseAverage}ms`);
    
    // Don't clean up - leave the demo file for manual inspection
  });

  test('should demonstrate Newman vs Postman collection differences', () => {
    // Create a simple Postman collection equivalent for comparison
    const equivalentPostmanCollection = {
      info: { name: 'Equivalent Postman Collection' },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users'
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});'
                ]
              }
            }
          ]
        },
        {
          name: 'Create User',
          request: {
            method: 'POST',
            url: 'https://api.example.com/users',
            body: {
              mode: 'raw',
              raw: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
            }
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 201", function () {',
                  '    pm.response.to.have.status(201);',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    const { extractRequestsFromPostman } = require('../lib/postman');
    
    const operations = extractOperationsFromSpec(sampleApiSpec);
    const newmanRequests = extractRequestsFromNewman(sampleNewmanReport);
    const postmanRequests = extractRequestsFromPostman(equivalentPostmanCollection);

    const newmanCoverage = matchOperationsDetailed(operations, newmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });
    const postmanCoverage = matchOperationsDetailed(operations, postmanRequests, {
      verbose: false, strictQuery: false, strictBody: false
    });

    const newmanMatchedCount = newmanCoverage.filter(item => !item.unmatched).length;
    const postmanMatchedCount = postmanCoverage.filter(item => !item.unmatched).length;

    const newmanCoveragePercent = (newmanMatchedCount / newmanCoverage.length) * 100;
    const postmanCoveragePercent = (postmanMatchedCount / postmanCoverage.length) * 100;

    console.log(`📈 Newman Coverage: ${newmanCoveragePercent.toFixed(2)}% (${newmanMatchedCount}/${newmanCoverage.length})`);
    console.log(`📉 Postman Coverage: ${postmanCoveragePercent.toFixed(2)}% (${postmanMatchedCount}/${postmanCoverage.length})`);

    // Newman should provide better coverage due to actual execution data
    expect(newmanMatchedCount).toBeGreaterThan(postmanMatchedCount);
    expect(newmanRequests.length).toBeGreaterThan(postmanRequests.length);

    // Newman requests should have execution metadata
    expect(newmanRequests[0].executed).toBe(true);
    expect(newmanRequests[0].responseCode).toBeDefined();
    expect(newmanRequests[0].responseTime).toBeDefined();
    expect(newmanRequests[0].assertions).toBeDefined();

    // Postman requests should not have execution metadata
    expect(postmanRequests[0].executed).toBeUndefined();
    expect(postmanRequests[0].responseCode).toBeUndefined();
    expect(postmanRequests[0].responseTime).toBeUndefined();
    expect(postmanRequests[0].assertions).toBeUndefined();
  });
});