const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const fs = require('fs');
const path = require('path');

describe('Postman Module', () => {
  test('loadPostmanCollection should throw error if file does not exist', () => {
    expect(() => loadPostmanCollection('nonexistent.json')).toThrow('Postman collection file not found');
  });

  test('loadPostmanCollection should parse Postman collection correctly', () => {
    const collectionPath = path.resolve(__dirname, 'fixtures', 'valid.json');
    const collectionData = {
      info: { name: 'Test Collection' },
      item: []
    };
    fs.writeFileSync(collectionPath, JSON.stringify(collectionData));
    const collection = loadPostmanCollection(collectionPath);
    expect(collection.info.name).toBe('Test Collection');
    fs.unlinkSync(collectionPath);
  });

  test('extractRequestsFromPostman should extract requests', () => {
    const collection = {
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          },
          event: []
        }
      ]
    };
    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].name).toBe('Test Request');
    expect(requests[0].method).toBe('get');
  });

  test('extractRequestsFromPostman should extract folder-level tests and apply them to all requests', () => {
    const collection = {
      item: [
        {
          name: 'API v1',
          item: [
            {
              name: 'Get User',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users/1'
              }
            },
            {
              name: 'Create User',
              request: {
                method: 'POST',
                url: 'https://api.example.com/users'
              }
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200 or 201", function () {',
                  '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(2);

    // Both requests should have the folder-level status codes
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testedStatusCodes).toContain('201');
    expect(requests[0].testScripts).toContain('pm.expect(pm.response.code).to.be.oneOf([200, 201])');

    expect(requests[1].testedStatusCodes).toContain('200');
    expect(requests[1].testedStatusCodes).toContain('201');
    expect(requests[1].testScripts).toContain('pm.expect(pm.response.code).to.be.oneOf([200, 201])');
  });

  test('extractRequestsFromPostman should combine folder-level and request-level tests', () => {
    const collection = {
      item: [
        {
          name: 'Users',
          item: [
            {
              name: 'Get User',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users/1'
              },
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: [
                      'pm.test("Status code is 200", function () {',
                      '    pm.response.to.have.status(200);',
                      '});'
                    ]
                  }
                }
              ]
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Response time is acceptable", function () {',
                  '    pm.expect(pm.response.responseTime).to.be.below(500);',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);

    // Should have status code from request-level test
    expect(requests[0].testedStatusCodes).toContain('200');

    // Should have both folder-level and request-level test scripts
    expect(requests[0].testScripts).toContain('Response time is acceptable');
    expect(requests[0].testScripts).toContain('Status code is 200');
  });

  test('extractRequestsFromPostman should handle nested folders with tests', () => {
    const collection = {
      item: [
        {
          name: 'API',
          item: [
            {
              name: 'Users',
              item: [
                {
                  name: 'Get User',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/users/1'
                  }
                }
              ],
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: [
                      'pm.test("Status code is 200", function () {',
                      '    pm.response.to.have.status(200);',
                      '});'
                    ]
                  }
                }
              ]
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Has valid JSON", function () {',
                  '    pm.response.to.be.json;',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);

    // Should have status code from nested folder test
    expect(requests[0].testedStatusCodes).toContain('200');

    // Should have both parent and nested folder test scripts
    expect(requests[0].testScripts).toContain('Has valid JSON');
    expect(requests[0].testScripts).toContain('Status code is 200');
  });

  test('extractRequestsFromPostman should handle folders without tests', () => {
    const collection = {
      item: [
        {
          name: 'Users',
          item: [
            {
              name: 'Get User',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users/1'
              },
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: [
                      'pm.test("Status code is 200", function () {',
                      '    pm.response.to.have.status(200);',
                      '});'
                    ]
                  }
                }
              ]
            }
          ]
          // No folder-level event
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testScripts).toContain('Status code is 200');
  });

  test('extractRequestsFromPostman should extract status codes with alternative oneOf pattern', () => {
    const collection = {
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.response.to.be.oneOf([200, 201, 204]);'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testedStatusCodes).toContain('201');
    expect(requests[0].testedStatusCodes).toContain('204');
  });

  test('extractRequestsFromPostman should handle multiple folders with different tests', () => {
    const collection = {
      item: [
        {
          name: 'Public API',
          item: [
            {
              name: 'Health Check',
              request: {
                method: 'GET',
                url: 'https://api.example.com/health'
              }
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.response.to.have.status(200);'
                ]
              }
            }
          ]
        },
        {
          name: 'Admin API',
          item: [
            {
              name: 'Get Settings',
              request: {
                method: 'GET',
                url: 'https://api.example.com/admin/settings'
              }
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.expect(pm.response.code).to.eql(200);',
                  'pm.test("Has authorization", function () {',
                  '    pm.response.to.have.header("Authorization");',
                  '});'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(2);

    // First request should have status code 200 from Public API folder
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testScripts).toContain('pm.response.to.have.status(200)');

    // Second request should have status code 200 from Admin API folder
    expect(requests[1].testedStatusCodes).toContain('200');
    expect(requests[1].testScripts).toContain('pm.expect(pm.response.code).to.eql(200)');
    expect(requests[1].testScripts).toContain('Has authorization');
  });

  // Edge case tests
  test('extractRequestsFromPostman should handle empty folders gracefully', () => {
    const collection = {
      item: [
        {
          name: 'Empty Folder',
          item: [],
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.response.to.have.status(200);']
              }
            }
          ]
        },
        {
          name: 'Regular Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          }
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].name).toBe('Regular Request');
  });

  test('extractRequestsFromPostman should handle folders containing only subfolders', () => {
    const collection = {
      item: [
        {
          name: 'Parent Folder',
          item: [
            {
              name: 'Child Folder',
              item: [
                {
                  name: 'Deep Request',
                  request: {
                    method: 'GET',
                    url: 'https://api.example.com/deep'
                  }
                }
              ],
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: ['pm.response.to.have.status(200);']
                  }
                }
              ]
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.expect(pm.response.code).to.eql(201);']
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testedStatusCodes).toContain('201');
  });

  test('extractRequestsFromPostman should handle requests with no event property', () => {
    const collection = {
      item: [
        {
          name: 'Folder with tests',
          item: [
            {
              name: 'Request without events',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
              // No event property at all
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.response.to.have.status(200);']
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
  });

  test('extractRequestsFromPostman should handle empty event arrays', () => {
    const collection = {
      item: [
        {
          name: 'Folder',
          item: [
            {
              name: 'Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              },
              event: [] // Empty array
            }
          ],
          event: [] // Empty array
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toEqual([]);
    expect(requests[0].testScripts).toBe('');
  });

  test('extractRequestsFromPostman should ignore non-test events', () => {
    const collection = {
      item: [
        {
          name: 'Folder',
          item: [
            {
              name: 'Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
            }
          ],
          event: [
            {
              listen: 'prerequest',
              script: {
                exec: ['console.log("This should be ignored");']
              }
            },
            {
              listen: 'test',
              script: {
                exec: ['pm.response.to.have.status(200);']
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testScripts).not.toContain('This should be ignored');
  });

  test('extractRequestsFromPostman should handle deeply nested folders (3+ levels)', () => {
    const collection = {
      item: [
        {
          name: 'Level 1',
          item: [
            {
              name: 'Level 2',
              item: [
                {
                  name: 'Level 3',
                  item: [
                    {
                      name: 'Deep Request',
                      request: {
                        method: 'GET',
                        url: 'https://api.example.com/deep'
                      }
                    }
                  ],
                  event: [
                    {
                      listen: 'test',
                      script: {
                        exec: ['pm.response.to.have.status(200);']
                      }
                    }
                  ]
                }
              ],
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: ['pm.expect(pm.response.code).to.eql(201);']
                  }
                }
              ]
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.expect(pm.response.code).to.be.oneOf([202, 204]);']
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    // Should inherit all status codes from all levels
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testedStatusCodes).toContain('201');
    expect(requests[0].testedStatusCodes).toContain('202');
    expect(requests[0].testedStatusCodes).toContain('204');
  });

  test('extractRequestsFromPostman should handle various status code assertion patterns', () => {
    const collection = {
      item: [
        {
          name: 'Test Pattern 1',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test1'
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.response.code === 200']
              }
            }
          ]
        },
        {
          name: 'Test Pattern 2',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test2'
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: ['pm.response.status === 201']
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(2);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[1].testedStatusCodes).toContain('201');
  });

  test('extractRequestsFromPostman should handle mixed test patterns in same folder', () => {
    const collection = {
      item: [
        {
          name: 'Mixed Patterns Folder',
          item: [
            {
              name: 'Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
            }
          ],
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.response.to.have.status(200);',
                  'pm.expect(pm.response.code).to.eql(201);',
                  'pm.expect(pm.response.code).to.be.oneOf([202, 203]);',
                  'pm.response.code === 204'
                ]
              }
            }
          ]
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].testedStatusCodes).toContain('200');
    expect(requests[0].testedStatusCodes).toContain('201');
    expect(requests[0].testedStatusCodes).toContain('202');
    expect(requests[0].testedStatusCodes).toContain('203');
    expect(requests[0].testedStatusCodes).toContain('204');
  });

  test('extractRequestsFromPostman should handle folders with undefined or null event properties', () => {
    const collection = {
      item: [
        {
          name: 'Folder with undefined event',
          item: [
            {
              name: 'Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
            }
          ],
          event: undefined
        },
        {
          name: 'Folder with null event',
          item: [
            {
              name: 'Request 2',
              request: {
                method: 'POST',
                url: 'https://api.example.com/test2'
              }
            }
          ],
          event: null
        }
      ]
    };

    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(2);
    expect(requests[0].testedStatusCodes).toEqual([]);
    expect(requests[1].testedStatusCodes).toEqual([]);
  });
});