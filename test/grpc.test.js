const { loadAndParseProto, extractOperationsFromProto } = require('../lib/grpc');
const fs = require('fs');
const path = require('path');

describe('gRPC Module', () => {
  test('loadAndParseProto should throw error if file does not exist', () => {
    expect(() => loadAndParseProto('nonexistent.proto')).toThrow('Proto file not found');
  });

  test('loadAndParseProto should parse proto file correctly', () => {
    const protoPath = path.resolve(__dirname, 'fixtures', 'user-service.proto');
    const proto = loadAndParseProto(protoPath);
    
    expect(proto).toBeDefined();
    expect(proto.package).toBe('user.v1');
    expect(proto.services).toHaveLength(1);
    expect(proto.services[0].name).toBe('UserService');
    expect(proto.services[0].methods).toHaveLength(5);
  });

  test('extractOperationsFromProto should create operations from proto', () => {
    const protoPath = path.resolve(__dirname, 'fixtures', 'user-service.proto');
    const proto = loadAndParseProto(protoPath);
    const operations = extractOperationsFromProto(proto);
    
    expect(operations).toHaveLength(5);
    
    // Check first operation
    const getUser = operations.find(op => op.methodName === 'GetUser');
    expect(getUser).toBeDefined();
    expect(getUser.method).toBe('POST');
    expect(getUser.protocol).toBe('grpc');
    expect(getUser.serviceName).toBe('UserService');
    expect(getUser.requestType).toBe('GetUserRequest');
    expect(getUser.responseType).toBe('GetUserResponse');
    expect(getUser.fullName).toBe('user.v1.UserService/GetUser');
    expect(getUser.tags).toContain('gRPC');
    expect(getUser.tags).toContain('UserService');
  });

  test('should handle proto file without package', () => {
    const testProtoContent = `
syntax = "proto3";

service TestService {
  rpc TestMethod(TestRequest) returns (TestResponse);
}

message TestRequest {
  string test = 1;
}

message TestResponse {
  string result = 1;
}
`;
    
    // Create temporary proto file
    const tempPath = path.resolve(__dirname, 'fixtures', 'temp-test.proto');
    fs.writeFileSync(tempPath, testProtoContent);
    
    try {
      const proto = loadAndParseProto(tempPath);
      expect(proto.package).toBe('');
      expect(proto.services).toHaveLength(1);
      expect(proto.services[0].methods[0].fullName).toBe('TestService/TestMethod');
    } finally {
      // Clean up
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  });

  test('should throw error for invalid proto file', () => {
    const invalidPath = path.resolve(__dirname, 'fixtures', 'invalid.proto');
    fs.writeFileSync(invalidPath, 'this is not a proto file');
    
    try {
      expect(() => loadAndParseProto(invalidPath)).toThrow('Invalid proto file format');
    } finally {
      // Clean up
      if (fs.existsSync(invalidPath)) {
        fs.unlinkSync(invalidPath);
      }
    }
  });
});