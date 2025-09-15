const { matchOperationsDetailed } = require('../lib/match');
const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { loadExcelSpec } = require('../lib/excel');
const { generateHtmlReport } = require('../lib/report');
const fs = require('fs');
const path = require('path');

// Ensure fixtures directory exists
const fixturesDir = path.resolve(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

describe('Multi-API Match Module', () => {
  test('should handle operations from multiple APIs with same path and method', () => {
    const specOps = [
      {
        method: 'get',
        path: '/users',
        operationId: 'getUsersAPI1',
        statusCode: '200',
        tags: ['Users'],
        expectedStatusCodes: ['200'],
        parameters: [],
        apiName: 'API 1',
        sourceFile: 'api1.yaml'
      },
      {
        method: 'get',
        path: '/users',
        operationId: 'getUsersAPI2',
        statusCode: '200',
        tags: ['Users'],
        expectedStatusCodes: ['200'],
        parameters: [],
        apiName: 'API 2',
        sourceFile: 'api2.yaml'
      }
    ];

    const postmanReqs = [
      {
        name: 'Get Users',
        method: 'get',
        rawUrl: 'https://api.example.com/users',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null,
        testScripts: 'pm.test("Status code is 200", function () { pm.response.to.have.status(200); });'
      }
    ];

    const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    expect(coverageItems.length).toBe(2);
    expect(coverageItems[0].apiName).toBe('API 1');
    expect(coverageItems[1].apiName).toBe('API 2');
    // Both should be matched since they have the same path/method
    expect(coverageItems[0].unmatched).toBe(false);
    expect(coverageItems[1].unmatched).toBe(false);
  });

  test('should preserve API name in coverage items', () => {
    const specOps = [
      {
        method: 'post',
        path: '/products',
        operationId: 'createProduct',
        statusCode: '201',
        tags: ['Products'],
        expectedStatusCodes: ['201'],
        parameters: [],
        apiName: 'Product API',
        sourceFile: 'products.yaml'
      }
    ];

    const postmanReqs = []; // No matching requests

    const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    expect(coverageItems.length).toBe(1);
    expect(coverageItems[0].apiName).toBe('Product API');
    expect(coverageItems[0].sourceFile).toBe('products.yaml');
    expect(coverageItems[0].unmatched).toBe(true);
  });

  test('should load and process multiple YAML APIs', async () => {
    const usersApiPath = path.resolve(fixturesDir, 'users-api.yaml');
    const productsApiPath = path.resolve(fixturesDir, 'products-api.yaml');

    // Load and parse specs
    const usersSpec = await loadAndParseSpec(usersApiPath);
    const productsSpec = await loadAndParseSpec(productsApiPath);

    expect(usersSpec.info.title).toBe('Users API');
    expect(productsSpec.info.title).toBe('Products API');

    // Extract operations
    const usersOps = extractOperationsFromSpec(usersSpec).map(op => ({
      ...op,
      apiName: usersSpec.info.title,
      sourceFile: 'users-api.yaml'
    }));

    const productsOps = extractOperationsFromSpec(productsSpec).map(op => ({
      ...op,
      apiName: productsSpec.info.title,
      sourceFile: 'products-api.yaml'
    }));

    const allOps = [...usersOps, ...productsOps];

    expect(usersOps.length).toBeGreaterThan(0);
    expect(productsOps.length).toBeGreaterThan(0);
    expect(allOps.length).toBeGreaterThan(10); // Should have many operations

    // Verify API names are preserved
    usersOps.forEach(op => {
      expect(op.apiName).toBe('Users API');
      expect(op.sourceFile).toBe('users-api.yaml');
    });

    productsOps.forEach(op => {
      expect(op.apiName).toBe('Products API');
      expect(op.sourceFile).toBe('products-api.yaml');
    });
  });

  test('should handle JSON API specification', async () => {
    const ordersApiPath = path.resolve(fixturesDir, 'orders-api.json');

    const ordersSpec = await loadAndParseSpec(ordersApiPath);
    expect(ordersSpec.info.title).toBe('Orders API');

    const ordersOps = extractOperationsFromSpec(ordersSpec).map(op => ({
      ...op,
      apiName: ordersSpec.info.title,
      sourceFile: 'orders-api.json'
    }));

    expect(ordersOps.length).toBeGreaterThan(5);

    // Verify specific operations exist
    const getOrdersOp = ordersOps.find(op => op.method === 'get' && op.path === '/orders');
    const createOrderOp = ordersOps.find(op => op.method === 'post' && op.path === '/orders');
    
    expect(getOrdersOp).toBeDefined();
    expect(createOrderOp).toBeDefined();
    expect(getOrdersOp.apiName).toBe('Orders API');
    expect(createOrderOp.apiName).toBe('Orders API');
  });

  test('should handle CSV API specification', () => {
    const csvApiPath = path.resolve(fixturesDir, 'analytics-api.csv');

    const csvOps = loadExcelSpec(csvApiPath);

    expect(csvOps.length).toBeGreaterThan(5);

    // Verify CSV operations structure
    csvOps.forEach(op => {
      expect(op).toHaveProperty('method');
      expect(op).toHaveProperty('path');
      expect(op).toHaveProperty('statusCode');
      expect(['get', 'post', 'put', 'delete']).toContain(op.method);
    });

    // Check for specific CSV operations
    const getReportsOp = csvOps.find(op => op.method.toLowerCase() === 'get' && op.path === '/analytics/reports');
    expect(getReportsOp).toBeDefined();
  });

  test('should generate comprehensive coverage report for multiple APIs', async () => {
    const collectionPath = path.resolve(fixturesDir, 'test-collection.json');
    
    const collection = loadPostmanCollection(collectionPath);
    expect(collection.info.name).toBe('Comprehensive Test Collection');

    const postmanRequests = extractRequestsFromPostman(collection);
    expect(postmanRequests.length).toBeGreaterThan(10);

    // Load multiple APIs
    const usersApiPath = path.resolve(fixturesDir, 'users-api.yaml');
    const productsApiPath = path.resolve(fixturesDir, 'products-api.yaml');
    const ordersApiPath = path.resolve(fixturesDir, 'orders-api.json');

    const usersSpec = await loadAndParseSpec(usersApiPath);
    const productsSpec = await loadAndParseSpec(productsApiPath);
    const ordersSpec = await loadAndParseSpec(ordersApiPath);

    const usersOps = extractOperationsFromSpec(usersSpec).map(op => ({
      ...op,
      apiName: usersSpec.info.title,
      sourceFile: 'users-api.yaml'
    }));

    const productsOps = extractOperationsFromSpec(productsSpec).map(op => ({
      ...op,
      apiName: productsSpec.info.title,
      sourceFile: 'products-api.yaml'
    }));

    const ordersOps = extractOperationsFromSpec(ordersSpec).map(op => ({
      ...op,
      apiName: ordersSpec.info.title,
      sourceFile: 'orders-api.json'
    }));

    const allSpecOps = [...usersOps, ...productsOps, ...ordersOps];

    // Match operations
    const coverageItems = matchOperationsDetailed(allSpecOps, postmanRequests, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    expect(coverageItems.length).toBeGreaterThan(20);

    // Calculate coverage
    const matchedCount = coverageItems.filter(item => !item.unmatched).length;
    const coverage = (matchedCount / coverageItems.length) * 100;

    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(100);

    // Generate HTML report
    const apiNames = ['Users API', 'Products API', 'Orders API'];
    const html = generateHtmlReport({
      coverage,
      coverageItems,
      meta: {
        timestamp: new Date().toLocaleString(),
        specName: `Multiple APIs (${apiNames.join(', ')})`,
        postmanCollectionName: collection.info.name,
        undocumentedRequests: [],
        apiCount: 3,
        apiNames: apiNames
      }
    });

    expect(html).toContain('<html');
    expect(html).toContain('Swagger Coverage Report');
    expect(html).toContain('Multiple APIs');
    expect(html).toContain('Users API');
    expect(html).toContain('Products API');
    expect(html).toContain('Orders API');

    // Verify report shows API column when multiple APIs are present
    expect(html).toContain('API</th>');
  });

  test('should match specific operations across different APIs', async () => {
    // Load test collection
    const collectionPath = path.resolve(fixturesDir, 'test-collection.json');
    const collection = loadPostmanCollection(collectionPath);
    const postmanRequests = extractRequestsFromPostman(collection);

    // Create operations from different APIs
    const specOps = [
      {
        method: 'get',
        path: '/users',
        operationId: 'getUsers',
        statusCode: '200',
        tags: ['Users'],
        expectedStatusCodes: ['200'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } }
        ],
        apiName: 'Users API',
        sourceFile: 'users-api.yaml'
      },
      {
        method: 'post',
        path: '/users',
        operationId: 'createUser',
        statusCode: '201',
        tags: ['Users'],
        expectedStatusCodes: ['201'],
        parameters: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'firstName', 'lastName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        apiName: 'Users API',
        sourceFile: 'users-api.yaml'
      },
      {
        method: 'get',
        path: '/products',
        operationId: 'getProducts',
        statusCode: '200',
        tags: ['Products'],
        expectedStatusCodes: ['200'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        apiName: 'Products API',
        sourceFile: 'products-api.yaml'
      },
      {
        method: 'post',
        path: '/orders',
        operationId: 'createOrder',
        statusCode: '201',
        tags: ['Orders'],
        expectedStatusCodes: ['201'],
        parameters: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'items', 'shippingAddress'],
                properties: {
                  userId: { type: 'string' },
                  items: { 
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['productId', 'quantity'],
                      properties: {
                        productId: { type: 'string' },
                        quantity: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        apiName: 'Orders API',
        sourceFile: 'orders-api.json'
      }
    ];

    const coverageItems = matchOperationsDetailed(specOps, postmanRequests, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    expect(coverageItems.length).toBe(4);

    // Check that some operations are matched
    const matchedItems = coverageItems.filter(item => !item.unmatched);
    expect(matchedItems.length).toBeGreaterThan(0);

    // Verify API names are preserved
    const usersApiItems = coverageItems.filter(item => item.apiName === 'Users API');
    const productsApiItems = coverageItems.filter(item => item.apiName === 'Products API');
    const ordersApiItems = coverageItems.filter(item => item.apiName === 'Orders API');

    expect(usersApiItems.length).toBe(2);
    expect(productsApiItems.length).toBe(1);
    expect(ordersApiItems.length).toBe(1);

    // Check specific matches
    const getUsersMatch = coverageItems.find(item => 
      item.method.toLowerCase() === 'get' && 
      item.path === '/users' && 
      item.apiName === 'Users API'
    );
    
    expect(getUsersMatch).toBeDefined();
    expect(getUsersMatch.unmatched).toBe(false); // Should be matched by postman collection
  });

  test('should handle mixed file formats (YAML, JSON, CSV)', () => {
    // Test mixed operations from different file formats
    const yamlOps = [
      {
        method: 'get',
        path: '/users',
        operationId: 'getUsers',
        statusCode: '200',
        tags: ['Users'],
        expectedStatusCodes: ['200'],
        parameters: [],
        apiName: 'Users API',
        sourceFile: 'users-api.yaml'
      }
    ];

    const jsonOps = [
      {
        method: 'get',
        path: '/orders',
        operationId: 'getOrders',
        statusCode: '200',
        tags: ['Orders'],
        expectedStatusCodes: ['200'],
        parameters: [],
        apiName: 'Orders API',
        sourceFile: 'orders-api.json'
      }
    ];

    const csvOps = [
      {
        method: 'get',
        path: '/analytics/reports',
        statusCode: '200',
        tags: ['Analytics'],
        summary: 'Get analytics reports',
        apiName: 'Analytics API',
        sourceFile: 'analytics-api.csv'
      }
    ];

    const allOps = [...yamlOps, ...jsonOps, ...csvOps];

    const postmanReqs = [
      {
        name: 'Get Users',
        method: 'get',
        rawUrl: 'https://api.example.com/users',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null,
        testScripts: 'pm.test("Status code is 200", function () { pm.response.to.have.status(200); });'
      },
      {
        name: 'Get Analytics Reports',
        method: 'get',
        rawUrl: 'https://api.example.com/analytics/reports',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null,
        testScripts: 'pm.test("Status code is 200", function () { pm.response.to.have.status(200); });'
      }
    ];

    const coverageItems = matchOperationsDetailed(allOps, postmanReqs, {
      verbose: false,
      strictQuery: false,
      strictBody: false
    });

    expect(coverageItems.length).toBe(3);

    // Check that operations from different file formats are handled correctly
    const yamlItem = coverageItems.find(item => item.sourceFile === 'users-api.yaml');
    const jsonItem = coverageItems.find(item => item.sourceFile === 'orders-api.json');
    const csvItem = coverageItems.find(item => item.sourceFile === 'analytics-api.csv');

    expect(yamlItem).toBeDefined();
    expect(jsonItem).toBeDefined();
    expect(csvItem).toBeDefined();

    expect(yamlItem.apiName).toBe('Users API');
    expect(jsonItem.apiName).toBe('Orders API');
    expect(csvItem.apiName).toBe('Analytics API');

    // Check matches
    expect(yamlItem.unmatched).toBe(false); // Should be matched
    expect(jsonItem.unmatched).toBe(true);   // No matching postman request
    expect(csvItem.unmatched).toBe(false);   // Should be matched
  });

  test('should generate non-blank HTML report with realistic data', async () => {
    // Load all test APIs and collection
    const usersApiPath = path.resolve(fixturesDir, 'users-api.yaml');
    const productsApiPath = path.resolve(fixturesDir, 'products-api.yaml');
    const collectionPath = path.resolve(fixturesDir, 'test-collection.json');

    const usersSpec = await loadAndParseSpec(usersApiPath);
    const productsSpec = await loadAndParseSpec(productsApiPath);
    const collection = loadPostmanCollection(collectionPath);

    const usersOps = extractOperationsFromSpec(usersSpec).map(op => ({
      ...op,
      apiName: usersSpec.info.title,
      sourceFile: 'users-api.yaml'
    }));

    const productsOps = extractOperationsFromSpec(productsSpec).map(op => ({
      ...op,
      apiName: productsSpec.info.title,
      sourceFile: 'products-api.yaml'
    }));

    const allOps = [...usersOps, ...productsOps];
    const postmanRequests = extractRequestsFromPostman(collection);

    const coverageItems = matchOperationsDetailed(allOps, postmanRequests, {
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
        specName: 'Multiple APIs (Users API, Products API)',
        postmanCollectionName: collection.info.name,
        undocumentedRequests: [],
        apiCount: 2,
        apiNames: ['Users API', 'Products API']
      }
    });

    // Verify the report contains substantial content
    expect(html.length).toBeGreaterThan(10000); // Should be a substantial HTML document
    expect(html).toContain('Swagger Coverage Report');
    expect(html).toContain('Users API');
    expect(html).toContain('Products API');
    expect(html).toContain(coverage.toFixed(2) + '%');
    
    // Should contain operations table with data
    expect(html).toContain('<tr>'); // Table rows
    expect(html).toContain('/users'); // Should have some paths
    expect(html).toContain('/products'); // Should have some paths
    expect(html).toContain('GET'); // Should have HTTP methods
    expect(html).toContain('POST'); // Should have HTTP methods

    // Verify multi-API specific elements
    expect(html).toContain('API</th>'); // API column header
    expect(html).toContain('Multiple APIs');
    
    // Write the report to verify it's not blank
    const reportPath = path.resolve(__dirname, '..', 'test-coverage-report.html');
    fs.writeFileSync(reportPath, html);
    
    const reportStats = fs.statSync(reportPath);
    expect(reportStats.size).toBeGreaterThan(10000); // At least 10KB
    
    // Clean up
    fs.unlinkSync(reportPath);
  });
});