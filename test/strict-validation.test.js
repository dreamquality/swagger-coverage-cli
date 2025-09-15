const { matchOperationsDetailed } = require('../lib/match');
const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { loadNewmanReport, extractRequestsFromNewman } = require('../lib/newman');
const fs = require('fs');
const path = require('path');

describe('Strict Query and Body Validation Tests', () => {
  let strictApiSpec;
  let strictSpecOperations;
  let strictPostmanRequests;
  let strictNewmanRequests;

  beforeAll(async () => {
    // Load the strict validation API spec
    const specPath = path.resolve(__dirname, 'fixtures/strict-validation-api.yaml');
    strictApiSpec = await loadAndParseSpec(specPath);
    strictSpecOperations = extractOperationsFromSpec(strictApiSpec, false);

    // Load Postman collection
    const collectionPath = path.resolve(__dirname, 'fixtures/strict-validation-collection.json');
    const postmanCollection = loadPostmanCollection(collectionPath);
    strictPostmanRequests = extractRequestsFromPostman(postmanCollection, false);

    // Load Newman report
    const newmanPath = path.resolve(__dirname, 'fixtures/strict-validation-newman.json');
    const newmanReport = loadNewmanReport(newmanPath);
    strictNewmanRequests = extractRequestsFromNewman(newmanReport, false);
  });

  describe('Strict Query Parameter Validation', () => {
    test('should match when all required query parameters are present and valid', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      // Find the getUsersWithRequiredParams operation
      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();
      
      // Should match the valid request
      expect(getUsersOp.unmatched).toBe(false);
      expect(getUsersOp.matchedRequests.length).toBeGreaterThan(0);
      
      const validMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Valid Required Params'
      );
      expect(validMatch).toBeDefined();
    });

    test('should not match when required query parameters are missing', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();

      // Should not match the request with missing required params
      const invalidMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Missing Required Param'
      );
      expect(invalidMatch).toBeUndefined();
    });

    test('should not match when query parameter values violate enum constraints', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();

      // Should not match the request with invalid enum value
      const invalidEnumMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Invalid Enum Value'
      );
      expect(invalidEnumMatch).toBeUndefined();
    });

    test('should not match when query parameter values violate pattern constraints', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();

      // Should not match the request with invalid pattern
      const invalidPatternMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Invalid Pattern'
      );
      expect(invalidPatternMatch).toBeUndefined();
    });

    test('should match operations without query parameters when strict query is enabled', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      // Find operations without query parameters - they should still match
      const createOrderOp = coverageItems.find(item => item.name === 'createOrderWithFormData');
      expect(createOrderOp).toBeDefined();
      expect(createOrderOp.unmatched).toBe(false);
    });

    test('should allow matching without strict query validation (default behavior)', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();

      // Should match all requests when strict query is disabled
      expect(getUsersOp.matchedRequests.length).toBeGreaterThan(2);
      
      const validMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Valid Required Params'
      );
      const invalidMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Missing Required Param'
      );
      
      expect(validMatch).toBeDefined();
      expect(invalidMatch).toBeDefined(); // Should match when strict query is disabled
    });
  });

  describe('Strict Request Body Validation', () => {
    test('should match when request body is valid JSON for application/json endpoints', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      const createUserOp = coverageItems.find(item => item.name === 'createUserWithJsonBody');
      expect(createUserOp).toBeDefined();
      
      // Should match the valid JSON request
      const validJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Valid JSON Body'
      );
      expect(validJsonMatch).toBeDefined();
    });

    test('should not match when request body is invalid JSON for application/json endpoints', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      const createUserOp = coverageItems.find(item => item.name === 'createUserWithJsonBody');
      expect(createUserOp).toBeDefined();

      // Should not match the invalid JSON request
      const invalidJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Invalid JSON Body'
      );
      expect(invalidJsonMatch).toBeUndefined();
    });

    test('should not match when request body mode is not raw for application/json endpoints', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      const createUserOp = coverageItems.find(item => item.name === 'createUserWithJsonBody');
      expect(createUserOp).toBeDefined();

      // Should not match the form data request for JSON endpoint
      const formDataMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Form Data Instead of JSON'
      );
      expect(formDataMatch).toBeUndefined();
    });

    test('should match non-JSON endpoints regardless of body type when strict body is enabled', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      // Find the form data endpoint - should match form data requests
      const createOrderOp = coverageItems.find(item => item.name === 'createOrderWithFormData');
      expect(createOrderOp).toBeDefined();
      expect(createOrderOp.unmatched).toBe(false);
      
      const formDataMatch = createOrderOp.matchedRequests.find(req => 
        req.name === 'Create Order - Form Data (Non-JSON)'
      );
      expect(formDataMatch).toBeDefined();
    });

    test('should allow matching without strict body validation (default behavior)', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      const createUserOp = coverageItems.find(item => item.name === 'createUserWithJsonBody');
      expect(createUserOp).toBeDefined();

      // Should match all requests when strict body is disabled
      expect(createUserOp.matchedRequests.length).toBeGreaterThan(1);
      
      const validJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Valid JSON Body'
      );
      const invalidJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Invalid JSON Body'
      );
      const formDataMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Form Data Instead of JSON'
      );
      
      expect(validJsonMatch).toBeDefined();
      expect(invalidJsonMatch).toBeDefined(); // Should match when strict body is disabled
      expect(formDataMatch).toBeDefined(); // Should match when strict body is disabled
    });
  });

  describe('Combined Strict Query and Body Validation', () => {
    test('should apply both strict query and body validation when both flags are enabled', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: true
      });

      // Find an operation that requires both valid query params and JSON body
      const updateProductOp = coverageItems.find(item => item.name === 'updateProductWithOptionalParams');
      expect(updateProductOp).toBeDefined();
      
      // Should match valid requests that satisfy both criteria
      const validMatch = updateProductOp.matchedRequests.find(req => 
        req.name === 'Update Product - Optional Params'
      );
      expect(validMatch).toBeDefined();
    });

    test('should show reduced coverage when strict validation is enabled', () => {
      // Test without strict validation
      const lenientCoverage = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Test with strict validation
      const strictCoverage = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: true
      });

      // Count matched operations
      const lenientMatched = lenientCoverage.filter(item => !item.unmatched).length;
      const strictMatched = strictCoverage.filter(item => !item.unmatched).length;

      // Strict validation should result in fewer matches
      expect(strictMatched).toBeLessThanOrEqual(lenientMatched);
    });
  });

  describe('Newman Report Strict Validation', () => {
    test('should apply strict query validation to Newman reports', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictNewmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      const getUsersOp = coverageItems.find(item => item.name === 'getUsersWithRequiredParams');
      expect(getUsersOp).toBeDefined();
      
      // Should match valid Newman execution
      const validMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Valid Required Params'
      );
      expect(validMatch).toBeDefined();

      // Should not match invalid Newman execution
      const invalidMatch = getUsersOp.matchedRequests.find(req => 
        req.name === 'Get Users - Missing Required Param'
      );
      expect(invalidMatch).toBeUndefined();
    });

    test('should apply strict body validation to Newman reports', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictNewmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      const createUserOp = coverageItems.find(item => item.name === 'createUserWithJsonBody');
      expect(createUserOp).toBeDefined();
      
      // Should match valid JSON Newman execution
      const validJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Valid JSON Body'
      );
      expect(validJsonMatch).toBeDefined();

      // Should not match invalid JSON Newman execution
      const invalidJsonMatch = createUserOp.matchedRequests.find(req => 
        req.name === 'Create User - Invalid JSON Body'
      );
      expect(invalidJsonMatch).toBeUndefined();
    });
  });

  describe('Edge Cases for Strict Validation', () => {
    test('should handle operations with no parameters when strict query is enabled', () => {
      // Create a spec operation with no parameters
      const noParamOps = [{
        method: 'get',
        path: '/simple',
        operationId: 'getSimple',
        parameters: [] // No parameters
      }];

      const noParamRequests = [{
        method: 'get',
        rawUrl: 'https://api.example.com/simple',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null
      }];

      const coverageItems = matchOperationsDetailed(noParamOps, noParamRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      expect(coverageItems[0].unmatched).toBe(false);
    });

    test('should handle operations with no request body when strict body is enabled', () => {
      // Create a spec operation with no request body
      const noBodyOps = [{
        method: 'get',
        path: '/simple',
        operationId: 'getSimple',
        requestBodyContent: null // No request body
      }];

      const noBodyRequests = [{
        method: 'get',
        rawUrl: 'https://api.example.com/simple',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null
      }];

      const coverageItems = matchOperationsDetailed(noBodyOps, noBodyRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: true
      });

      expect(coverageItems[0].unmatched).toBe(false);
    });

    test('should handle optional query parameters correctly in strict mode', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: false
      });

      // Find operation with optional parameters
      const updateProductOp = coverageItems.find(item => item.name === 'updateProductWithOptionalParams');
      expect(updateProductOp).toBeDefined();
      
      // Should match even when optional params are present and valid
      expect(updateProductOp.unmatched).toBe(false);
    });

    test('should handle empty request arrays gracefully', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, [], {
        verbose: false,
        strictQuery: true,
        strictBody: true
      });

      // All operations should be unmatched
      expect(coverageItems.every(item => item.unmatched)).toBe(true);
    });

    test('should handle empty spec operations gracefully', () => {
      const coverageItems = matchOperationsDetailed([], strictPostmanRequests, {
        verbose: false,
        strictQuery: true,
        strictBody: true
      });

      // Should return empty array
      expect(coverageItems).toHaveLength(0);
    });
  });
});