const { generateHtmlReport, generateGraphHtmlReport } = require('../lib/report');

describe('Report Module', () => {
  test('generateHtmlReport should return HTML string', () => {
    const input = {
      coverage: 100,
      coverageItems: [],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Test API',
        postmanCollectionName: 'Test Collection'
      }
    };
    const html = generateHtmlReport(input);
    expect(typeof html).toBe('string');
    expect(html).toContain('<html');
    expect(html).toContain('Swagger Coverage Report');
  });

  test('generateGraphHtmlReport should return HTML string with graph visualization', () => {
    const input = {
      coverage: 75,
      coverageItems: [
        {
          method: 'GET',
          path: '/users',
          name: 'getUsers',
          unmatched: false,
          matchedRequests: [{ name: 'Get Users Test' }],
          tags: ['users']
        },
        {
          method: 'POST',
          path: '/users',
          name: 'createUser',
          unmatched: true,
          matchedRequests: [],
          tags: ['users']
        }
      ],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Test API',
        postmanCollectionName: 'Test Collection',
        apiCount: 1,
        apiNames: ['Test API']
      }
    };
    const html = generateGraphHtmlReport(input);
    expect(typeof html).toBe('string');
    expect(html).toContain('<html');
    expect(html).toContain('API Coverage Tree Report');
    expect(html).toContain('renderTree');
    expect(html).toContain('Coverage Status');
    expect(html).toContain('75.00%');
  });
});