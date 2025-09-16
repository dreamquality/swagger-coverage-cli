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
        strictBody: false,
        smartMapping: true // Enable smart mapping
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
        strictBody: false,
        smartMapping: true
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
        strictBody: false,
        smartMapping: true
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
        strictBody: false,
        smartMapping: true
      });

      expect(coverageItems[0].unmatched).toBe(false);
      expect(coverageItems[0].matchConfidence).toBeDefined();
      expect(coverageItems[0].matchConfidence).toBeGreaterThan(0.8); // High confidence for exact match
    });
  });
});