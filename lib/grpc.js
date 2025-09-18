// grpc.js

'use strict';

const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

/**
 * Load and parse gRPC Protocol Buffer definition
 * @param {string} filePath - Path to .proto file
 * @returns {Object} Parsed protobuf root
 */
async function loadAndParseProto(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Proto file not found: ${filePath}`);
  }

  try {
    const root = await protobuf.load(filePath);
    return root;
  } catch (err) {
    throw new Error(`Failed to parse proto file: ${err.message}`);
  }
}

/**
 * Extract gRPC operations from protobuf definition
 * @param {Object} root - Protobuf root object
 * @param {boolean} verbose - Enable verbose logging
 * @returns {Array} Array of gRPC operations
 */
function extractOperationsFromProto(root, verbose = false) {
  const operations = [];
  
  function traverseNamespace(namespace, namespacePath = '') {
    if (namespace.nested) {
      for (const [name, nested] of Object.entries(namespace.nested)) {
        const fullPath = namespacePath ? `${namespacePath}.${name}` : name;
        
        if (nested instanceof protobuf.Service) {
          // Found a gRPC service
          const service = nested;
          
          for (const [methodName, method] of Object.entries(service.methods)) {
            const operation = {
              protocol: 'grpc',
              method: 'post', // gRPC uses HTTP/2 POST
              path: `/${fullPath}/${methodName}`,
              operationId: `${fullPath}.${methodName}`,
              summary: method.comment || `gRPC method ${methodName}`,
              statusCode: '200', // Default successful response for gRPC
              tags: ['gRPC', fullPath],
              expectedStatusCodes: ['200', '400', '500'], // Common gRPC status codes
              parameters: [],
              requestBodyContent: ['application/grpc'],
              grpcService: fullPath,
              grpcMethod: methodName,
              requestType: method.requestType,
              responseType: method.responseType,
              requestStream: method.requestStream || false,
              responseStream: method.responseStream || false
            };
            
            operations.push(operation);
          }
        } else if (nested.nested) {
          // Recursively traverse nested namespaces
          traverseNamespace(nested, fullPath);
        }
      }
    }
  }
  
  traverseNamespace(root);
  
  if (verbose) {
    console.log(`Extracted gRPC operations from proto: ${operations.length}`);
  }
  
  return operations;
}

/**
 * Check if a file is a protobuf file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if it's a proto file
 */
function isProtoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.proto';
}

module.exports = {
  loadAndParseProto,
  extractOperationsFromProto,
  isProtoFile
};