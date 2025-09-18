const { matchOperationsDetailed, urlMatchesSwaggerPath, calculatePathSimilarity } = require('../lib/match');

describe('Smart Endpoint Mapping', () => {
  describe('Status Code Priority Matching', () => {
    test('should prioritize successful status codes (2xx) over error codes', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: '200',
          tags: ['Users'],
          expectedStatusCodes: ['200', '400', '500']
        },
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: '400',
          tags: ['Users'],
          expectedStatusCodes: ['200', '400', '500']
        },
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: '500',
          tags: ['Users'],
          expectedStatusCodes: ['200', '400', '500']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get Users',
          method: 'get',
          rawUrl: 'https://api.example.com/users',
          testedStatusCodes: ['200'], // Only tests successful case
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

      // Should match the successful operation and mark it as primary
      const matched = coverageItems.filter(item => !item.unmatched);
      const unmatched = coverageItems.filter(item => item.unmatched);

      expect(matched.length).toBe(1);
      expect(matched[0].statusCode).toBe('200'); // Should prioritize 200
      expect(matched[0].isPrimaryMatch).toBe(true);
      
      // Error codes should be marked as secondary coverage
      expect(unmatched.length).toBe(2);
      expect(unmatched.some(item => item.statusCode === '400')).toBe(true);
      expect(unmatched.some(item => item.statusCode === '500')).toBe(true);
    });

    test('should handle multiple successful status codes', () => {
      const specOps = [
        {
          method: 'post',
          path: '/users',
          operationId: 'createUser',
          statusCode: '201',
          expectedStatusCodes: ['201', '400']
        },
        {
          method: 'post',
          path: '/users',
          operationId: 'createUser', 
          statusCode: '400',
          expectedStatusCodes: ['201', '400']
        }
      ];

      const postmanReqs = [
        {
          name: 'Create User',
          method: 'post',
          rawUrl: 'https://api.example.com/users',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"test"}' },
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(1);
      expect(matched[0].statusCode).toBe('201');
    });
  });

  describe('Fuzzy Path Matching', () => {
    test('should handle different parameter naming conventions', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{userId}',
          operationId: 'getUserById',
          statusCode: '200',
          expectedStatusCodes: ['200']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User by ID',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123', // Different param name in path
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      expect(coverageItems[0].unmatched).toBe(false);
    });

    test('should provide similarity scoring for near matches', () => {
      // Test case for paths that are similar but not exact
      expect(urlMatchesSwaggerPath('https://api.example.com/users/123', '/users/{id}')).toBe(true);
      expect(urlMatchesSwaggerPath('https://api.example.com/users/123', '/users/{userId}')).toBe(true);
      expect(urlMatchesSwaggerPath('https://api.example.com/users/123/profile', '/users/{id}/profile')).toBe(true);
      
      // Test similarity calculations
      expect(calculatePathSimilarity('https://api.example.com/users/123', '/users/{id}')).toBe(1.0);
      expect(calculatePathSimilarity('https://api.example.com/users/abc', '/users/{id}')).toBe(1.0);
      expect(calculatePathSimilarity('https://api.example.com/users/123/profile', '/users/{id}/profile')).toBe(1.0);
      expect(calculatePathSimilarity('https://api.example.com/different/path', '/users/{id}')).toBe(0);
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign confidence scores to matches', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserById',
          statusCode: '200',
          expectedStatusCodes: ['200']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User by ID - Exact Match',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeDefined();
      expect(coverageItems[0].matchConfidence).toBeGreaterThan(0.8); // High confidence for exact match
    });

    test('should handle different confidence levels for various match types', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserById',
          statusCode: '200',
          expectedStatusCodes: ['200']
        },
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserById',
          statusCode: '404',
          expectedStatusCodes: ['200', '404']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User by ID - Success Case',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User by ID - Not Found Case',
          method: 'get',
          rawUrl: 'https://api.example.com/users/999',
          testedStatusCodes: ['404'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(2);
      
      const primaryMatch = matched.find(item => item.isPrimaryMatch);
      const secondaryMatch = matched.find(item => !item.isPrimaryMatch);
      
      expect(primaryMatch).toBeDefined();
      expect(primaryMatch.statusCode).toBe('200');
      expect(secondaryMatch).toBeDefined();
      expect(secondaryMatch.statusCode).toBe('404');
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    test('should handle multiple HTTP methods on same path', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUser',
          statusCode: '200',
          expectedStatusCodes: ['200', '404']
        },
        {
          method: 'put',
          path: '/users/{id}',
          operationId: 'updateUser',
          statusCode: '200',
          expectedStatusCodes: ['200', '400', '404']
        },
        {
          method: 'delete',
          path: '/users/{id}',
          operationId: 'deleteUser',
          statusCode: '204',
          expectedStatusCodes: ['204', '404']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Update User',
          method: 'put',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"John"}' },
          testScripts: ''
        },
        {
          name: 'Delete User',
          method: 'delete',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['204'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(3);
      
      const getMethods = matched.filter(item => item.method === 'GET');
      const putMethods = matched.filter(item => item.method === 'PUT');
      const deleteMethods = matched.filter(item => item.method === 'DELETE');
      
      expect(getMethods.length).toBe(1);
      expect(putMethods.length).toBe(1);
      expect(deleteMethods.length).toBe(1);
    });

    test('should handle complex path patterns with multiple parameters', () => {
      const specOps = [
        {
          method: 'get',
          path: '/organizations/{orgId}/users/{userId}/permissions',
          operationId: 'getUserPermissions',
          statusCode: '200',
          expectedStatusCodes: ['200', '403', '404']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User Permissions',
          method: 'get',
          rawUrl: 'https://api.example.com/organizations/org123/users/user456/permissions',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeGreaterThan(0.8);
    });

    test('should handle query parameters with smart mapping', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: '200',
          expectedStatusCodes: ['200', '400'],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100 }
            }
          ]
        }
      ];

      const postmanReqs = [
        {
          name: 'Get Users with Pagination',
          method: 'get',
          rawUrl: 'https://api.example.com/users?page=1&limit=10',
          testedStatusCodes: ['200'],
          queryParams: [
            { key: 'page', value: '1' },
            { key: 'limit', value: '10' }
          ],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: true,
        strictBody: false

      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeGreaterThan(0.8);
    });

    test('should handle request body validation with smart mapping', () => {
      const specOps = [
        {
          method: 'post',
          path: '/users',
          operationId: 'createUser',
          statusCode: '201',
          expectedStatusCodes: ['201', '400'],
          requestBodyContent: ['application/json']
        }
      ];

      const postmanReqs = [
        {
          name: 'Create User',
          method: 'post',
          rawUrl: 'https://api.example.com/users',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: {
            mode: 'raw',
            content: '{"name":"John Doe","email":"john@example.com"}'
          },
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: true,

      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeGreaterThan(0.8);
    });

    test('should handle mixed success and error codes intelligently', () => {
      const specOps = [
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '201',
          expectedStatusCodes: ['201']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '400',
          expectedStatusCodes: ['400']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '409',
          expectedStatusCodes: ['409']
        }
      ];

      const postmanReqs = [
        {
          name: 'Create Order - Success',
          method: 'post',
          rawUrl: 'https://api.example.com/orders',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"product":"laptop","quantity":1}' },
          testScripts: ''
        },
        {
          name: 'Create Order - Validation Error',
          method: 'post',
          rawUrl: 'https://api.example.com/orders',
          testedStatusCodes: ['400'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"product":"","quantity":-1}' },
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      const unmatched = coverageItems.filter(item => item.unmatched);

      expect(matched.length).toBe(2); // 201 and 400 should be matched
      expect(unmatched.length).toBe(1); // 409 should remain unmatched

      const primaryMatch = matched.find(item => item.isPrimaryMatch);
      expect(primaryMatch).toBeDefined();
      expect(primaryMatch.statusCode).toBe('201'); // Success code should be primary
    });

    test('should handle no matching requests gracefully', () => {
      const specOps = [
        {
          method: 'get',
          path: '/analytics/reports',
          operationId: 'getAnalyticsReports',
          statusCode: '200',
          expectedStatusCodes: ['200']
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
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      expect(coverageItems.length).toBe(1);
      expect(coverageItems[0].unmatched).toBe(true);
      expect(coverageItems[0].matchedRequests.length).toBe(0);
    });

    test('should handle operations without explicit status codes', () => {
      const specOps = [
        {
          method: 'get',
          path: '/health',
          operationId: 'healthCheck',
          statusCode: null,
          expectedStatusCodes: []
        }
      ];

      const postmanReqs = [
        {
          name: 'Health Check',
          method: 'get',
          rawUrl: 'https://api.example.com/health',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeDefined();
    });
  });

  describe('Real-World API Patterns', () => {
    test('should handle RESTful CRUD operations', () => {
      const specOps = [
        // GET /users - List users
        { method: 'get', path: '/users', operationId: 'listUsers', statusCode: '200', expectedStatusCodes: ['200'] },
        // POST /users - Create user
        { method: 'post', path: '/users', operationId: 'createUser', statusCode: '201', expectedStatusCodes: ['201'] },
        // GET /users/{id} - Get user
        { method: 'get', path: '/users/{id}', operationId: 'getUser', statusCode: '200', expectedStatusCodes: ['200'] },
        // PUT /users/{id} - Update user
        { method: 'put', path: '/users/{id}', operationId: 'updateUser', statusCode: '200', expectedStatusCodes: ['200'] },
        // DELETE /users/{id} - Delete user
        { method: 'delete', path: '/users/{id}', operationId: 'deleteUser', statusCode: '204', expectedStatusCodes: ['204'] }
      ];

      const postmanReqs = [
        {
          name: 'List Users',
          method: 'get',
          rawUrl: 'https://api.example.com/users',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Create User',
          method: 'post',
          rawUrl: 'https://api.example.com/users',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"John"}' },
          testScripts: ''
        },
        {
          name: 'Get User by ID',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Update User',
          method: 'put',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"John Updated"}' },
          testScripts: ''
        },
        {
          name: 'Delete User',
          method: 'delete',
          rawUrl: 'https://api.example.com/users/123',
          testedStatusCodes: ['204'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(5); // All CRUD operations should be matched
      
      // Verify each HTTP method is represented
      const methods = matched.map(item => item.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    test('should handle versioned API paths', () => {
      const specOps = [
        {
          method: 'get',
          path: '/v1/users/{id}',
          operationId: 'getUserV1',
          statusCode: '200',
          expectedStatusCodes: ['200']
        },
        {
          method: 'get',
          path: '/v2/users/{id}',
          operationId: 'getUserV2',
          statusCode: '200',
          expectedStatusCodes: ['200']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User V1',
          method: 'get',
          rawUrl: 'https://api.example.com/v1/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User V2',
          method: 'get',
          rawUrl: 'https://api.example.com/v2/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(2);
      
      const v1Match = matched.find(item => item.path === '/v1/users/{id}');
      const v2Match = matched.find(item => item.path === '/v2/users/{id}');
      
      expect(v1Match).toBeDefined();
      expect(v2Match).toBeDefined();
    });
  });
});