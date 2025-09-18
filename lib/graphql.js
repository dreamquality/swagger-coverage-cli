// graphql.js

'use strict';

const fs = require('fs');
const path = require('path');
const { buildSchema, parse, visit } = require('graphql');

/**
 * Load and parse GraphQL schema definition
 * @param {string} filePath - Path to .graphql or .gql file
 * @returns {Object} Parsed GraphQL schema
 */
function loadAndParseGraphQL(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`GraphQL file not found: ${filePath}`);
  }

  try {
    const schemaContent = fs.readFileSync(filePath, 'utf8');
    const schema = buildSchema(schemaContent);
    const ast = parse(schemaContent);
    
    return { schema, ast, content: schemaContent };
  } catch (err) {
    throw new Error(`Failed to parse GraphQL schema: ${err.message}`);
  }
}

/**
 * Extract GraphQL operations from schema definition
 * @param {Object} graphqlData - Object containing schema and AST
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Array} Array of GraphQL operations
 */
function extractOperationsFromGraphQL(graphqlData, verbose = false) {
  const { schema, ast } = graphqlData;
  const operations = [];
  
  // Extract Query operations
  const queryType = schema.getQueryType();
  if (queryType) {
    const queryFields = queryType.getFields();
    for (const [fieldName, field] of Object.entries(queryFields)) {
      const operation = {
        protocol: 'graphql',
        method: 'post', // GraphQL uses HTTP POST
        path: '/graphql',
        operationId: `Query.${fieldName}`,
        summary: field.description || `GraphQL query ${fieldName}`,
        statusCode: '200',
        tags: ['GraphQL', 'Query'],
        expectedStatusCodes: ['200', '400'],
        parameters: field.args ? field.args.map(arg => ({
          name: arg.name,
          in: 'body',
          required: arg.type.toString().includes('!'),
          schema: { type: arg.type.toString() }
        })) : [],
        requestBodyContent: ['application/json'],
        graphqlType: 'query',
        graphqlField: fieldName,
        returnType: field.type.toString(),
        arguments: field.args || []
      };
      
      operations.push(operation);
    }
  }
  
  // Extract Mutation operations
  const mutationType = schema.getMutationType();
  if (mutationType) {
    const mutationFields = mutationType.getFields();
    for (const [fieldName, field] of Object.entries(mutationFields)) {
      const operation = {
        protocol: 'graphql',
        method: 'post',
        path: '/graphql',
        operationId: `Mutation.${fieldName}`,
        summary: field.description || `GraphQL mutation ${fieldName}`,
        statusCode: '200',
        tags: ['GraphQL', 'Mutation'],
        expectedStatusCodes: ['200', '400'],
        parameters: field.args ? field.args.map(arg => ({
          name: arg.name,
          in: 'body',
          required: arg.type.toString().includes('!'),
          schema: { type: arg.type.toString() }
        })) : [],
        requestBodyContent: ['application/json'],
        graphqlType: 'mutation',
        graphqlField: fieldName,
        returnType: field.type.toString(),
        arguments: field.args || []
      };
      
      operations.push(operation);
    }
  }
  
  // Extract Subscription operations
  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    const subscriptionFields = subscriptionType.getFields();
    for (const [fieldName, field] of Object.entries(subscriptionFields)) {
      const operation = {
        protocol: 'graphql',
        method: 'post',
        path: '/graphql',
        operationId: `Subscription.${fieldName}`,
        summary: field.description || `GraphQL subscription ${fieldName}`,
        statusCode: '200',
        tags: ['GraphQL', 'Subscription'],
        expectedStatusCodes: ['200', '400'],
        parameters: field.args ? field.args.map(arg => ({
          name: arg.name,
          in: 'body',
          required: arg.type.toString().includes('!'),
          schema: { type: arg.type.toString() }
        })) : [],
        requestBodyContent: ['application/json'],
        graphqlType: 'subscription',
        graphqlField: fieldName,
        returnType: field.type.toString(),
        arguments: field.args || []
      };
      
      operations.push(operation);
    }
  }
  
  if (verbose) {
    console.log(`Extracted GraphQL operations from schema: ${operations.length}`);
  }
  
  return operations;
}

/**
 * Check if a file is a GraphQL schema file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if it's a GraphQL file
 */
function isGraphQLFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.graphql' || ext === '.gql';
}

module.exports = {
  loadAndParseGraphQL,
  extractOperationsFromGraphQL,
  isGraphQLFile
};