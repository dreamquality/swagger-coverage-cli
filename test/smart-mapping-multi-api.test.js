const { matchOperationsDetailed } = require('../lib/match');

describe('Smart Mapping Multi-API Scenarios', () => {
  describe('Cross-API Matching', () => {
    test('should handle multiple APIs with overlapping endpoints', () => {
      const specOps = [
        // API 1 - Users Service
        {
          method: 'get',
          path: '/users',
          operationId: 'getUsers',
          statusCode: '200',
          expectedStatusCodes: ['200', '500'],
          apiName: 'Users API',
          sourceFile: 'users-api.yaml',
          tags: ['Users']
        },
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserById',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'Users API',
          sourceFile: 'users-api.yaml',
          tags: ['Users']
        },
        // API 2 - Orders Service  
        {
          method: 'get',
          path: '/orders',
          operationId: 'getOrders',
          statusCode: '200',
          expectedStatusCodes: ['200', '500'],
          apiName: 'Orders API',
          sourceFile: 'orders-api.yaml',
          tags: ['Orders']
        },
        {
          method: 'post',
          path: '/orders',
          operationId: 'createOrder',
          statusCode: '201',
          expectedStatusCodes: ['201', '400'],
          apiName: 'Orders API',
          sourceFile: 'orders-api.yaml',
          tags: ['Orders']
        },
        // API 3 - Common endpoint in both APIs
        {
          method: 'get',
          path: '/health',
          operationId: 'healthCheckUsers',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Users API',
          sourceFile: 'users-api.yaml',
          tags: ['Health']
        },
        {
          method: 'get',
          path: '/health',
          operationId: 'healthCheckOrders',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Orders API',
          sourceFile: 'orders-api.yaml',
          tags: ['Health']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get All Users',
          method: 'get',
          rawUrl: 'https://users-api.example.com/users',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User by ID',
          method: 'get',
          rawUrl: 'https://users-api.example.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get All Orders',
          method: 'get',
          rawUrl: 'https://orders-api.example.com/orders',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Create Order',
          method: 'post',
          rawUrl: 'https://orders-api.example.com/orders',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"item":"laptop","quantity":1}' },
          testScripts: ''
        },
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

      const matched = coverageItems.filter(item => !item.unmatched);
      
      // Should match most endpoints
      expect(matched.length).toBeGreaterThanOrEqual(4);
      
      // Verify API names are preserved
      const usersApiMatches = matched.filter(item => item.apiName === 'Users API');
      const ordersApiMatches = matched.filter(item => item.apiName === 'Orders API');
      
      expect(usersApiMatches.length).toBeGreaterThan(0);
      expect(ordersApiMatches.length).toBeGreaterThan(0);
      
      // Health endpoint might match both APIs due to URL pattern matching
      const healthMatches = matched.filter(item => item.path === '/health');
      expect(healthMatches.length).toBeGreaterThanOrEqual(1);
    });

    test('should maintain API separation with smart mapping', () => {
      const specOps = [
        {
          method: 'get',
          path: '/v1/data',
          operationId: 'getDataV1',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Legacy API',
          sourceFile: 'legacy-api.yaml'
        },
        {
          method: 'get',
          path: '/v2/data',
          operationId: 'getDataV2',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Modern API',
          sourceFile: 'modern-api.yaml'
        }
      ];

      const postmanReqs = [
        {
          name: 'Get Data V1',
          method: 'get',
          rawUrl: 'https://api.example.com/v1/data',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get Data V2',
          method: 'get',
          rawUrl: 'https://api.example.com/v2/data',
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
      
      const v1Match = matched.find(item => item.path === '/v1/data');
      const v2Match = matched.find(item => item.path === '/v2/data');
      
      expect(v1Match).toBeDefined();
      expect(v1Match.apiName).toBe('Legacy API');
      expect(v2Match).toBeDefined();
      expect(v2Match.apiName).toBe('Modern API');
    });

    test('should handle microservices architecture with smart mapping', () => {
      const specOps = [
        // User Service
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUser',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'User Service',
          sourceFile: 'user-service.yaml',
          tags: ['Users']
        },
        // Profile Service
        {
          method: 'get',
          path: '/profiles/{userId}',
          operationId: 'getUserProfile',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'Profile Service',
          sourceFile: 'profile-service.yaml',
          tags: ['Profiles']
        },
        // Notification Service
        {
          method: 'post',
          path: '/notifications',
          operationId: 'sendNotification',
          statusCode: '202',
          expectedStatusCodes: ['202', '400'],
          apiName: 'Notification Service',
          sourceFile: 'notification-service.yaml',
          tags: ['Notifications']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User from User Service',
          method: 'get',
          rawUrl: 'https://user-service.company.com/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User Profile',
          method: 'get',
          rawUrl: 'https://profile-service.company.com/profiles/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Send User Notification',
          method: 'post',
          rawUrl: 'https://notification-service.company.com/notifications',
          testedStatusCodes: ['202'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"userId":"123","message":"Welcome!"}' },
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
      
      // Each service should have its operations matched
      const userServiceMatches = matched.filter(item => item.apiName === 'User Service');
      const profileServiceMatches = matched.filter(item => item.apiName === 'Profile Service');
      const notificationServiceMatches = matched.filter(item => item.apiName === 'Notification Service');
      
      expect(userServiceMatches.length).toBe(1);
      expect(profileServiceMatches.length).toBe(1);
      expect(notificationServiceMatches.length).toBe(1);
      
      // All should have high confidence
      matched.forEach(item => {
        expect(item.matchConfidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('API Namespace Conflicts', () => {
    test('should handle same endpoint paths in different APIs', () => {
      const specOps = [
        {
          method: 'get',
          path: '/items',
          operationId: 'getProducts',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Product Catalog API',
          sourceFile: 'products.yaml',
          tags: ['Products']
        },
        {
          method: 'get',
          path: '/items',
          operationId: 'getCartItems',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Shopping Cart API',
          sourceFile: 'cart.yaml',
          tags: ['Cart']
        },
        {
          method: 'get',
          path: '/items',
          operationId: 'getInventoryItems',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Inventory API',
          sourceFile: 'inventory.yaml',
          tags: ['Inventory']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get Product Catalog Items',
          method: 'get',
          rawUrl: 'https://products.example.com/items',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get Shopping Cart Items',
          method: 'get',
          rawUrl: 'https://cart.example.com/items',
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
      const unmatched = coverageItems.filter(item => item.unmatched);
      
      // Should match at least 2 operations (could match all due to URL pattern matching)
      expect(matched.length).toBeGreaterThanOrEqual(2);
      expect(unmatched.length).toBeLessThanOrEqual(1);
      
      // Verify API context is preserved
      matched.forEach(item => {
        expect(['Product Catalog API', 'Shopping Cart API', 'Inventory API']).toContain(item.apiName);
      });
    });

    test('should handle parameter conflicts across APIs', () => {
      const specOps = [
        {
          method: 'get',
          path: '/users/{id}/orders',
          operationId: 'getUserOrders',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'User API',
          sourceFile: 'users.yaml'
        },
        {
          method: 'get',
          path: '/customers/{id}/orders',
          operationId: 'getCustomerOrders',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Customer API',
          sourceFile: 'customers.yaml'
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User Orders',
          method: 'get',
          rawUrl: 'https://api.example.com/users/123/orders',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get Customer Orders',
          method: 'get',
          rawUrl: 'https://api.example.com/customers/456/orders',
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
      
      const userApiMatch = matched.find(item => item.apiName === 'User API');
      const customerApiMatch = matched.find(item => item.apiName === 'Customer API');
      
      expect(userApiMatch).toBeDefined();
      expect(userApiMatch.path).toBe('/users/{id}/orders');
      expect(customerApiMatch).toBeDefined();
      expect(customerApiMatch.path).toBe('/customers/{id}/orders');
    });
  });

  describe('Complex Multi-API Integration', () => {
    test('should handle gateway-style API aggregation', () => {
      const specOps = [
        // Gateway routes to different services
        {
          method: 'get',
          path: '/api/users/{id}',
          operationId: 'getUser',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'API Gateway',
          sourceFile: 'gateway.yaml',
          tags: ['Gateway', 'Users']
        },
        {
          method: 'get',
          path: '/api/orders/{id}',
          operationId: 'getOrder',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'API Gateway',
          sourceFile: 'gateway.yaml',
          tags: ['Gateway', 'Orders']
        },
        // Internal service endpoints
        {
          method: 'get',
          path: '/users/{id}',
          operationId: 'getUserInternal',
          statusCode: '200',
          expectedStatusCodes: ['200', '404'],
          apiName: 'User Service Internal',
          sourceFile: 'user-service-internal.yaml',
          tags: ['Users', 'Internal']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get User via Gateway',
          method: 'get',
          rawUrl: 'https://gateway.example.com/api/users/123',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get Order via Gateway',
          method: 'get',
          rawUrl: 'https://gateway.example.com/api/orders/456',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Get User Direct',
          method: 'get',
          rawUrl: 'https://user-service.internal.com/users/123',
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
      expect(matched.length).toBe(3);
      
      const gatewayMatches = matched.filter(item => item.apiName === 'API Gateway');
      const internalMatches = matched.filter(item => item.apiName === 'User Service Internal');
      
      expect(gatewayMatches.length).toBe(2);
      expect(internalMatches.length).toBe(1);
    });

    test('should handle API versioning across multiple specifications', () => {
      const specOps = [
        // V1 API
        {
          method: 'get',
          path: '/v1/users',
          operationId: 'getUsersV1',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Users API V1',
          sourceFile: 'users-v1.yaml',
          tags: ['Users', 'V1']
        },
        {
          method: 'post',
          path: '/v1/users',
          operationId: 'createUserV1',
          statusCode: '201',
          expectedStatusCodes: ['201', '400'],
          apiName: 'Users API V1',
          sourceFile: 'users-v1.yaml',
          tags: ['Users', 'V1']
        },
        // V2 API
        {
          method: 'get',
          path: '/v2/users',
          operationId: 'getUsersV2',
          statusCode: '200',
          expectedStatusCodes: ['200'],
          apiName: 'Users API V2',
          sourceFile: 'users-v2.yaml',
          tags: ['Users', 'V2']
        },
        {
          method: 'post',
          path: '/v2/users',
          operationId: 'createUserV2',
          statusCode: '201',
          expectedStatusCodes: ['201', '400', '422'],
          apiName: 'Users API V2',
          sourceFile: 'users-v2.yaml',
          tags: ['Users', 'V2']
        }
      ];

      const postmanReqs = [
        {
          name: 'Get Users V1',
          method: 'get',
          rawUrl: 'https://api.example.com/v1/users',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Create User V1',
          method: 'post',
          rawUrl: 'https://api.example.com/v1/users',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"John"}' },
          testScripts: ''
        },
        {
          name: 'Get Users V2',
          method: 'get',
          rawUrl: 'https://api.example.com/v2/users',
          testedStatusCodes: ['200'],
          queryParams: [],
          bodyInfo: null,
          testScripts: ''
        },
        {
          name: 'Create User V2',
          method: 'post',
          rawUrl: 'https://api.example.com/v2/users',
          testedStatusCodes: ['201'],
          queryParams: [],
          bodyInfo: { mode: 'raw', content: '{"name":"Jane","email":"jane@example.com"}' },
          testScripts: ''
        }
      ];

      const coverageItems = matchOperationsDetailed(specOps, postmanReqs, {
        verbose: false,
        strictQuery: false,
        strictBody: false

      });

      const matched = coverageItems.filter(item => !item.unmatched);
      expect(matched.length).toBe(4);
      
      const v1Matches = matched.filter(item => item.apiName === 'Users API V1');
      const v2Matches = matched.filter(item => item.apiName === 'Users API V2');
      
      expect(v1Matches.length).toBe(2);
      expect(v2Matches.length).toBe(2);
      
      // All should be primary matches since they're success codes
      const primaryMatches = matched.filter(item => item.isPrimaryMatch);
      expect(primaryMatches.length).toBe(4);
    });
  });
});