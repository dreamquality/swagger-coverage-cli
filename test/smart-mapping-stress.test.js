const { matchOperationsDetailed, isSuccessStatusCode, calculatePathSimilarity } = require('../lib/match');

describe('Smart Mapping Stress Tests and Performance', () => {
  describe('Performance Tests', () => {
    test('should handle large number of operations efficiently', () => {
      // Generate a large number of operations
      const specOps = [];
      for (let i = 0; i < 1000; i++) {
        specOps.push({
          method: 'get',
          path: `/resource${i}/{id}`,
          operationId: `getResource${i}`,
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          tags: [`Resource${i}`]
        });
        specOps.push({
          method: 'get',
          path: `/resource${i}/{id}`,
          operationId: `getResource${i}`,
          statusCode: '404',
          expectedStatusCodes: ['200', '404'],
          tags: [`Resource${i}`]
        });
      }

      // Generate matching requests
      const postmanReqs = [];
      for (let i = 0; i < 100; i++) {
        postmanReqs.push({
          name: `Get Resource ${i}`,
          method: 'get',
          rawUrl: `https://api.example.com/resource${i}/123`,
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        });
      }

      const startTime = Date.now();
      
      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false,
        smartMapping: true
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(coverageItems).toBeDefined();
      expect(coverageItems.length).toBe(2000); // 1000 resources * 2 status codes each
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBeGreaterThan(50); // Should match at least half of the requests
    });

    test('should handle complex path similarity calculations efficiently', () => {
      const testCases = [
        ['https://api.example.com/users/123', '/users/{id}'],
        ['https://api.example.com/users/abc/profile', '/users/{userId}/profile'],
        ['https://api.example.com/organizations/org1/users/user1/permissions', '/organizations/{orgId}/users/{userId}/permissions'],
        ['https://api.example.com/v1/api/resources/res1/items/item1', '/v1/api/resources/{resourceId}/items/{itemId}'],
        ['https://api.example.com/completely/different/path', '/users/{id}']
      ];

      const startTime = Date.now();

      // Run each calculation multiple times to test performance
      for (let i = 0; i < 1000; i++) {
        testCases.forEach(([url, path]) => {
          calculatePathSimilarity(url, path);
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed URLs gracefully', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUser',
          statusCode: '200',
          expectedStatusCodes: ['200']
        }
      ];

      const postmanReqs = [
        {
          name: 'Malformed URL Test',
          method: 'get',
          rawUrl: 'not-a-valid-url',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Empty URL Test',
          method: 'get',
          rawUrl: '',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Null URL Test',
          method: 'get',
          rawUrl: null,
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      expect(() => {
        const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
          verbose: false,
          strictQuery: false,
          strictBody: false,
          smartMapping: true
        });
        expect(coverageItems).toBeDefined();
      }).not.toThrow();
    });

    test('should handle missing or invalid status codes', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: null,
          expectedStatusCodes: []
        },
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: 'invalid',
          expectedStatusCodes: ['invalid']
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

      expect(() => {
        const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
          verbose: false,
          strictQuery: false,
          strictBody: false,
          smartMapping: true
        });
        expect(coverageItems).toBeDefined();
      }).not.toThrow();
    });

    test('should handle empty arrays gracefully', () => {
      expect(() => {
        const coverageItems = matchOperationsDetailed([], [], {
          verbose: false,
          strictQuery: false,
          strictBody: false,
          smartMapping: true
        });
        expect(coverageItems).toEqual([]);
      }).not.toThrow();
    });

    test('should handle operations with missing required fields', () => {
      const specOps = [
        {
          // Missing method
          path: '/users',
          operationId: 'getUsers',
          statusCode: '200'
        },
        {
          method: 'get',
          // Missing path
          operationId: 'getUsers',
          statusCode: '200'
        },
        {
          method: 'get',
          path: '/users',
          // Missing operationId - should use default
          statusCode: '200'
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

      expect(() => {
        const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
          verbose: false,
          strictQuery: false,
          strictBody: false,
          smartMapping: true
        });
        expect(coverageItems).toBeDefined();
        expect(coverageItems.length).toBe(3);
      }).not.toThrow();
    });
  });

  describe('Utility Function Tests', () => {
    test('isSuccessStatusCode should correctly identify success codes', () => {
      // Success codes (2xx)
      expect(isSuccessStatusCode('200')).toBe(true);
      expect(isSuccessStatusCode('201')).toBe(true);
      expect(isSuccessStatusCode('204')).toBe(true);
      expect(isSuccessStatusCode('299')).toBe(true);

      // Non-success codes
      expect(isSuccessStatusCode('100')).toBe(false);
      expect(isSuccessStatusCode('199')).toBe(false);
      expect(isSuccessStatusCode('300')).toBe(false);
      expect(isSuccessStatusCode('400')).toBe(false);
      expect(isSuccessStatusCode('500')).toBe(false);

      // Edge cases
      expect(isSuccessStatusCode('')).toBe(false);
      expect(isSuccessStatusCode(null)).toBe(false);
      expect(isSuccessStatusCode(undefined)).toBe(false);
      expect(isSuccessStatusCode('invalid')).toBe(false);
    });

    test('calculatePathSimilarity should handle edge cases', () => {
      // Same path should return 1.0
      expect(calculatePathSimilarity('https://api.example.com/users', '/users')).toBe(1.0);
      
      // Root paths
      expect(calculatePathSimilarity('https://api.example.com/', '/')).toBe(1.0);
      expect(calculatePathSimilarity('https://api.example.com', '/')).toBe(1.0);
      
      // Empty or null inputs should return 0
      expect(calculatePathSimilarity('', '')).toBe(0);
      expect(calculatePathSimilarity(null, null)).toBe(0);
      expect(calculatePathSimilarity(undefined, undefined)).toBe(0);
      
      // Mismatched segment counts should return 0
      expect(calculatePathSimilarity('https://api.example.com/users/123', '/users')).toBe(0);
      expect(calculatePathSimilarity('https://api.example.com/users', '/users/123')).toBe(0);
      
      // Complex parameter scenarios
      expect(calculatePathSimilarity(
        'https://api.example.com/users/123/orders/456/items/789',
        '/users/{userId}/orders/{orderId}/items/{itemId}'
      )).toBe(1.0);
    });
  });

  describe('Complex Matching Scenarios', () => {
    test('should handle overlapping paths with different parameters', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUser',
          statusCode: '200',
          expectedStatusCodes: ['200']
        },
        {
          method: 'get',
          path: '/users/{id}/profile',
          operationId: 'getUserProfile',
          statusCode: '200',
          expectedStatusCodes: ['200']
        },
        {
          method: 'get',
          path: '/users/{id}/orders',
          operationId: 'getUserOrders',
          statusCode: '200',
          expectedStatusCodes: ['200']
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
          name: 'Get User Profile',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123/profile',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User Orders',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123/orders',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false,
        smartMapping: true
      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(3);
      
      // Each operation should match exactly one request
      matched.forEach(item => {
        expect(item.matchedRequests.length).toBe(1);
      });
    });

    test('should prioritize exact matches over partial matches', () => {
      const specOps = [
        {
          method: 'get',
          path: '/api/v1/users/{id}',
          operationId: 'getUserV1',
          statusCode: '200',
          expectedStatusCodes: ['200']
        },
        {
          method: 'get',
          path: '/api/v2/users/{id}',
          operationId: 'getUserV2',
          statusCode: '200',
          expectedStatusCodes: ['200']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User V1',
          method: 'get',
          rawUrl: 'https://api.example.com/api/v1/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false,
        smartMapping: true
      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(1);
      expect(matched[0].path).toBe('/api/v1/users/{id}');
      expect(matched[0].matchConfidence).toBeGreaterThan(0.8);
    });

    test('should handle multiple status codes with varying test coverage', () => {
      const specOps = [
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '201',
          expectedStatusCodes: ['201', '400', '409', '500']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '400',
          expectedStatusCodes: ['201', '400', '409', '500']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '409',
          expectedStatusCodes: ['201', '400', '409', '500']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '500',
          expectedStatusCodes: ['201', '400', '409', '500']
        }
      ];

      const postmanReqs = [
        {
          name: 'Create Order - Success',
          method: 'post',
          rawUrl: 'https://api.example.com/orders',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"item":"laptop"}' },
          testScripts: ''
        },
        {
          name: 'Create Order - Invalid Data',
          method: 'post',
          rawUrl: 'https://api.example.com/orders',
          testedStatusCodes: ['400'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"item":""}' },
          testScripts: ''
        },
        {
          name: 'Create Order - Duplicate',
          method: 'post',
          rawUrl: 'https://api.example.com/orders',
          testedStatusCodes: ['409'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"item":"laptop"}' },
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false,
        smartMapping: true
      });

      const matched = coverageItems.filter(item => !item.unmatched);
      const unmatched = coverageItems.filter(item => item.unmatched);

      expect(matched.length).toBe(3); // 201, 400, 409 should be matched
      expect(unmatched.length).toBe(1); // 500 should remain unmatched

      const primaryMatch = matched.find(item => item.isPrimaryMatch);
      expect(primaryMatch).toBeDefined();
      expect(primaryMatch.statusCode).toBe('201'); // Success code should be primary
    });
  });
});