const { generateHtmlReport } = require('../lib/report');

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
});