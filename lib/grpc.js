// grpc.js

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load and parse gRPC .proto file
 * For now, we'll use a simple regex-based parser for basic proto3 syntax
 * In production, you'd want to use a proper protobuf parser like protobufjs
 */
function loadAndParseProto(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Proto file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic validation - check if it looks like a proto file
  if (!content.includes('syntax') && !content.includes('service')) {
    throw new Error('Invalid proto file format');
  }
  
  return parseProtoContent(content);
}

/**
 * Parse proto file content and extract services and methods
 */
function parseProtoContent(content) {
  const services = [];
  
  // Remove comments
  const cleanContent = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Extract package name
  const packageMatch = cleanContent.match(/package\s+([a-zA-Z0-9_.]+);/);
  const packageName = packageMatch ? packageMatch[1] : '';
  
  // Extract services
  const serviceRegex = /service\s+(\w+)\s*\{([^}]+)\}/g;
  let serviceMatch;
  
  while ((serviceMatch = serviceRegex.exec(cleanContent)) !== null) {
    const serviceName = serviceMatch[1];
    const serviceBody = serviceMatch[2];
    
    // Extract methods from service
    const methods = extractMethodsFromService(serviceBody, serviceName, packageName);
    
    services.push({
      name: serviceName,
      package: packageName,
      methods: methods
    });
  }
  
  return {
    package: packageName,
    services: services
  };
}

/**
 * Extract RPC methods from service definition
 */
function extractMethodsFromService(serviceBody, serviceName, packageName) {
  const methods = [];
  
  // Match RPC method definitions
  const rpcRegex = /rpc\s+(\w+)\s*\(\s*(\w+)\s*\)\s*returns\s*\(\s*(\w+)\s*\)/g;
  let methodMatch;
  
  while ((methodMatch = rpcRegex.exec(serviceBody)) !== null) {
    const methodName = methodMatch[1];
    const requestType = methodMatch[2];
    const responseType = methodMatch[3];
    
    methods.push({
      name: methodName,
      service: serviceName,
      package: packageName,
      requestType: requestType,
      responseType: responseType,
      fullName: `${packageName ? packageName + '.' : ''}${serviceName}/${methodName}`
    });
  }
  
  return methods;
}

/**
 * Extract operations from parsed proto definition
 * Each RPC method becomes an "operation" similar to REST endpoints
 */
function extractOperationsFromProto(proto, verbose = false) {
  const operations = [];
  
  for (const service of proto.services) {
    for (const method of service.methods) {
      // gRPC operations are defined differently than REST
      // We'll create a structure similar to REST operations for consistency
      const operation = {
        method: 'POST', // gRPC typically uses HTTP/2 POST
        path: `/${method.fullName}`, // gRPC path format: /package.service/method
        protocol: 'grpc',
        serviceName: service.name,
        methodName: method.name,
        requestType: method.requestType,
        responseType: method.responseType,
        fullName: method.fullName,
        operationId: `${service.name}_${method.name}`,
        summary: `gRPC method ${method.name} in service ${service.name}`,
        tags: [service.name, 'gRPC'],
        // gRPC typically has success (0) and various error codes
        expectedStatusCodes: ['200'], // HTTP status for successful gRPC calls
        statusCode: '200' // Default success
      };
      
      operations.push(operation);
    }
  }
  
  if (verbose) {
    console.log(`Extracted ${operations.length} gRPC operations from proto file`);
  }
  
  return operations;
}

module.exports = {
  loadAndParseProto,
  extractOperationsFromProto,
  parseProtoContent
};