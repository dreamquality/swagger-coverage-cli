const { matchOperationsDetailed } = require('../lib/match');
const fs = require('fs');
const path = require('path');

describe('Match Module', () => {
  beforeAll(() => {
    const fixturesDir = path.resolve(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir);
    }
  });

  test('matchOperationsDetailed should match operations correctly', () => {
    const specOps = [
      {
        method: 'get',
        path: '/test',
        operationId: 'getTest',
        tags: ['Test'],
        expectedStatusCodes: ['200']
      }
    ];
    const postmanReqs = [
      {
        method: 'get',
        rawUrl: 'https://api.example.com/test',
        testedStatusCodes: ['200'],
        queryParams: [],
        bodyInfo: null,
        testScripts: ''
      }
    ];
    const coverageItems = matchOperationsDetailed(specOps, postmanReqs, { verbose: false, strictQuery: false, strictBody: false });
    expect(coverageItems.length).toBe(1);
    expect(coverageItems[0].unmatched).toBe(false);
    expect(coverageItems[0].matchedRequests.length).toBe(1);
    expect(coverageItems[0].matchedRequests[0].method).toBe('GET');
  });

  test('matchOperationsDetailed should mark unmatched operations', () => {
    const specOps = [
      {
        method: 'post',
        path: '/test',
        operationId: 'createTest',
        tags: ['Test'],
        expectedStatusCodes: ['201']
      }
    ];
    const postmanReqs = [];
    const coverageItems = matchOperationsDetailed(specOps, postmanReqs, { verbose: false, strictQuery: false, strictBody: false });
    expect(coverageItems.length).toBe(1);
    expect(coverageItems[0].unmatched).toBe(true);
    expect(coverageItems[0].matchedRequests.length).toBe(0);
  });
});