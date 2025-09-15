const { loadNewmanReport, extractRequestsFromNewman } = require('../lib/newman');
const fs = require('fs');
const path = require('path');

describe('Newman Module', () => {
  beforeAll(() => {
    const fixturesDir = path.resolve(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir);
    }
  });

  test('loadNewmanReport should throw error if file does not exist', () => {
    expect(() => loadNewmanReport('nonexistent.json')).toThrow('Newman report file not found');
  });

  test('loadNewmanReport should parse Newman report correctly', () => {
    const reportPath = path.resolve(__dirname, 'fixtures', 'newman-report.json');
    const reportData = {
      collection: { info: { name: 'Test Collection' } },
      run: {
        executions: []
      }
    };
    fs.writeFileSync(reportPath, JSON.stringify(reportData));
    const report = loadNewmanReport(reportPath);
    expect(report.collection.info.name).toBe('Test Collection');
    fs.unlinkSync(reportPath);
  });

  test('loadNewmanReport should throw error for invalid JSON', () => {
    const reportPath = path.resolve(__dirname, 'fixtures', 'invalid-newman.json');
    fs.writeFileSync(reportPath, '{ invalid json }');
    expect(() => loadNewmanReport(reportPath)).toThrow('Unexpected token in JSON');
    fs.unlinkSync(reportPath);
  });

  test('loadNewmanReport should throw error for incorrect format', () => {
    const reportPath = path.resolve(__dirname, 'fixtures', 'wrong-format.json');
    fs.writeFileSync(reportPath, JSON.stringify({ invalid: 'format' }));
    expect(() => loadNewmanReport(reportPath)).toThrow('Incorrect Newman report format');
    fs.unlinkSync(reportPath);
  });

  test('extractRequestsFromNewman should extract requests with execution data', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Get Users',
              id: 'abc123'
            },
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users',
                host: ['api', 'example', 'com'],
                path: ['users']
              }
            },
            response: {
              code: 200,
              status: 'OK',
              responseTime: 45
            },
            assertions: [
              {
                assertion: 'Status code is 200',
                error: null
              }
            ]
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].name).toBe('Get Users');
    expect(requests[0].method).toBe('get');
    expect(requests[0].rawUrl).toBe('https://api.example.com/users');
    expect(requests[0].executed).toBe(true);
    expect(requests[0].responseCode).toBe(200);
    expect(requests[0].testedStatusCodes).toEqual(['200']);
    expect(requests[0].assertions.length).toBe(1);
    expect(requests[0].assertions[0].passed).toBe(true);
  });

  test('extractRequestsFromNewman should handle requests with body and query params', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Create User'
            },
            request: {
              method: 'POST',
              url: {
                raw: 'https://api.example.com/users?test=1',
                query: [{ key: 'test', value: '1' }]
              },
              body: {
                mode: 'raw',
                raw: '{"name": "John"}'
              }
            },
            response: {
              code: 201,
              status: 'Created'
            },
            assertions: []
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].queryParams).toEqual([{ key: 'test', value: '1' }]);
    expect(requests[0].bodyInfo.mode).toBe('raw');
    expect(requests[0].bodyInfo.content).toBe('{"name": "John"}');
    expect(requests[0].testedStatusCodes).toEqual(['201']);
  });

  test('extractRequestsFromNewman should handle failed assertions', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Get Users'
            },
            request: {
              method: 'GET',
              url: 'https://api.example.com/users'
            },
            response: {
              code: 500,
              status: 'Internal Server Error'
            },
            assertions: [
              {
                assertion: 'Status code is 200',
                error: {
                  name: 'AssertionError',
                  message: 'expected response to have status code 200 but got 500'
                }
              }
            ]
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].assertions[0].passed).toBe(false);
    expect(requests[0].assertions[0].error).toBeDefined();
    expect(requests[0].testedStatusCodes).toEqual(['500']);
  });
});