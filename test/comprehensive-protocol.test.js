// comprehensive-protocol.test.js
const { loadAndParseProto, extractOperationsFromProto } = require('../lib/grpc');
const { loadAndParseGraphQL, extractOperationsFromGraphQL } = require('../lib/graphql');
const { matchOperationsDetailed } = require('../lib/match');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Comprehensive Protocol Support Tests', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');

  describe('gRPC Advanced Features', () => {
    test('should handle streaming gRPC methods', async () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const root = await loadAndParseProto(protoPath);
      const operations = extractOperationsFromProto(root);
      
      // Check for different operation types
      expect(operations.length).toBe(5);
      
      operations.forEach(op => {
        expect(op.protocol).toBe('grpc');
        expect(op.method).toBe('post');
        expect(op.path).toMatch(/^\/user\.v1\.UserService\/.+/);
        expect(op.tags).toContain('gRPC');
        expect(op.tags).toContain('user.v1.UserService');
      });
    });

    test('should handle nested gRPC services', () => {
      // Create a more complex proto for testing
      const complexProto = `
syntax = "proto3";

package company.api.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}

service AdminService {
  rpc GetAdminUser(GetAdminUserRequest) returns (GetAdminUserResponse);
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message CreateUserResponse {
  User user = 1;
}

message GetAdminUserRequest {
  string admin_id = 1;
}

message GetAdminUserResponse {
  AdminUser admin = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message AdminUser {
  string id = 1;
  string name = 2;
  string permissions = 3;
}`;

      const tempProtoPath = path.resolve(fixturesDir, 'complex-service.proto');
      fs.writeFileSync(tempProtoPath, complexProto);

      return loadAndParseProto(tempProtoPath).then(root => {
        const operations = extractOperationsFromProto(root);
        
        expect(operations.length).toBe(3);
        
        const userServiceOps = operations.filter(op => op.grpcService === 'company.api.v1.UserService');
        const adminServiceOps = operations.filter(op => op.grpcService === 'company.api.v1.AdminService');
        
        expect(userServiceOps.length).toBe(2);
        expect(adminServiceOps.length).toBe(1);
        
        // Cleanup
        fs.unlinkSync(tempProtoPath);
      });
    });

    test('should handle gRPC error responses', async () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const root = await loadAndParseProto(protoPath);
      const operations = extractOperationsFromProto(root);
      
      operations.forEach(op => {
        expect(op.expectedStatusCodes).toContain('200');
        expect(op.expectedStatusCodes).toContain('400');
        expect(op.expectedStatusCodes).toContain('500');
      });
    });
  });

  describe('GraphQL Advanced Features', () => {
    test('should handle GraphQL field arguments', () => {
      const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const graphqlData = loadAndParseGraphQL(schemaPath);
      const operations = extractOperationsFromGraphQL(graphqlData);
      
      const userQuery = operations.find(op => op.graphqlField === 'user');
      expect(userQuery).toBeDefined();
      expect(userQuery.parameters).toHaveLength(1);
      expect(userQuery.parameters[0].name).toBe('id');
      expect(userQuery.parameters[0].required).toBe(true);
    });

    test('should categorize GraphQL operations correctly', () => {
      const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const graphqlData = loadAndParseGraphQL(schemaPath);
      const operations = extractOperationsFromGraphQL(graphqlData);
      
      const queries = operations.filter(op => op.graphqlType === 'query');
      const mutations = operations.filter(op => op.graphqlType === 'mutation');
      const subscriptions = operations.filter(op => op.graphqlType === 'subscription');
      
      expect(queries.length).toBeGreaterThan(0);
      expect(mutations.length).toBeGreaterThan(0);
      expect(subscriptions.length).toBeGreaterThan(0);
      
      // Check tags
      queries.forEach(q => expect(q.tags).toContain('Query'));
      mutations.forEach(m => expect(m.tags).toContain('Mutation'));
      subscriptions.forEach(s => expect(s.tags).toContain('Subscription'));
    });

    test('should handle complex GraphQL types', () => {
      const complexSchema = `
type Query {
  users(filter: UserFilter, pagination: PaginationInput): UserConnection!
  posts(authorId: ID): [Post!]!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserResult!
}

input UserFilter {
  name: String
  email: String
  isActive: Boolean
}

input PaginationInput {
  limit: Int = 10
  offset: Int = 0
}

input CreateUserInput {
  name: String!
  email: String!
  profile: UserProfileInput
}

input UpdateUserInput {
  name: String
  email: String
}

input UserProfileInput {
  bio: String
  website: String
}

type UserConnection {
  nodes: [User!]!
  totalCount: Int!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

union CreateUserResult = User | ValidationError
union UpdateUserResult = User | ValidationError

type ValidationError {
  message: String!
  field: String!
}`;

      const tempSchemaPath = path.resolve(fixturesDir, 'complex-schema.graphql');
      fs.writeFileSync(tempSchemaPath, complexSchema);

      const graphqlData = loadAndParseGraphQL(tempSchemaPath);
      const operations = extractOperationsFromGraphQL(graphqlData);
      
      expect(operations.length).toBe(4); // 2 queries + 2 mutations
      
      const usersQuery = operations.find(op => op.graphqlField === 'users');
      expect(usersQuery).toBeDefined();
      expect(usersQuery.parameters.length).toBe(2); // filter and pagination
      
      // Cleanup
      fs.unlinkSync(tempSchemaPath);
    });
  });

  describe('Mixed Protocol Scenarios', () => {
    test('should handle enterprise-scale mixed API portfolio', async () => {
      const openApiPath = path.resolve(fixturesDir, 'sample-api.yaml');
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const graphqlPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');

      const result = execSync(
        `node cli.js "${openApiPath},${protoPath},${graphqlPath}" "${collectionPath}" --verbose`,
        { encoding: 'utf8', cwd: process.cwd() }
      );

      expect(result).toContain('OpenAPI specification loaded successfully');
      expect(result).toContain('gRPC specification loaded successfully');
      expect(result).toContain('GraphQL specification loaded successfully');
      expect(result).toContain('APIs analyzed:');
      expect(result).toContain('Total operations in spec(s): 33');
      
      // Check protocol-specific statistics
      expect(result).toContain('Smart mapping:');
    });

    test('should generate accurate coverage statistics for mixed protocols', () => {
      const csvPath = path.resolve(fixturesDir, 'analytics-api.csv');
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const collectionPath = path.resolve(fixturesDir, 'test-collection.json');

      const result = execSync(
        `node cli.js "${csvPath},${protoPath}" "${collectionPath}"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );

      expect(result).toContain('APIs analyzed:');
      expect(result).toContain('Coverage:');
      expect(result).toContain('HTML report saved to:');
    });

    test('should maintain protocol separation in reports', () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const graphqlPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');

      execSync(
        `node cli.js "${protoPath},${graphqlPath}" "${collectionPath}" --output protocol-separation-report.html`,
        { cwd: process.cwd() }
      );

      const reportPath = path.resolve(process.cwd(), 'protocol-separation-report.html');
      expect(fs.existsSync(reportPath)).toBe(true);
      
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      expect(reportContent).toContain('"protocol":"grpc"');
      expect(reportContent).toContain('"protocol":"graphql"');
      
      // Cleanup
      fs.unlinkSync(reportPath);
    });
  });

  describe('Protocol-Specific Matching Edge Cases', () => {
    test('should handle gRPC with different content types', async () => {
      const grpcCollection = {
        info: { name: "gRPC Test Collection" },
        item: [
          {
            name: "gRPC with protobuf content type",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/grpc+proto" }],
              url: { raw: "http://api.example.com/user.v1.UserService/GetUser" },
              body: { mode: "raw", raw: '{"user_id": "123"}' }
            },
            event: [
              {
                listen: "test",
                script: { exec: ["pm.test('Status', () => pm.response.to.have.status(200));"] }
              }
            ]
          }
        ]
      };

      const tempCollectionPath = path.resolve(fixturesDir, 'grpc-content-type-collection.json');
      fs.writeFileSync(tempCollectionPath, JSON.stringify(grpcCollection, null, 2));

      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      
      const result = execSync(
        `node cli.js "${protoPath}" "${tempCollectionPath}"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );

      expect(result).toContain('Coverage:');
      
      // Cleanup
      fs.unlinkSync(tempCollectionPath);
    });

    test('should handle GraphQL with variables', () => {
      const graphqlCollection = {
        info: { name: "GraphQL Variables Test" },
        item: [
          {
            name: "GraphQL with Variables",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              url: { raw: "http://api.example.com/graphql" },
              body: {
                mode: "raw",
                raw: JSON.stringify({
                  query: "query GetUser($id: ID!) { user(id: $id) { id name email } }",
                  variables: { id: "123" }
                })
              }
            },
            event: [
              {
                listen: "test",
                script: { exec: ["pm.test('Status', () => pm.response.to.have.status(200));"] }
              }
            ]
          }
        ]
      };

      const tempCollectionPath = path.resolve(fixturesDir, 'graphql-variables-collection.json');
      fs.writeFileSync(tempCollectionPath, JSON.stringify(graphqlCollection, null, 2));

      const graphqlPath = path.resolve(fixturesDir, 'user-schema.graphql');
      
      const result = execSync(
        `node cli.js "${graphqlPath}" "${tempCollectionPath}"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );

      expect(result).toContain('Coverage:');
      
      // Cleanup
      fs.unlinkSync(tempCollectionPath);
    });

    test('should handle protocol mismatches gracefully', () => {
      // Try to use REST collection with gRPC spec
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const restCollectionPath = path.resolve(fixturesDir, 'test-collection.json');
      
      const result = execSync(
        `node cli.js "${protoPath}" "${restCollectionPath}"`,
        { encoding: 'utf8', cwd: process.cwd() }
      );

      expect(result).toContain('Coverage:');
      expect(result).toContain('Unmatched Spec operations:');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large multi-protocol specifications efficiently', async () => {
      const startTime = Date.now();
      
      const openApiPath = path.resolve(fixturesDir, 'sample-api.yaml');
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const graphqlPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const csvPath = path.resolve(fixturesDir, 'analytics-api.csv');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');

      execSync(
        `node cli.js "${openApiPath},${protoPath},${graphqlPath},${csvPath}" "${collectionPath}"`,
        { cwd: process.cwd() }
      );
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should maintain memory efficiency with multiple protocols', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const openApiPath = path.resolve(fixturesDir, 'sample-api.yaml');
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const graphqlPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');

      execSync(
        `node cli.js "${openApiPath},${protoPath},${graphqlPath}" "${collectionPath}"`,
        { cwd: process.cwd() }
      );
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  afterEach(() => {
    // Clean up any generated reports
    const reportFiles = [
      'coverage-report.html',
      'protocol-separation-report.html',
      'debug-report.html',
      'debug-report2.html'
    ];
    
    reportFiles.forEach(file => {
      const filePath = path.resolve(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });
});