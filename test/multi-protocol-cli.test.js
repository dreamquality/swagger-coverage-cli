// multi-protocol-cli.test.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Multi-Protocol CLI Integration', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  
  beforeEach(() => {
    // Clean up any existing reports
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }
  });

  test('should handle gRPC proto file via CLI', () => {
    const protoPath = path.resolve(fixturesDir, 'user-service.proto');
    const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
    
    const result = execSync(
      `node cli.js "${protoPath}" "${collectionPath}" --verbose`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('gRPC specification loaded successfully');
    expect(result).toContain('Extracted gRPC operations from proto: 5');
    expect(result).toContain('Coverage:');
    expect(result).toContain('HTML report saved to: coverage-report.html');
    
    // Verify HTML report was generated
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);
    
    // Check report contains protocol information
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    expect(reportContent).toContain('Protocol');
    expect(reportContent).toContain('"protocol":"grpc"'); // Check data contains protocol
  });

  test('should handle GraphQL schema file via CLI', () => {
    const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
    const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
    
    const result = execSync(
      `node cli.js "${schemaPath}" "${collectionPath}" --verbose`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('GraphQL specification loaded successfully');
    expect(result).toContain('Extracted GraphQL operations from schema: 10');
    expect(result).toContain('Coverage:');
    expect(result).toContain('HTML report saved to: coverage-report.html');
    
    // Verify HTML report was generated
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);
    
    // Check report contains protocol information
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    expect(reportContent).toContain('Protocol');
    expect(reportContent).toContain('"protocol":"graphql"');
  });

  test('should handle mixed protocol APIs via CLI', () => {
    const openApiPath = path.resolve(fixturesDir, 'sample-api.yaml');
    const protoPath = path.resolve(fixturesDir, 'user-service.proto');
    const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
    const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
    
    const result = execSync(
      `node cli.js "${openApiPath},${protoPath},${schemaPath}" "${collectionPath}" --verbose`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('OpenAPI specification loaded successfully');
    expect(result).toContain('gRPC specification loaded successfully');
    expect(result).toContain('GraphQL specification loaded successfully');
    expect(result).toContain('APIs analyzed:');
    expect(result).toContain('Total operations in spec(s): 33');
    expect(result).toContain('Coverage:');
    
    // Verify HTML report was generated
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);
    
    // Check report contains all protocol information
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    expect(reportContent).toContain('Protocol');
    expect(reportContent).toContain('"protocol":"rest"');
    expect(reportContent).toContain('"protocol":"grpc"');
    expect(reportContent).toContain('"protocol":"graphql"');
  });

  test('should handle verbose output for all protocols', () => {
    const protoPath = path.resolve(fixturesDir, 'user-service.proto');
    const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
    
    const result = execSync(
      `node cli.js "${protoPath}" "${collectionPath}" --verbose`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('Extracted gRPC operations from proto: 5');
    expect(result).toContain('gRPC specification loaded successfully');
    expect(result).toContain('Operations mapped:');
    expect(result).toContain('Smart mapping:');
  });

  test('should maintain backward compatibility with OpenAPI files', () => {
    const openApiPath = path.resolve(fixturesDir, 'sample-api.yaml');
    const collectionPath = path.resolve(fixturesDir, 'test-collection.json');
    
    const result = execSync(
      `node cli.js "${openApiPath}" "${collectionPath}" --verbose`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('OpenAPI specification loaded successfully');
    expect(result).toContain('Coverage:');
    expect(result).toContain('HTML report saved to: coverage-report.html');
    
    // Verify the report contains REST protocol
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);
    
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    expect(reportContent).toContain('Protocol');
    expect(reportContent).toContain('"protocol":"rest"');
  });

  test('should show correct protocol identification in unmatched operations', () => {
    const protoPath = path.resolve(fixturesDir, 'user-service.proto');
    const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
    const collectionPath = path.resolve(fixturesDir, 'test-collection.json'); // Collection that doesn't match gRPC/GraphQL
    
    const result = execSync(
      `node cli.js "${protoPath},${schemaPath}" "${collectionPath}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain('Unmatched Spec operations:');
    expect(result).toContain('[POST] /user.v1.UserService/'); // gRPC operations
    expect(result).toContain('[POST] /graphql'); // GraphQL operations
  });

  test('should handle custom output file with protocol support', () => {
    const protoPath = path.resolve(fixturesDir, 'user-service.proto');
    const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
    const customOutput = 'grpc-test-report.html';
    
    const result = execSync(
      `node cli.js "${protoPath}" "${collectionPath}" --output "${customOutput}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    
    expect(result).toContain(`HTML report saved to: ${customOutput}`);
    
    // Verify custom output file was created
    const reportPath = path.resolve(process.cwd(), customOutput);
    expect(fs.existsSync(reportPath)).toBe(true);
    
    // Clean up custom file
    fs.unlinkSync(reportPath);
  });

  afterEach(() => {
    // Clean up test reports
    const reportPath = path.resolve(process.cwd(), 'coverage-report.html');
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }
  });
});