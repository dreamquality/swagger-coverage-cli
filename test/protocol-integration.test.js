const { loadAndParseProto, extractOperationsFromProto } = require('../lib/grpc');
const { loadAndParseGraphQL, extractOperationsFromGraphQL } = require('../lib/graphql');
const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const { matchOperationsDetailed } = require('../lib/match');
const path = require('path');

describe('gRPC and GraphQL Integration Tests', () => {
  describe('gRPC Integration', () => {
    test('should match gRPC operations with Postman collection', () => {
      // Load gRPC proto file
      const protoPath = path.resolve(__dirname, 'fixtures', 'user-service.proto');
      const proto = loadAndParseProto(protoPath);
      const grpcOperations = extractOperationsFromProto(proto);
      
      // Load Postman collection with gRPC requests
      const collectionPath = path.resolve(__dirname, 'fixtures', 'grpc-collection.json');
      const collection = loadPostmanCollection(collectionPath);
      const postmanRequests = extractRequestsFromPostman(collection);
      
      // Match operations
      const coverageItems = matchOperationsDetailed(
        grpcOperations,
        postmanRequests,
        { verbose: false, strictQuery: false, strictBody: true }
      );
      
      // Verify matches
      expect(coverageItems).toHaveLength(5); // All gRPC operations
      
      const matchedItems = coverageItems.filter(item => !item.unmatched);
      expect(matchedItems).toHaveLength(2); // GetUser and CreateUser should match
      
      // Check specific matches
      const getUserMatch = matchedItems.find(item => item.operationId && item.operationId.includes('GetUser'));
      expect(getUserMatch).toBeDefined();
      expect(getUserMatch.matchedRequests).toHaveLength(1);
      expect(getUserMatch.matchedRequests[0].name).toBe('Get User');
      
      const createUserMatch = matchedItems.find(item => item.operationId && item.operationId.includes('CreateUser'));
      expect(createUserMatch).toBeDefined();
      expect(createUserMatch.matchedRequests).toHaveLength(1);
      expect(createUserMatch.matchedRequests[0].name).toBe('Create User');
    });
  });

  describe('GraphQL Integration', () => {
    test('should match GraphQL operations with Postman collection', () => {
      // Load GraphQL schema
      const schemaPath = path.resolve(__dirname, 'fixtures', 'blog-schema.graphql');
      const schema = loadAndParseGraphQL(schemaPath);
      const graphqlOperations = extractOperationsFromGraphQL(schema);
      
      // Load Postman collection with GraphQL requests
      const collectionPath = path.resolve(__dirname, 'fixtures', 'graphql-collection.json');
      const collection = loadPostmanCollection(collectionPath);
      const postmanRequests = extractRequestsFromPostman(collection);
      
      // Match operations
      const coverageItems = matchOperationsDetailed(
        graphqlOperations,
        postmanRequests,
        { verbose: false, strictQuery: false, strictBody: true }
      );
      
      // Verify matches
      expect(coverageItems).toHaveLength(9); // All GraphQL operations
      
      const matchedItems = coverageItems.filter(item => !item.unmatched);
      expect(matchedItems).toHaveLength(2); // user query and createUser mutation should match
      
      // Check specific matches
      const userQueryMatch = matchedItems.find(item => item.fieldName === 'user');
      expect(userQueryMatch).toBeDefined();
      expect(userQueryMatch.matchedRequests).toHaveLength(1);
      expect(userQueryMatch.matchedRequests[0].name).toBe('Get User Query');
      
      const createUserMutationMatch = matchedItems.find(item => item.fieldName === 'createUser');
      expect(createUserMutationMatch).toBeDefined();
      expect(createUserMutationMatch.matchedRequests).toHaveLength(1);
      expect(createUserMutationMatch.matchedRequests[0].name).toBe('Create User Mutation');
    });
  });

  describe('Mixed Protocol Tests', () => {
    test('should handle mixed REST, gRPC, and GraphQL operations', () => {
      // Create a mix of operations
      const restOperation = {
        method: 'GET',
        path: '/api/users',
        protocol: undefined, // REST (default)
        operationId: 'getUsers',
        statusCode: '200',
        expectedStatusCodes: ['200']
      };
      
      const grpcOperation = {
        method: 'POST',
        path: '/user.v1.UserService/GetUser',
        protocol: 'grpc',
        serviceName: 'UserService',
        methodName: 'GetUser',
        fullName: 'user.v1.UserService/GetUser',
        operationId: 'UserService_GetUser',
        statusCode: '200',
        expectedStatusCodes: ['200']
      };
      
      const graphqlOperation = {
        method: 'POST',
        path: '/graphql',
        protocol: 'graphql',
        operationType: 'query',
        fieldName: 'user',
        operationId: 'query_user',
        statusCode: '200',
        expectedStatusCodes: ['200']
      };
      
      const mixedOperations = [restOperation, grpcOperation, graphqlOperation];
      
      // Create corresponding requests
      const postmanRequests = [
        {
          name: 'Get Users REST',
          method: 'GET',
          rawUrl: 'http://localhost:3000/api/users',
          testedStatusCodes: ['200'],
          queryParams: [],
          body: null
        },
        {
          name: 'Get User gRPC',
          method: 'POST',
          rawUrl: 'http://localhost:9090/user.v1.UserService/GetUser',
          testedStatusCodes: ['200'],
          queryParams: [],
          body: '{"user_id": "123"}'
        },
        {
          name: 'Get User GraphQL',
          method: 'POST',
          rawUrl: 'http://localhost:4000/graphql',
          testedStatusCodes: ['200'],
          queryParams: [],
          body: '{"query": "query { user(id: \\"123\\") { id name } }"}'
        }
      ];
      
      // Match operations
      const coverageItems = matchOperationsDetailed(
        mixedOperations,
        postmanRequests,
        { verbose: false, strictQuery: false, strictBody: true }
      );
      
      // All operations should match
      expect(coverageItems).toHaveLength(3);
      const matchedItems = coverageItems.filter(item => !item.unmatched);
      expect(matchedItems).toHaveLength(3);
    });
  });
});