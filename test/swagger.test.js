const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const fs = require('fs');
const path = require('path');

describe('Swagger Module', () => {
  test('loadAndParseSpec should throw error if file does not exist', async () => {
    await expect(loadAndParseSpec('nonexistent.yaml')).rejects.toThrow('Spec file not found');
  });

  test('loadAndParseSpec should parse YAML spec correctly', async () => {
    const specPath = path.resolve(__dirname, 'fixtures', 'valid.yaml');
    fs.writeFileSync(
      specPath,
      `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test GET endpoint
      responses:
        '200':
          description: Successful response`
    );
    const spec = await loadAndParseSpec(specPath);
    expect(spec.info.title).toBe('Test API');
    fs.unlinkSync(specPath);
  });

  test('extractOperationsFromSpec should extract operations', () => {
    const spec = {
      paths: {
        '/test': {
          get: {
            operationId: 'getTest',
            tags: ['Test'],
            responses: {
              '200': {}
            }
          }
        }
      }
    };
    const operations = extractOperationsFromSpec(spec);
    expect(operations.length).toBe(1);
    expect(operations[0].method).toBe('get');
    expect(operations[0].path).toBe('/test');
  });
});