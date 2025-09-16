const { loadAndParseGraphQL, extractOperationsFromGraphQL } = require('../lib/graphql');
const fs = require('fs');
const path = require('path');

describe('GraphQL Module', () => {
  test('loadAndParseGraphQL should throw error if file does not exist', () => {
    expect(() => loadAndParseGraphQL('nonexistent.graphql')).toThrow('GraphQL schema file not found');
  });

  test('loadAndParseGraphQL should parse GraphQL schema correctly', () => {
    const schemaPath = path.resolve(__dirname, 'fixtures', 'blog-schema.graphql');
    const schema = loadAndParseGraphQL(schemaPath);
    
    expect(schema).toBeDefined();
    expect(schema.queries).toHaveLength(3);
    expect(schema.mutations).toHaveLength(4);
    expect(schema.subscriptions).toHaveLength(2);
    expect(schema.types.length).toBeGreaterThan(0);
  });

  test('extractOperationsFromGraphQL should create operations from schema', () => {
    const schemaPath = path.resolve(__dirname, 'fixtures', 'blog-schema.graphql');
    const schema = loadAndParseGraphQL(schemaPath);
    const operations = extractOperationsFromGraphQL(schema);
    
    expect(operations).toHaveLength(9); // 3 queries + 4 mutations + 2 subscriptions
    
    // Check query operation
    const userQuery = operations.find(op => op.fieldName === 'user');
    expect(userQuery).toBeDefined();
    expect(userQuery.method).toBe('POST');
    expect(userQuery.protocol).toBe('graphql');
    expect(userQuery.operationType).toBe('query');
    expect(userQuery.path).toBe('/graphql');
    expect(userQuery.tags).toContain('GraphQL');
    expect(userQuery.tags).toContain('query');
    expect(userQuery.arguments).toHaveLength(1);
    expect(userQuery.arguments[0].name).toBe('id');
    expect(userQuery.arguments[0].type).toBe('ID!');
    
    // Check mutation operation
    const createUserMutation = operations.find(op => op.fieldName === 'createUser');
    expect(createUserMutation).toBeDefined();
    expect(createUserMutation.operationType).toBe('mutation');
    expect(createUserMutation.tags).toContain('mutation');
    
    // Check subscription operation
    const userUpdatedSub = operations.find(op => op.fieldName === 'userUpdated');
    expect(userUpdatedSub).toBeDefined();
    expect(userUpdatedSub.operationType).toBe('subscription');
    expect(userUpdatedSub.tags).toContain('subscription');
  });

  test('should handle simple GraphQL schema', () => {
    const simpleSchema = `
type Query {
  hello: String
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
}
`;
    
    // Create temporary schema file
    const tempPath = path.resolve(__dirname, 'fixtures', 'temp-simple.graphql');
    fs.writeFileSync(tempPath, simpleSchema);
    
    try {
      const schema = loadAndParseGraphQL(tempPath);
      expect(schema.queries).toHaveLength(2);
      expect(schema.mutations).toHaveLength(0);
      expect(schema.subscriptions).toHaveLength(0);
      
      const operations = extractOperationsFromGraphQL(schema);
      expect(operations).toHaveLength(2);
      
      const helloQuery = operations.find(op => op.fieldName === 'hello');
      expect(helloQuery.arguments).toHaveLength(0);
      
      const userQuery = operations.find(op => op.fieldName === 'user');
      expect(userQuery.arguments).toHaveLength(1);
    } finally {
      // Clean up
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  });

  test('should handle schema with custom root types', () => {
    const customSchema = `
schema {
  query: RootQuery
  mutation: RootMutation
}

type RootQuery {
  getUser: User
}

type RootMutation {
  createUser: User
}

type User {
  id: ID!
  name: String!
}
`;
    
    // Create temporary schema file
    const tempPath = path.resolve(__dirname, 'fixtures', 'temp-custom.graphql');
    fs.writeFileSync(tempPath, customSchema);
    
    try {
      const schema = loadAndParseGraphQL(tempPath);
      expect(schema.queries).toHaveLength(1);
      expect(schema.mutations).toHaveLength(1);
      expect(schema.queries[0].name).toBe('getUser');
      expect(schema.mutations[0].name).toBe('createUser');
    } finally {
      // Clean up
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  });

  test('should throw error for invalid GraphQL file', () => {
    const invalidPath = path.resolve(__dirname, 'fixtures', 'invalid.graphql');
    fs.writeFileSync(invalidPath, 'completely invalid content without any graphql keywords');
    
    try {
      expect(() => loadAndParseGraphQL(invalidPath)).toThrow('Invalid GraphQL schema format');
    } finally {
      // Clean up
      if (fs.existsSync(invalidPath)) {
        fs.unlinkSync(invalidPath);
      }
    }
  });
});