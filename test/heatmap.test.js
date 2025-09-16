const { generateHeatmapReport } = require('../lib/report');

describe('Heatmap Report Module', () => {
  test('generateHeatmapReport should return HTML string', () => {
    const input = {
      coverage: 75,
      coverageItems: [
        {
          method: 'GET',
          path: '/users',
          name: 'getUsers',
          unmatched: false,
          matchedRequests: [
            { name: 'Get Users Test' }
          ]
        },
        {
          method: 'POST',
          path: '/users',
          name: 'createUser',
          unmatched: true,
          matchedRequests: []
        },
        {
          method: 'GET',
          path: '/users/{id}',
          name: 'getUserById',
          unmatched: false,
          matchedRequests: [
            { name: 'Get User By ID Test' }
          ]
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

    const html = generateHeatmapReport(input);
    
    expect(typeof html).toBe('string');
    expect(html).toContain('<html');
    expect(html).toContain('API Coverage Heatmap');
    expect(html).toContain('Test API');
    expect(html).toContain('Test Collection');
    expect(html).toContain('75.00%');
  });

  test('generateHeatmapReport should include coverage matrix', () => {
    const input = {
      coverage: 50,
      coverageItems: [
        {
          method: 'GET',
          path: '/users',
          name: 'getUsers',
          unmatched: false,
          matchedRequests: [{ name: 'Test' }]
        },
        {
          method: 'POST',
          path: '/users',
          name: 'createUser',
          unmatched: true,
          matchedRequests: []
        }
      ],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Test API',
        postmanCollectionName: 'Test Collection'
      }
    };

    const html = generateHeatmapReport(input);
    
    expect(html).toContain('API Coverage Matrix');
    expect(html).toContain('Endpoint Details');
    expect(html).toContain('GET');
    expect(html).toContain('POST');
    expect(html).toContain('/users');
    expect(html).toContain('Covered');
    expect(html).toContain('Not Covered');
  });

  test('generateHeatmapReport should include statistics', () => {
    const input = {
      coverage: 33.33,
      coverageItems: [
        {
          method: 'GET',
          path: '/users',
          name: 'getUsers',
          unmatched: false,
          matchedRequests: [{ name: 'Test' }]
        },
        {
          method: 'POST',
          path: '/users',
          name: 'createUser',
          unmatched: true,
          matchedRequests: []
        },
        {
          method: 'DELETE',
          path: '/users/{id}',
          name: 'deleteUser',
          unmatched: true,
          matchedRequests: []
        }
      ],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Test API',
        postmanCollectionName: 'Test Collection'
      }
    };

    const html = generateHeatmapReport(input);
    
    // Should show total endpoints
    expect(html).toContain('3'); // Total endpoints
    expect(html).toContain('1'); // Covered endpoints  
    expect(html).toContain('2'); // Unique paths (/users and /users/{id})
    expect(html).toContain('33.3%'); // Coverage percentage
  });

  test('generateHeatmapReport should handle empty coverage items', () => {
    const input = {
      coverage: 0,
      coverageItems: [],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Empty API',
        postmanCollectionName: 'Empty Collection'
      }
    };

    const html = generateHeatmapReport(input);
    
    expect(html).toContain('API Coverage Heatmap');
    expect(html).toContain('Empty API');
    expect(html).toContain('0'); // Total endpoints
    expect(html).toContain('0.0%'); // Coverage
  });

  test('generateHeatmapReport should include interactive features', () => {
    const input = {
      coverage: 50,
      coverageItems: [
        {
          method: 'GET',
          path: '/test',
          name: 'test',
          unmatched: false,
          matchedRequests: [{ name: 'Test' }]
        }
      ],
      meta: {
        timestamp: '2023-10-10 10:00:00',
        specName: 'Test API',
        postmanCollectionName: 'Test Collection'
      }
    };

    const html = generateHeatmapReport(input);
    
    expect(html).toContain('Toggle Theme');
    expect(html).toContain('Reset View');
    expect(html).toContain('showCellDetails');
    expect(html).toContain('toggleTheme');
    expect(html).toContain('onclick=');
  });
});