// graphql.js

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load and parse GraphQL schema file (.graphql, .gql)
 */
function loadAndParseGraphQL(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`GraphQL schema file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic validation - check if it looks like a GraphQL schema
  const hasValidGraphQLKeywords = /\b(type|schema|Query|Mutation|Subscription|input|enum|interface|union)\b/i.test(content);
  if (!hasValidGraphQLKeywords) {
    throw new Error('Invalid GraphQL schema format');
  }
  
  return parseGraphQLContent(content);
}

/**
 * Parse GraphQL schema content and extract types, queries, mutations, subscriptions
 */
function parseGraphQLContent(content) {
  // Remove comments
  const cleanContent = content
    .replace(/#.*$/gm, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/"[^"]*"/g, '');
  
  const schema = {
    queries: [],
    mutations: [],
    subscriptions: [],
    types: []
  };
  
  // Extract root schema definition
  const schemaMatch = cleanContent.match(/schema\s*\{([^}]+)\}/);
  let rootTypes = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription'
  };
  
  if (schemaMatch) {
    const schemaBody = schemaMatch[1];
    const queryMatch = schemaBody.match(/query:\s*(\w+)/);
    const mutationMatch = schemaBody.match(/mutation:\s*(\w+)/);
    const subscriptionMatch = schemaBody.match(/subscription:\s*(\w+)/);
    
    if (queryMatch) rootTypes.query = queryMatch[1];
    if (mutationMatch) rootTypes.mutation = mutationMatch[1];
    if (subscriptionMatch) rootTypes.subscription = subscriptionMatch[1];
  }
  
  // Extract type definitions
  const typeRegex = /type\s+(\w+)\s*\{([^}]+)\}/g;
  let typeMatch;
  
  while ((typeMatch = typeRegex.exec(cleanContent)) !== null) {
    const typeName = typeMatch[1];
    const typeBody = typeMatch[2];
    
    // Extract fields from type
    const fields = extractFieldsFromType(typeBody);
    
    const typeInfo = {
      name: typeName,
      fields: fields
    };
    
    // Categorize based on root types
    if (typeName === rootTypes.query) {
      schema.queries = fields;
    } else if (typeName === rootTypes.mutation) {
      schema.mutations = fields;
    } else if (typeName === rootTypes.subscription) {
      schema.subscriptions = fields;
    } else {
      schema.types.push(typeInfo);
    }
  }
  
  return schema;
}

/**
 * Extract fields from a GraphQL type definition
 */
function extractFieldsFromType(typeBody) {
  const fields = [];
  
  // Match field definitions: fieldName(args): ReturnType
  const fieldRegex = /(\w+)(\([^)]*\))?\s*:\s*([^,\n]+)/g;
  let fieldMatch;
  
  while ((fieldMatch = fieldRegex.exec(typeBody)) !== null) {
    const fieldName = fieldMatch[1];
    const args = fieldMatch[2] || '';
    const returnType = fieldMatch[3].trim();
    
    // Parse arguments if present
    const parsedArgs = parseArguments(args);
    
    fields.push({
      name: fieldName,
      type: returnType,
      arguments: parsedArgs
    });
  }
  
  return fields;
}

/**
 * Parse GraphQL field arguments
 */
function parseArguments(argsString) {
  if (!argsString || argsString === '()') {
    return [];
  }
  
  const args = [];
  // Remove parentheses and split by comma
  const argContent = argsString.slice(1, -1);
  const argParts = argContent.split(',');
  
  for (const argPart of argParts) {
    const trimmed = argPart.trim();
    if (trimmed) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const argName = trimmed.substring(0, colonIndex).trim();
        const argType = trimmed.substring(colonIndex + 1).trim();
        args.push({
          name: argName,
          type: argType
        });
      }
    }
  }
  
  return args;
}

/**
 * Extract operations from parsed GraphQL schema
 * Each query, mutation, and subscription becomes an "operation"
 */
function extractOperationsFromGraphQL(schema, verbose = false) {
  const operations = [];
  
  // Process queries
  for (const query of schema.queries) {
    operations.push(createGraphQLOperation(query, 'query'));
  }
  
  // Process mutations
  for (const mutation of schema.mutations) {
    operations.push(createGraphQLOperation(mutation, 'mutation'));
  }
  
  // Process subscriptions
  for (const subscription of schema.subscriptions) {
    operations.push(createGraphQLOperation(subscription, 'subscription'));
  }
  
  if (verbose) {
    console.log(`Extracted ${operations.length} GraphQL operations from schema`);
  }
  
  return operations;
}

/**
 * Create an operation object for a GraphQL field
 */
function createGraphQLOperation(field, operationType) {
  return {
    method: 'POST', // GraphQL typically uses POST
    path: '/graphql', // Standard GraphQL endpoint
    protocol: 'graphql',
    operationType: operationType, // query, mutation, subscription
    fieldName: field.name,
    returnType: field.type,
    arguments: field.arguments,
    operationId: `${operationType}_${field.name}`,
    summary: `GraphQL ${operationType}: ${field.name}`,
    tags: [operationType, 'GraphQL'],
    expectedStatusCodes: ['200'], // GraphQL typically returns 200 for both success and errors
    statusCode: '200' // Default success
  };
}

module.exports = {
  loadAndParseGraphQL,
  extractOperationsFromGraphQL,
  parseGraphQLContent
};