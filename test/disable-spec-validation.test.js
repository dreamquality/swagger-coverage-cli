const { loadAndParseSpec } = require('../lib/swagger');
const fs = require('fs');
const path = require('path');

describe('Disable Spec Validation Feature', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  let invalidSpecPath;

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
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(invalidSpecPath)) {
      fs.unlinkSync(invalidSpecPath);
    }
  });

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
