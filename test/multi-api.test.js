const { matchOperationsDetailed } = require('../lib/match');

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
});