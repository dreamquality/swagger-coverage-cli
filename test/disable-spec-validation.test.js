const { loadAndParseSpec, extractOperationsFromSpec } = require('../lib/swagger');
const fs = require('fs');
const path = require('path');

describe('Disable Spec Validation Feature', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  let invalidSpecPath;
  let invalidJsonSpecPath;
  let circularRefSpecPath;
  let missingInfoSpecPath;

  beforeAll(() => {
    // Ensure fixtures directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir);
    }

    // Create an invalid spec with broken references
    invalidSpecPath = path.resolve(fixturesDir, 'invalid-refs-spec.yaml');
    const invalidSpec = `openapi: 3.0.0
info:
  title: Invalid Refs API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NonExistentSchema'
    post:
      summary: Create user
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnotherMissingSchema'
      responses:
        '201':
          description: Created
  /products:
    get:
      summary: Get products
      responses:
        '200':
          description: Success
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
`;
    fs.writeFileSync(invalidSpecPath, invalidSpec);

    // Create an invalid JSON spec with broken references
    invalidJsonSpecPath = path.resolve(fixturesDir, 'invalid-refs-spec.json');
    const invalidJsonSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Invalid JSON Refs API',
        version: '1.0.0'
      },
      paths: {
        '/orders': {
          get: {
            summary: 'Get orders',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/NonExistentOrder'
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    fs.writeFileSync(invalidJsonSpecPath, JSON.stringify(invalidJsonSpec, null, 2));

    // Create a spec with circular references
    circularRefSpecPath = path.resolve(fixturesDir, 'circular-ref-spec.yaml');
    const circularRefSpec = `openapi: 3.0.0
info:
  title: Circular Refs API
  version: 1.0.0
paths:
  /nodes:
    get:
      summary: Get nodes
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'
components:
  schemas:
    Node:
      type: object
      properties:
        id:
          type: string
        children:
          type: array
          items:
            $ref: '#/components/schemas/Node'
`;
    fs.writeFileSync(circularRefSpecPath, circularRefSpec);

    // Create a spec missing required info
    missingInfoSpecPath = path.resolve(fixturesDir, 'missing-info-spec.yaml');
    const missingInfoSpec = `openapi: 3.0.0
paths:
  /test:
    get:
      summary: Test
      responses:
        '200':
          description: OK
`;
    fs.writeFileSync(missingInfoSpecPath, missingInfoSpec);
  });

  afterAll(() => {
    // Clean up test files
    const testFiles = [invalidSpecPath, invalidJsonSpecPath, circularRefSpecPath, missingInfoSpecPath];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Basic functionality', () => {
    test('should throw error when loading invalid spec with validation enabled (default)', async () => {
      await expect(loadAndParseSpec(invalidSpecPath))
        .rejects
        .toThrow();
    });

    test('should successfully load invalid spec when validation is disabled', async () => {
      const spec = await loadAndParseSpec(invalidSpecPath, { disableValidation: true });
      
      // Verify that the spec was loaded
      expect(spec).toBeDefined();
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('Invalid Refs API');
      expect(spec.paths).toBeDefined();
      expect(spec.paths['/users']).toBeDefined();
      expect(spec.paths['/products']).toBeDefined();
    });

    test('should still work correctly with valid specs when validation is disabled', async () => {
      const validSpecPath = path.resolve(fixturesDir, 'valid-spec-test.yaml');
      const validSpec = `openapi: 3.0.0
info:
  title: Valid API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
      responses:
        '200':
          description: Success
`;
      fs.writeFileSync(validSpecPath, validSpec);

      const spec = await loadAndParseSpec(validSpecPath, { disableValidation: true });
      
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Valid API');
      expect(spec.paths['/test']).toBeDefined();

      // Clean up
      fs.unlinkSync(validSpecPath);
    });
  });

  describe('JSON spec format', () => {
    test('should handle invalid JSON specs when validation is disabled', async () => {
      const spec = await loadAndParseSpec(invalidJsonSpecPath, { disableValidation: true });
      
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Invalid JSON Refs API');
      expect(spec.paths['/orders']).toBeDefined();
    });

    test('should throw error for invalid JSON specs with validation enabled', async () => {
      await expect(loadAndParseSpec(invalidJsonSpecPath))
        .rejects
        .toThrow();
    });
  });

  describe('Edge cases', () => {
    test('should handle circular references when validation is disabled', async () => {
      const spec = await loadAndParseSpec(circularRefSpecPath, { disableValidation: true });
      
      expect(spec).toBeDefined();
      expect(spec.info.title).toBe('Circular Refs API');
      expect(spec.paths['/nodes']).toBeDefined();
    });

    test('should handle specs with missing required fields when validation is disabled', async () => {
      const spec = await loadAndParseSpec(missingInfoSpecPath, { disableValidation: true });
      
      expect(spec).toBeDefined();
      expect(spec.paths['/test']).toBeDefined();
    });

    test('should allow extractOperationsFromSpec to work with disabled validation', async () => {
      const spec = await loadAndParseSpec(invalidSpecPath, { disableValidation: true });
      const operations = extractOperationsFromSpec(spec, false);
      
      expect(operations).toBeDefined();
      expect(operations.length).toBeGreaterThan(0);
      expect(operations.some(op => op.path === '/users')).toBe(true);
      expect(operations.some(op => op.path === '/products')).toBe(true);
    });
  });

  describe('Options parameter handling', () => {
    test('should handle empty options object', async () => {
      const validSpecPath = path.resolve(fixturesDir, 'temp-valid-spec.yaml');
      const validSpec = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
`;
      fs.writeFileSync(validSpecPath, validSpec);

      const spec = await loadAndParseSpec(validSpecPath, {});
      expect(spec).toBeDefined();

      fs.unlinkSync(validSpecPath);
    });

    test('should handle undefined options parameter', async () => {
      const validSpecPath = path.resolve(fixturesDir, 'temp-valid-spec2.yaml');
      const validSpec = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
`;
      fs.writeFileSync(validSpecPath, validSpec);

      const spec = await loadAndParseSpec(validSpecPath, undefined);
      expect(spec).toBeDefined();

      fs.unlinkSync(validSpecPath);
    });

    test('should handle null disableValidation value as false', async () => {
      const validSpecPath = path.resolve(fixturesDir, 'temp-valid-spec3.yaml');
      const validSpec = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
`;
      fs.writeFileSync(validSpecPath, validSpec);

      const spec = await loadAndParseSpec(validSpecPath, { disableValidation: null });
      expect(spec).toBeDefined();

      fs.unlinkSync(validSpecPath);
    });
  });
});
