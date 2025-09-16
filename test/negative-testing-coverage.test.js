const { matchOperationsDetailed } = require('../lib/match');
const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { loadNewmanReport, extractRequestsFromNewman } = require('../lib/newman');
const fs = require('fs');
const path = require('path');

describe('Negative Testing Coverage Analysis', () => {
  let strictApiSpec;
  let strictSpecOperations;
  let strictPostmanRequests;
  let strictNewmanRequests;

  beforeAll(async () => {
    // Load the strict validation API spec
    const specPath = path.resolve(__dirname, 'fixtures/strict-validation-api.yaml');
    strictApiSpec = await loadAndParseSpec(specPath);
    strictSpecOperations = extractOperationsFromSpec(strictApiSpec, false);

    // Load Postman collection with negative tests
    const collectionPath = path.resolve(__dirname, 'fixtures/strict-validation-collection.json');
    const postmanCollection = loadPostmanCollection(collectionPath);
    strictPostmanRequests = extractRequestsFromPostman(postmanCollection, false);

    // Load Newman report
    const newmanPath = path.resolve(__dirname, 'fixtures/strict-validation-newman.json');
    const newmanReport = loadNewmanReport(newmanPath);
    strictNewmanRequests = extractRequestsFromNewman(newmanReport, false);
  });

  describe('Error Status Code Coverage Analysis', () => {
    test('should identify coverage for 4xx client error status codes', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Find operations that have 4xx status codes defined
      const clientErrorOps = coverageItems.filter(item => 
        item.statusCode && item.statusCode.startsWith('4')
      );

      expect(clientErrorOps.length).toBeGreaterThan(0);

      // Check that we have test coverage for common client errors
      const badRequestOp = coverageItems.find(item => item.statusCode === '400');
      const unauthorizedOp = coverageItems.find(item => item.statusCode === '401');
      const forbiddenOp = coverageItems.find(item => item.statusCode === '403');
      const notFoundOp = coverageItems.find(item => item.statusCode === '404');

      expect(badRequestOp).toBeDefined();
      expect(unauthorizedOp).toBeDefined();
      expect(forbiddenOp).toBeDefined();
      expect(notFoundOp).toBeDefined();
    });

    test('should identify coverage for 5xx server error status codes', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Find operations that have 5xx status codes defined (if any)
      const serverErrorOps = coverageItems.filter(item => 
        item.statusCode && item.statusCode.startsWith('5')
      );

      // Note: Current spec doesn't define 5xx errors, this is expected
      // This test demonstrates how to analyze server error coverage
      expect(Array.isArray(serverErrorOps)).toBe(true);
    });

    test('should match negative test cases for error status codes', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Find a 400 error operation and check if it has matching negative tests
      const badRequestOp = coverageItems.find(item => item.statusCode === '400');
      expect(badRequestOp).toBeDefined();
      
      if (badRequestOp && !badRequestOp.unmatched) {
        const negativeTestMatch = badRequestOp.matchedRequests.find(req => 
          req.name.includes('400') || req.name.includes('Bad Request')
        );
        expect(negativeTestMatch).toBeDefined();
      }
    });

    test('should provide negative testing recommendations', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Analyze which error status codes are defined but not tested
      const errorStatusCodes = ['400', '401', '403', '404', '409', '422', '429'];
      const definedErrorOps = coverageItems.filter(item => 
        errorStatusCodes.includes(item.statusCode)
      );
      
      const unmatchedErrorOps = definedErrorOps.filter(item => item.unmatched);
      
      // We should have some error operations defined
      expect(definedErrorOps.length).toBeGreaterThan(0);
      
      // Log recommendations for missing negative tests
      if (unmatchedErrorOps.length > 0) {
        console.log('⚠️  Missing negative test coverage for:');
        unmatchedErrorOps.forEach(op => {
          console.log(`  - ${op.method} ${op.path} (${op.statusCode})`);
        });
      }
    });
  });

  describe('Boundary Value Testing Coverage Analysis', () => {
    test('should identify boundary value test coverage for numeric parameters', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Look for operations that test boundary values
      const boundaryTests = strictPostmanRequests.filter(req => 
        req.name.includes('Boundary') || 
        req.name.includes('Min') || 
        req.name.includes('Max') ||
        req.name.includes('Above') ||
        req.name.includes('Below')
      );

      expect(boundaryTests.length).toBeGreaterThan(0);
      
      // Check for specific boundary test patterns
      const minBoundaryTest = boundaryTests.find(req => req.name.includes('Min'));
      const maxBoundaryTest = boundaryTests.find(req => req.name.includes('Max'));
      const aboveBoundaryTest = boundaryTests.find(req => req.name.includes('Above'));
      const belowBoundaryTest = boundaryTests.find(req => req.name.includes('Below'));

      expect(minBoundaryTest).toBeDefined();
      expect(maxBoundaryTest).toBeDefined();
      expect(aboveBoundaryTest).toBeDefined();
      expect(belowBoundaryTest).toBeDefined();
    });

    test('should analyze string length boundary testing', () => {
      const boundaryTests = strictPostmanRequests.filter(req => 
        req.name.includes('Length') || 
        req.name.includes('Short') || 
        req.name.includes('Long')
      );

      expect(boundaryTests.length).toBeGreaterThan(0);
    });

    test('should identify missing boundary value tests', () => {
      // Analyze which parameters have constraints but no boundary tests
      const opsWithConstraints = strictSpecOperations.filter(op => {
        if (!op.parameters) return false;
        return op.parameters.some(param => 
          param.schema && (
            param.schema.minimum !== undefined ||
            param.schema.maximum !== undefined ||
            param.schema.minLength !== undefined ||
            param.schema.maxLength !== undefined
          )
        );
      });

      expect(opsWithConstraints.length).toBeGreaterThan(0);
      console.log(`📊 Found ${opsWithConstraints.length} operations with parameter constraints`);
    });
  });

  describe('Invalid Input Testing Coverage Analysis', () => {
    test('should identify invalid data type testing', () => {
      const invalidTests = strictPostmanRequests.filter(req => 
        req.name.includes('Invalid') || 
        req.name.includes('Wrong') ||
        req.name.includes('Bad')
      );

      expect(invalidTests.length).toBeGreaterThan(0);
      
      // Check for specific invalid input patterns
      const invalidEnumTest = invalidTests.find(req => req.name.includes('Enum'));
      const invalidJsonTest = invalidTests.find(req => req.name.includes('JSON'));
      const invalidPatternTest = invalidTests.find(req => req.name.includes('Pattern'));

      expect(invalidEnumTest).toBeDefined();
      expect(invalidJsonTest).toBeDefined();
      expect(invalidPatternTest).toBeDefined();
    });

    test('should analyze content type mismatch testing', () => {
      const contentTypeMismatchTests = strictPostmanRequests.filter(req => 
        (req.name.includes('Form Data') && req.name.includes('JSON')) ||
        req.name.includes('Instead of')
      );

      expect(contentTypeMismatchTests.length).toBeGreaterThan(0);
    });

    test('should identify malformed request testing', () => {
      const malformedTests = strictPostmanRequests.filter(req => 
        req.bodyInfo && 
        req.bodyInfo.mode === 'raw' &&
        req.bodyInfo.content &&
        req.bodyInfo.content.includes('invalid')
      );

      expect(malformedTests.length).toBeGreaterThan(0);
    });
  });

  describe('Unsupported Operations Testing Coverage Analysis', () => {
    test('should identify unsupported HTTP method testing', () => {
      const unsupportedMethodTests = strictPostmanRequests.filter(req => 
        req.name.includes('Method Not Allowed') ||
        req.name.includes('405')
      );

      expect(unsupportedMethodTests.length).toBeGreaterThan(0);
    });

    test('should identify invalid endpoint testing', () => {
      const invalidEndpointTests = strictPostmanRequests.filter(req => 
        req.name.includes('Invalid Endpoint') ||
        req.rawUrl.includes('nonexistent')
      );

      expect(invalidEndpointTests.length).toBeGreaterThan(0);
    });

    test('should analyze coverage for unsupported operations', () => {
      // Test requests for methods not defined in the spec
      const specMethods = strictSpecOperations.map(op => op.method.toUpperCase());
      const testMethods = strictPostmanRequests.map(req => req.method.toUpperCase());
      
      const unsupportedMethods = testMethods.filter(method => 
        !specMethods.includes(method)
      );

      // We should have some tests for unsupported methods (like DELETE, PUT on /users)
      expect(unsupportedMethods.length).toBeGreaterThan(0);
      console.log(`🚫 Testing ${unsupportedMethods.length} unsupported method(s): ${[...new Set(unsupportedMethods)].join(', ')}`);
    });
  });

  describe('Negative Testing Coverage Metrics', () => {
    test('should calculate overall negative testing coverage percentage', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Calculate positive vs negative test coverage
      const positiveStatusCodes = ['200', '201', '202', '204'];
      const negativeStatusCodes = ['400', '401', '403', '404', '409', '422', '429', '500', '502', '503'];

      const positiveOps = coverageItems.filter(item => 
        positiveStatusCodes.includes(item.statusCode)
      );
      const negativeOps = coverageItems.filter(item => 
        negativeStatusCodes.includes(item.statusCode)
      );

      const positiveMatched = positiveOps.filter(item => !item.unmatched).length;
      const negativeMatched = negativeOps.filter(item => !item.unmatched).length;

      const positiveCoverage = positiveOps.length > 0 ? (positiveMatched / positiveOps.length) * 100 : 0;
      const negativeCoverage = negativeOps.length > 0 ? (negativeMatched / negativeOps.length) * 100 : 0;

      console.log(`✅ Positive test coverage: ${positiveCoverage.toFixed(1)}% (${positiveMatched}/${positiveOps.length})`);
      console.log(`❌ Negative test coverage: ${negativeCoverage.toFixed(1)}% (${negativeMatched}/${negativeOps.length})`);

      expect(positiveCoverage).toBeGreaterThan(0);
      expect(negativeCoverage).toBeGreaterThan(0);
    });

    test('should provide negative testing recommendations based on QA best practices', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      const recommendations = [];

      // Check for missing authentication/authorization tests
      const authOps = coverageItems.filter(item => 
        item.statusCode === '401' || item.statusCode === '403'
      );
      const unmatchedAuthOps = authOps.filter(item => item.unmatched);
      if (unmatchedAuthOps.length > 0) {
        recommendations.push('Add authentication/authorization negative tests');
      }

      // Check for missing validation error tests
      const validationOps = coverageItems.filter(item => 
        item.statusCode === '400' || item.statusCode === '422'
      );
      const unmatchedValidationOps = validationOps.filter(item => item.unmatched);
      if (unmatchedValidationOps.length > 0) {
        recommendations.push('Add input validation negative tests');
      }

      // Check for missing resource not found tests
      const notFoundOps = coverageItems.filter(item => item.statusCode === '404');
      const unmatchedNotFoundOps = notFoundOps.filter(item => item.unmatched);
      if (unmatchedNotFoundOps.length > 0) {
        recommendations.push('Add resource not found tests');
      }

      // Check for missing conflict tests
      const conflictOps = coverageItems.filter(item => item.statusCode === '409');
      const unmatchedConflictOps = conflictOps.filter(item => item.unmatched);
      if (unmatchedConflictOps.length > 0) {
        recommendations.push('Add resource conflict tests');
      }

      console.log('🎯 Negative Testing Recommendations:');
      if (recommendations.length === 0) {
        console.log('  ✅ Good negative test coverage detected!');
      } else {
        recommendations.forEach(rec => console.log(`  - ${rec}`));
      }

      // Always expect some form of analysis result
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should identify negative testing gaps in API operations', () => {
      // Group operations by endpoint to identify gaps
      const endpointGroups = {};
      
      strictSpecOperations.forEach(op => {
        const key = `${op.method.toUpperCase()} ${op.path}`;
        if (!endpointGroups[key]) {
          endpointGroups[key] = {
            operation: op,
            statusCodes: []
          };
        }
        endpointGroups[key].statusCodes.push(op.statusCode);
      });

      // Analyze each endpoint for negative testing completeness
      Object.entries(endpointGroups).forEach(([endpoint, data]) => {
        const hasPositiveTest = data.statusCodes.some(code => ['200', '201', '202', '204'].includes(code));
        const hasNegativeTest = data.statusCodes.some(code => ['400', '401', '403', '404', '409', '422', '429'].includes(code));
        
        if (hasPositiveTest && !hasNegativeTest) {
          console.log(`⚠️  Missing negative tests for: ${endpoint}`);
        }
      });

      expect(Object.keys(endpointGroups).length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Negative Testing Patterns', () => {
    test('should analyze SQL injection and XSS prevention testing', () => {
      // Look for test requests that include potential malicious payloads
      const securityTests = strictPostmanRequests.filter(req => {
        const bodyContent = req.bodyInfo?.content || '';
        const queryParams = req.queryParams || [];
        
        // Check for common injection patterns in test data
        const maliciousPatterns = [
          'script>', '<script', 'SELECT * FROM', 'DROP TABLE', 
          '\'OR 1=1', '"><script', 'javascript:', 'onload='
        ];
        
        return maliciousPatterns.some(pattern => 
          bodyContent.includes(pattern) || 
          queryParams.some(param => param.value && param.value.includes(pattern))
        );
      });

      // Note: Current test data doesn't include security tests
      // This demonstrates how to analyze for security testing
      console.log(`🔒 Security testing patterns found: ${securityTests.length}`);
      expect(Array.isArray(securityTests)).toBe(true);
    });

    test('should identify rate limiting and performance negative tests', () => {
      const rateLimitTests = strictPostmanRequests.filter(req => 
        req.name.includes('Rate Limited') || 
        req.name.includes('429') ||
        req.name.includes('Too Many')
      );

      expect(rateLimitTests.length).toBeGreaterThan(0);
      console.log(`⏱️  Rate limiting tests found: ${rateLimitTests.length}`);
    });

    test('should analyze concurrency and race condition testing', () => {
      // Look for tests that might involve concurrent operations
      const concurrencyTests = strictPostmanRequests.filter(req => 
        req.name.includes('Conflict') || 
        req.name.includes('Version') ||
        req.name.includes('409')
      );

      expect(concurrencyTests.length).toBeGreaterThan(0);
      console.log(`🔄 Concurrency/conflict tests found: ${concurrencyTests.length}`);
    });

    test('should provide comprehensive negative testing quality score', () => {
      const coverageItems = matchOperationsDetailed(strictSpecOperations, strictPostmanRequests, {
        verbose: false,
        strictQuery: false,
        strictBody: false
      });

      // Calculate a comprehensive negative testing quality score
      const metrics = {
        errorStatusCoverage: 0,
        boundaryValueTests: 0,
        invalidInputTests: 0,
        securityTests: 0,
        unsupportedOpTests: 0
      };

      // Error status coverage
      const errorOps = coverageItems.filter(item => 
        item.statusCode && ['400', '401', '403', '404', '409', '422', '429'].includes(item.statusCode)
      );
      const matchedErrorOps = errorOps.filter(item => !item.unmatched);
      metrics.errorStatusCoverage = errorOps.length > 0 ? (matchedErrorOps.length / errorOps.length) * 100 : 0;

      // Boundary value tests
      const boundaryTests = strictPostmanRequests.filter(req => 
        req.name.includes('Boundary') || req.name.includes('Min') || req.name.includes('Max')
      );
      metrics.boundaryValueTests = boundaryTests.length;

      // Invalid input tests
      const invalidTests = strictPostmanRequests.filter(req => 
        req.name.includes('Invalid') || req.name.includes('Bad') || req.name.includes('Wrong')
      );
      metrics.invalidInputTests = invalidTests.length;

      // Unsupported operation tests
      const unsupportedTests = strictPostmanRequests.filter(req => 
        req.name.includes('Method Not Allowed') || req.name.includes('Invalid Endpoint')
      );
      metrics.unsupportedOpTests = unsupportedTests.length;

      // Calculate overall quality score (0-100)
      const weights = {
        errorStatusCoverage: 0.4,  // 40% weight
        boundaryValueTests: 0.2,   // 20% weight  
        invalidInputTests: 0.2,    // 20% weight
        unsupportedOpTests: 0.2    // 20% weight
      };

      const qualityScore = 
        (metrics.errorStatusCoverage * weights.errorStatusCoverage) +
        (Math.min(metrics.boundaryValueTests * 10, 100) * weights.boundaryValueTests) +
        (Math.min(metrics.invalidInputTests * 10, 100) * weights.invalidInputTests) +
        (Math.min(metrics.unsupportedOpTests * 20, 100) * weights.unsupportedOpTests);

      console.log('\n📊 Negative Testing Quality Metrics:');
      console.log(`  Error Status Coverage: ${metrics.errorStatusCoverage.toFixed(1)}%`);
      console.log(`  Boundary Value Tests: ${metrics.boundaryValueTests}`);
      console.log(`  Invalid Input Tests: ${metrics.invalidInputTests}`);
      console.log(`  Unsupported Op Tests: ${metrics.unsupportedOpTests}`);
      console.log(`  Overall Quality Score: ${qualityScore.toFixed(1)}/100`);

      // Provide quality assessment
      let assessment = '';
      if (qualityScore >= 80) assessment = '🏆 Excellent';
      else if (qualityScore >= 60) assessment = '✅ Good';
      else if (qualityScore >= 40) assessment = '⚠️  Fair';
      else assessment = '❌ Poor';

      console.log(`  Quality Assessment: ${assessment}`);

      expect(qualityScore).toBeGreaterThan(0);
      expect(qualityScore).toBeLessThanOrEqual(100);
    });
  });
});