// grpc-graphql.test.js

const { loadAndParseProto, extractOperationsFromProto, isProtoFile } = require('../lib/grpc');
const { loadAndParseGraphQL, extractOperationsFromGraphQL, isGraphQLFile } = require('../lib/graphql');
const { matchOperationsDetailed } = require('../lib/match');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const path = require('path');

describe('gRPC and GraphQL Support', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  
  describe('gRPC Protocol Buffer Support', () => {
    test('should identify proto files correctly', () => {
      expect(isProtoFile('test.proto')).toBe(true);
      expect(isProtoFile('test.yaml')).toBe(false);
      expect(isProtoFile('test.json')).toBe(false);
    });

    test('should load and parse proto file', async () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const root = await loadAndParseProto(protoPath);
      
      expect(root).toBeDefined();
      expect(root.nested).toBeDefined();
      expect(root.nested.user).toBeDefined();
      expect(root.nested.user.nested.v1).toBeDefined();
    });

    test('should extract gRPC operations from proto', async () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const root = await loadAndParseProto(protoPath);
      const operations = extractOperationsFromProto(root, true);
      
      expect(operations.length).toBeGreaterThan(0);
      
      // Find specific operations
      const getUserOp = operations.find(op => op.grpcMethod === 'GetUser');
      const createUserOp = operations.find(op => op.grpcMethod === 'CreateUser');
      
      expect(getUserOp).toBeDefined();
      expect(getUserOp.protocol).toBe('grpc');
      expect(getUserOp.method).toBe('post');
      expect(getUserOp.path).toBe('/user.v1.UserService/GetUser');
      expect(getUserOp.grpcService).toBe('user.v1.UserService');
      
      expect(createUserOp).toBeDefined();
      expect(createUserOp.protocol).toBe('grpc');
      expect(createUserOp.path).toBe('/user.v1.UserService/CreateUser');
    });

    test('should handle proto files that do not exist', async () => {
      await expect(loadAndParseProto('nonexistent.proto')).rejects.toThrow('Proto file not found');
    });
  });

  describe('GraphQL Schema Support', () => {
    test('should identify GraphQL files correctly', () => {
      expect(isGraphQLFile('schema.graphql')).toBe(true);
      expect(isGraphQLFile('schema.gql')).toBe(true);
      expect(isGraphQLFile('schema.yaml')).toBe(false);
      expect(isGraphQLFile('schema.json')).toBe(false);
    });

    test('should load and parse GraphQL schema', () => {
      const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const graphqlData = loadAndParseGraphQL(schemaPath);
      
      expect(graphqlData.schema).toBeDefined();
      expect(graphqlData.ast).toBeDefined();
      expect(graphqlData.content).toBeDefined();
    });

    test('should extract GraphQL operations from schema', () => {
      const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const graphqlData = loadAndParseGraphQL(schemaPath);
      const operations = extractOperationsFromGraphQL(graphqlData, true);
      
      expect(operations.length).toBeGreaterThan(0);
      
      // Find specific operations
      const getUserQuery = operations.find(op => op.graphqlField === 'user' && op.graphqlType === 'query');
      const createUserMutation = operations.find(op => op.graphqlField === 'createUser' && op.graphqlType === 'mutation');
      const userSubscription = operations.find(op => op.graphqlField === 'userUpdated' && op.graphqlType === 'subscription');
      
      expect(getUserQuery).toBeDefined();
      expect(getUserQuery.protocol).toBe('graphql');
      expect(getUserQuery.method).toBe('post');
      expect(getUserQuery.path).toBe('/graphql');
      expect(getUserQuery.tags).toContain('GraphQL');
      expect(getUserQuery.tags).toContain('Query');
      
      expect(createUserMutation).toBeDefined();
      expect(createUserMutation.protocol).toBe('graphql');
      expect(createUserMutation.tags).toContain('Mutation');
      
      expect(userSubscription).toBeDefined();
      expect(userSubscription.tags).toContain('Subscription');
    });

    test('should handle GraphQL files that do not exist', () => {
      expect(() => loadAndParseGraphQL('nonexistent.graphql')).toThrow('GraphQL file not found');
    });
  });

  describe('Multi-Protocol Matching', () => {
    test('should match gRPC operations with Postman requests', async () => {
      const protoPath = path.resolve(fixturesDir, 'user-service.proto');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
      
      // Load gRPC operations
      const root = await loadAndParseProto(protoPath);
      const grpcOps = extractOperationsFromProto(root).map(op => ({
        ...op,
        apiName: 'User gRPC Service',
        sourceFile: 'user-service.proto'
      }));
      
      // Load Postman requests
      const collection = loadPostmanCollection(collectionPath);
      const postmanReqs = extractRequestsFromPostman(collection);
      
      // Match operations
      const coverageItems = matchOperationsDetailed(grpcOps, postmanReqs, {
        verbose: true,
        strictQuery: false,
        strictBody: false
      });
      
      expect(coverageItems.length).toBe(grpcOps.length);
      
      // Check for specific matches
      const getUserCoverage = coverageItems.find(item => item.name.includes('GetUser'));
      const createUserCoverage = coverageItems.find(item => item.name.includes('CreateUser'));
      
      // Should find matches for gRPC requests
      expect(getUserCoverage).toBeDefined();
      expect(createUserCoverage).toBeDefined();
    });

    test('should match GraphQL operations with Postman requests', () => {
      const schemaPath = path.resolve(fixturesDir, 'user-schema.graphql');
      const collectionPath = path.resolve(fixturesDir, 'multi-protocol-collection.json');
      
      // Load GraphQL operations
      const graphqlData = loadAndParseGraphQL(schemaPath);
      const graphqlOps = extractOperationsFromGraphQL(graphqlData).map(op => ({
        ...op,
        apiName: 'User GraphQL API',
        sourceFile: 'user-schema.graphql'
      }));
      
      // Load Postman requests
      const collection = loadPostmanCollection(collectionPath);
      const postmanReqs = extractRequestsFromPostman(collection);
      
      // Match operations
      const coverageItems = matchOperationsDetailed(graphqlOps, postmanReqs, {
        verbose: true,
        strictQuery: false,
        strictBody: false
      });
      
      expect(coverageItems.length).toBe(graphqlOps.length);
      
      // Check for specific matches
      const userQueryCoverage = coverageItems.find(item => 
        item.name.includes('Query.user')
      );
      const createUserMutationCoverage = coverageItems.find(item => 
        item.name.includes('Mutation.createUser')
      );
      
      // Should find matches for GraphQL requests
      expect(userQueryCoverage).toBeDefined();
      expect(createUserMutationCoverage).toBeDefined();
    });
  });
});