const { loadNewmanReport, extractRequestsFromNewman } = require('../lib/newman');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const { matchOperationsDetailed } = require('../lib/match');
const fs = require('fs');
const path = require('path');

describe('Integration Tests - Newman vs Postman', () => {
  let testApiSpec, postmanCollection, newmanReport;

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
            responses: { '201': { description: 'Created' } }
          }
        }
      }
    };

    // Create test Postman collection
    postmanCollection = {
      info: { name: 'Test Collection' },
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
                exec: ['pm.test("Status code is 200", function () {', '    pm.response.to.have.status(200);', '});']
              }
            }
          ]
        }
      ]
    };

    // Create test Newman report
    newmanReport = {
      collection: { info: { name: 'Test Collection' } },
      run: {
        executions: [
          {
            item: { name: 'Get Users' },
            request: {
              method: 'GET',
              url: { raw: 'https://api.example.com/users' }
            },
            response: { code: 200, status: 'OK' },
            assertions: [{ assertion: 'Status code is 200', error: null }]
          },
          {
            item: { name: 'Create User' },
            request: {
              method: 'POST',
              url: { raw: 'https://api.example.com/users' }
            },
            response: { code: 201, status: 'Created' },
            assertions: [{ assertion: 'Status code is 201', error: null }]
          }
        ]
      }
    };
  });

  test('Both Postman collection and Newman report should work with same API spec', () => {
    // Extract operations from spec
    const specOps = extractOperationsFromSpec(testApiSpec);
    expect(specOps.length).toBe(2);

    // Extract requests from Postman collection
    const postmanReqs = extractRequestsFromPostman(postmanCollection);
    expect(postmanReqs.length).toBe(1);

    // Extract requests from Newman report
    const newmanReqs = extractRequestsFromNewman(newmanReport);
    expect(newmanReqs.length).toBe(2);

    // Test coverage with Postman collection
    const postmanCoverage = matchOperationsDetailed(specOps, postmanReqs, {
      verbose: false, strictQuery: false, strictBody: false
    });
    const postmanMatchedCount = postmanCoverage.filter(item => !item.unmatched).length;
    const postmanCoveragePercent = (postmanMatchedCount / postmanCoverage.length) * 100;

    // Test coverage with Newman report
    const newmanCoverage = matchOperationsDetailed(specOps, newmanReqs, {
      verbose: false, strictQuery: false, strictBody: false
    });
    const newmanMatchedCount = newmanCoverage.filter(item => !item.unmatched).length;
    const newmanCoveragePercent = (newmanMatchedCount / newmanCoverage.length) * 100;

    // Newman should have better coverage since it has both requests
    expect(postmanCoveragePercent).toBe(50); // Only GET /users is covered
    expect(newmanCoveragePercent).toBe(100); // Both GET and POST /users are covered

    // Verify Newman requests have execution data
    expect(newmanReqs[0].executed).toBe(true);
    expect(newmanReqs[0].responseCode).toBe(200);
    expect(newmanReqs[1].responseCode).toBe(201);
  });

  test('Newman requests should contain more detailed execution information', () => {
    const postmanReqs = extractRequestsFromPostman(postmanCollection);
    const newmanReqs = extractRequestsFromNewman(newmanReport);

    // Postman collection requests should not have execution data
    expect(postmanReqs[0].executed).toBeUndefined();
    expect(postmanReqs[0].responseCode).toBeUndefined();
    expect(postmanReqs[0].responseTime).toBeUndefined();
    expect(postmanReqs[0].assertions).toBeUndefined();

    // Newman report requests should have execution data
    expect(newmanReqs[0].executed).toBe(true);
    expect(newmanReqs[0].responseCode).toBe(200);
    expect(newmanReqs[0].assertions).toBeDefined();
    expect(newmanReqs[0].assertions.length).toBe(1);
    expect(newmanReqs[0].assertions[0].passed).toBe(true);
  });
});