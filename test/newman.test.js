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

  test('extractRequestsFromNewman should handle empty executions array', () => {
    const report = {
      run: {
        executions: []
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(0);
  });

  test('extractRequestsFromNewman should handle executions with missing response data', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Failed Request',
              id: 'failed-123'
            },
            request: {
              method: 'GET',
              url: 'https://api.example.com/timeout'
            },
            // No response field (request failed/timeout)
            assertions: []
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].name).toBe('Failed Request');
    expect(requests[0].responseCode).toBeUndefined();
    expect(requests[0].responseStatus).toBeUndefined();
    expect(requests[0].testedStatusCodes).toEqual([]);
    expect(requests[0].executed).toBe(true); // Still marked as executed even if failed
  });

  test('extractRequestsFromNewman should handle multiple iterations of same request', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Get User',
              id: 'user-request'
            },
            request: {
              method: 'GET',
              url: 'https://api.example.com/users/1'
            },
            response: {
              code: 200,
              status: 'OK',
              responseTime: 150
            },
            assertions: [
              {
                assertion: 'Status code is 200',
                error: null
              }
            ]
          },
          {
            item: {
              name: 'Get User',
              id: 'user-request'
            },
            request: {
              method: 'GET',
              url: 'https://api.example.com/users/2'
            },
            response: {
              code: 404,
              status: 'Not Found',
              responseTime: 89
            },
            assertions: [
              {
                assertion: 'Status code is 200',
                error: {
                  name: 'AssertionError',
                  message: 'expected 404 to equal 200'
                }
              }
            ]
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(2);
    expect(requests[0].name).toBe('Get User');
    expect(requests[1].name).toBe('Get User');
    expect(requests[0].responseCode).toBe(200);
    expect(requests[1].responseCode).toBe(404);
    expect(requests[0].assertions[0].passed).toBe(true);
    expect(requests[1].assertions[0].passed).toBe(false);
  });

  test('extractRequestsFromNewman should handle requests with environment variables in URL', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Environment Variable Request'
            },
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/users/{{userId}}',
                host: ['{{baseUrl}}'],
                path: ['users', '{{userId}}']
              }
            },
            response: {
              code: 200,
              status: 'OK'
            },
            assertions: []
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].rawUrl).toBe('{{baseUrl}}/users/{{userId}}');
    expect(requests[0].method).toBe('get');
  });

  test('extractRequestsFromNewman should handle complex request body structures', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Complex POST Request'
            },
            request: {
              method: 'POST',
              url: 'https://api.example.com/users',
              body: {
                mode: 'formdata',
                formdata: [
                  {
                    key: 'name',
                    value: 'John Doe',
                    type: 'text'
                  },
                  {
                    key: 'avatar',
                    src: 'path/to/file.jpg',
                    type: 'file'
                  }
                ]
              }
            },
            response: {
              code: 201,
              status: 'Created'
            },
            assertions: [
              {
                assertion: 'Response contains user ID',
                error: null
              }
            ]
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].bodyInfo.mode).toBe('formdata');
    expect(requests[0].bodyInfo.content).toEqual([
      { key: 'name', value: 'John Doe', type: 'text' },
      { key: 'avatar', src: 'path/to/file.jpg', type: 'file' }
    ]);
  });

  test('extractRequestsFromNewman should handle verbose mode output', () => {
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const report = {
      run: {
        executions: [
          {
            item: { name: 'Test Request' },
            request: { method: 'GET', url: 'https://api.example.com/test' },
            response: { code: 200 },
            assertions: []
          }
        ]
      }
    };
    
    extractRequestsFromNewman(report, true); // verbose = true
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Requests found in the Newman report: 1');
    
    console.log = originalConsoleLog;
  });

  test('extractRequestsFromNewman should handle mixed assertion results', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Mixed Assertions Request'
            },
            request: {
              method: 'POST',
              url: 'https://api.example.com/data'
            },
            response: {
              code: 200,
              status: 'OK',
              responseTime: 234
            },
            assertions: [
              {
                assertion: 'Status code is 200',
                error: null // Passed
              },
              {
                assertion: 'Response time is less than 200ms',
                error: {
                  name: 'AssertionError',
                  message: 'expected 234 to be below 200'
                }
              },
              {
                assertion: 'Response has valid JSON',
                error: null // Passed
              }
            ]
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].assertions.length).toBe(3);
    expect(requests[0].assertions[0].passed).toBe(true);
    expect(requests[0].assertions[1].passed).toBe(false);
    expect(requests[0].assertions[2].passed).toBe(true);
    expect(requests[0].testScripts).toContain('Status code is 200');
    expect(requests[0].testScripts).toContain('Response time is less than 200ms');
    expect(requests[0].testScripts).toContain('Response has valid JSON');
  });

  test('extractRequestsFromNewman should handle requests with headers', () => {
    const report = {
      run: {
        executions: [
          {
            item: {
              name: 'Request with Headers'
            },
            request: {
              method: 'PUT',
              url: 'https://api.example.com/update',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                },
                {
                  key: 'Authorization',
                  value: 'Bearer {{token}}'
                }
              ],
              body: {
                mode: 'raw',
                raw: '{"id": 123, "name": "Updated"}'
              }
            },
            response: {
              code: 200,
              status: 'OK'
            },
            assertions: []
          }
        ]
      }
    };
    
    const requests = extractRequestsFromNewman(report);
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe('put');
    expect(requests[0].bodyInfo.mode).toBe('raw');
    expect(requests[0].bodyInfo.content).toBe('{"id": 123, "name": "Updated"}');
  });
});