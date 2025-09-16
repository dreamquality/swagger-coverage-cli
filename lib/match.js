// match.js

"use strict";

const Ajv = require("ajv");
const ajv = new Ajv();

/**
 * matchOperationsDetailed:
 * - Iterates over each spec operation ("specOp") and creates a "coverage item"
 *   with properties like method, path, name, tags, expectedStatusCodes, etc.
 * - For each specOp, searches Postman requests (pmReq) that match the method,
 *   path, and optionally checks code, strict query, strict body.
 * - Builds an array of "coverage items", each with `unmatched` boolean and
 *   `matchedRequests` array for all matched Postman requests, including JS test scripts.
 *
 * @param {Array} specOps - array of operations from extractOperationsFromSpec, e.g.:
 *   [
 *     {
 *       method: "get",
 *       path: "/v2/artist/elements",
 *       statusCode: "200",
 *       tags: ["Artists","Collections"],
 *       expectedStatusCodes: ["200","400"],
 *       parameters: [...],
 *       requestBodyContent: [...],
 *       ...
 *     },
 *     ...
 *   ]
 * @param {Array} postmanReqs - array of requests from extractRequestsFromPostman
 *   [
 *     {
 *       name: "Get Elements (Postman)",
 *       folder: "Artists",
 *       method: "get",
 *       rawUrl: "https://api.example.com/v2/artist/elements?foo=bar",
 *       testedStatusCodes: ["200","404"],
 *       queryParams: [...],
 *       bodyInfo: {...},
 *       testScripts: "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });"
 *     },
 *     ...
 *   ]
 * @param {Object} opts
 * @param {boolean} opts.verbose
 * @param {boolean} opts.strictQuery
 * @param {boolean} opts.strictBody
 * @returns {Array} coverageItems
 *   [
 *     {
 *       method: "GET",
 *       path: "/v2/artist/elements",
 *       name: "listElements",
 *       tags: ["Artists", "Collections"],
 *       expectedStatusCodes: ["200","400"],
 *       statusCode: "200",
 *       unmatched: false,
 *       matchedRequests: [
 *         {
 *           name: "Get Elements (Postman)",
 *           rawUrl: "https://api.example.com/v2/artist/elements?foo=bar",
 *           method: "GET",
 *           testedStatusCodes: ["200","404"],
 *           testScripts: "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });"
 *         },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 */
function matchOperationsDetailed(specOps, postmanReqs, { verbose, strictQuery, strictBody }) {
  const coverageItems = [];

  for (const specOp of specOps) {
    // Initialize matchedRequests array
    const coverageItem = {
      method: specOp.method ? specOp.method.toUpperCase() : "GET",
      path: specOp.path || "",
      name: specOp.operationId || specOp.summary || "(No operationId in spec)",
      statusCode: specOp.statusCode || "",
      tags: specOp.tags || [],
      expectedStatusCodes: specOp.expectedStatusCodes || [],
      apiName: specOp.apiName || "",
      sourceFile: specOp.sourceFile || "",
      // Copy additional protocol-specific fields
      ...(specOp.protocol && { protocol: specOp.protocol }),
      ...(specOp.operationId && { operationId: specOp.operationId }),
      ...(specOp.serviceName && { serviceName: specOp.serviceName }),
      ...(specOp.methodName && { methodName: specOp.methodName }),
      ...(specOp.operationType && { operationType: specOp.operationType }),
      ...(specOp.fieldName && { fieldName: specOp.fieldName }),
      unmatched: true,
      matchedRequests: []
    };

    for (const pmReq of postmanReqs) {
      if (doesMatch(specOp, pmReq, { strictQuery, strictBody })) {
        coverageItem.unmatched = false;
        coverageItem.matchedRequests.push({
          name: pmReq.name,
          rawUrl: pmReq.rawUrl,
          method: pmReq.method.toUpperCase(),
          testedStatusCodes: pmReq.testedStatusCodes,
          testScripts: pmReq.testScripts || ""
        });
      }
    }

    coverageItems.push(coverageItem);
  }

  if (verbose) {
    const totalCount = coverageItems.length;
    const matchedCount = coverageItems.filter(i => !i.unmatched).length;
    console.log(`Operations mapped: ${matchedCount}, not covered: ${totalCount - matchedCount}`);
  }

  return coverageItems;
}

/**
 * doesMatch:
 *  - Compares a single specOp to a single pmReq to see if they match.
 *  - Checks method, path, and optional status-code presence in pmReq.testedStatusCodes.
 *  - If strictQuery is enabled, ensures required query params are present and conform.
 *  - If strictBody is enabled, ensures requestBody is JSON (if spec says application/json).
 *  - Extended to support gRPC and GraphQL protocols
 *
 * @param {Object} specOp
 * @param {Object} pmReq
 * @param {boolean} strictQuery
 * @param {boolean} strictBody
 * @returns {boolean} whether pmReq matches specOp
 */
function doesMatch(specOp, pmReq, { strictQuery, strictBody }) {
  // Handle different protocols
  if (specOp.protocol === 'grpc') {
    return matchGrpcRequest(specOp, pmReq, { strictQuery, strictBody });
  } else if (specOp.protocol === 'graphql') {
    return matchGraphQLRequest(specOp, pmReq, { strictQuery, strictBody });
  } else {
    // Traditional REST/HTTP matching
    return matchRestRequest(specOp, pmReq, { strictQuery, strictBody });
  }
}

/**
 * Match REST/HTTP requests (original logic)
 */
function matchRestRequest(specOp, pmReq, { strictQuery, strictBody }) {
  // 1. Method
  if (pmReq.method.toLowerCase() !== specOp.method.toLowerCase()) {
    return false;
  }

  // 2. Path
  if (!urlMatchesSwaggerPath(pmReq.rawUrl, specOp.path)) {
    return false;
  }

  // 3. Status code
  if (specOp.statusCode) {
    const specStatusCode = specOp.statusCode.toString();
    if (!pmReq.testedStatusCodes.includes(specStatusCode)) {
      return false;
    }
  }

  // 4. Strict Query
  if (strictQuery) {
    if (!checkQueryParamsStrict(specOp, pmReq)) {
      return false;
    }
  }

  // 5. Strict Body
  if (strictBody) {
    if (!checkRequestBodyStrict(specOp, pmReq)) {
      return false;
    }
  }

  return true;
}

/**
 * Match gRPC requests
 */
function matchGrpcRequest(specOp, pmReq, { strictQuery, strictBody }) {
  // 1. Method - gRPC typically uses POST
  if (pmReq.method.toLowerCase() !== 'post') {
    return false;
  }

  // 2. Check if URL matches gRPC pattern
  // gRPC over HTTP/2 or gRPC-Web might use different URL patterns
  const urlWithoutQuery = pmReq.rawUrl.split('?')[0];
  
  // Try multiple patterns for gRPC URL matching
  const patterns = [
    new RegExp(`/${specOp.serviceName}/${specOp.methodName}$`), // Simple format
    new RegExp(`/${specOp.fullName}$`), // Full package.service/method
    new RegExp(`/${specOp.methodName}$`), // Just method name
    new RegExp(specOp.path.replace(/\//g, '\\/') + '$') // Exact path match
  ];
  
  const matchesAnyPattern = patterns.some(pattern => pattern.test(urlWithoutQuery));
  
  if (!matchesAnyPattern) {
    return false;
  }

  // 3. Check if request body contains gRPC-related content
  if (strictBody && pmReq.body) {
    // For gRPC, the body might contain protobuf data or JSON representation
    // This is a basic check - in practice you'd want more sophisticated validation
    const bodyStr = typeof pmReq.body === 'string' ? pmReq.body : JSON.stringify(pmReq.body);
    
    // For gRPC, we don't necessarily expect the protobuf message type name in the JSON body
    // Instead, we can just check if the body is valid JSON (for gRPC-Web) or has content
    try {
      if (bodyStr.trim()) {
        JSON.parse(bodyStr); // Validate it's valid JSON
        // Additional validation could check if body structure matches expected protobuf fields
        // For now, we'll accept any valid JSON body for gRPC calls
      }
    } catch (e) {
      // If it's not valid JSON, it might be binary protobuf data, which is also valid
      // Accept any non-empty body for gRPC
      if (bodyStr.trim() === '') {
        return false; // Empty body might not be valid for some gRPC methods
      }
    }
  }

  return true;
}

/**
 * Match GraphQL requests
 */
function matchGraphQLRequest(specOp, pmReq, { strictQuery, strictBody }) {
  // 1. Method - GraphQL typically uses POST
  if (pmReq.method.toLowerCase() !== 'post') {
    return false;
  }

  // 2. Path - GraphQL typically uses /graphql endpoint
  const urlWithoutQuery = pmReq.rawUrl.split('?')[0];
  if (!urlWithoutQuery.includes('/graphql')) {
    return false;
  }

  // 3. Check if request body contains the GraphQL operation
  if (strictBody && pmReq.body) {
    const bodyStr = typeof pmReq.body === 'string' ? pmReq.body : JSON.stringify(pmReq.body);
    
    try {
      const bodyObj = JSON.parse(bodyStr);
      
      // GraphQL requests should have a "query" field
      if (!bodyObj.query) {
        return false;
      }
      
      // Check if the query contains the correct operation type
      const queryStr = bodyObj.query.toLowerCase();
      if (!queryStr.includes(specOp.operationType)) {
        return false;
      }
      
      // More specific matching: check if the field name appears in the right context
      // For queries: look for "query" or field name after "{"
      // For mutations: look for "mutation" or field name after "{"
      const fieldPattern = new RegExp(`\\b${specOp.fieldName}\\s*[\\(\\{]`, 'i');
      if (!fieldPattern.test(queryStr)) {
        return false;
      }
      
    } catch (e) {
      // If body is not valid JSON, reject the match
      return false;
    }
  }

  return true;
}

/**
 * checkQueryParamsStrict:
 *  - Example approach verifying required query params from specOp.parameters
 */
function checkQueryParamsStrict(specOp, pmReq) {
  const queryParamsSpec = (specOp.parameters || []).filter(p => p.in === "query");
  for (const p of queryParamsSpec) {
    if (p.required) {
      const found = pmReq.queryParams.some(q => q.key === p.name);
      if (!found) return false;
    }
    // If there's a schema (enum/pattern/type) do advanced validation
    if (p.schema && Object.keys(p.schema).length > 0) {
      const paramValue = getParamValue(pmReq.queryParams, p.name);
      if (paramValue !== undefined) {
        if (!validateParamWithSchema(paramValue, p.schema)) {
          return false;
        }
      } else if (p.required) {
        return false;
      }
    }
  }
  return true;
}

/** Utility to find a query param value by key */
function getParamValue(queryParams, paramName) {
  const qp = queryParams.find(q => q.key === paramName);
  return qp ? qp.value : undefined;
}

/**
 * checkRequestBodyStrict:
 *  - If specOp.requestBodyContent includes 'application/json',
 *    require pmReq.bodyInfo to be 'raw' and valid JSON
 */
function checkRequestBodyStrict(specOp, pmReq) {
  if (!specOp.requestBodyContent) return true;
  const hasJson = specOp.requestBodyContent.some(ct => ct.includes("application/json"));
  if (!hasJson) return true;

  if (!pmReq.bodyInfo || pmReq.bodyInfo.mode !== "raw") {
    return false;
  }
  try {
    JSON.parse(pmReq.bodyInfo.content);
    return true;
  } catch {
    return false;
  }
}

/**
 * validateParamWithSchema:
 *  - Basic AJV-based validation for a single param value against a spec schema
 *    (type, pattern, enum, etc.)
 */
function validateParamWithSchema(value, paramSchema) {
  // e.g.: { type: 'string', enum: ['foo','bar'], pattern: '^[a-z]+$' }
  // Convert to a standard JSON schema snippet:
  const schema = {
    type: paramSchema.type || "string",
    enum: paramSchema.enum,
    pattern: paramSchema.pattern
    // etc. (format, minLength, maxLength, etc.)
  };

  let data = value;

  // Convert if type=number or boolean
  if (schema.type === "number" || schema.type === "integer") {
    const num = Number(value);
    if (isNaN(num)) return false;
    data = num;
  } else if (schema.type === "boolean") {
    if (value.toLowerCase() === "true") data = true;
    else if (value.toLowerCase() === "false") data = false;
    else return false;
  }

  const validate = ajv.compile(schema);
  return validate(data);
}

/**
 * urlMatchesSwaggerPath:
 *  - Replaces {param} segments with [^/]+ in a regex, ignoring query part
 */
function urlMatchesSwaggerPath(postmanUrl, swaggerPath) {
  let cleaned = postmanUrl.replace(/^(https?:\/\/)?\{\{.*?\}\}/, "");
  cleaned = cleaned.replace(/^https?:\/\/[^/]+/, "");
  cleaned = cleaned.split("?")[0];
  cleaned = cleaned.replace(/\/+$/, "");
  if (!cleaned) cleaned = "/";

  const regexStr =
    "^" +
    swaggerPath
      .replace(/\/+$/, "")
      .replace(/\{[^}]+\}/g, "[^/]+") +
    "$";

  const re = new RegExp(regexStr);
  return re.test(cleaned);
}

module.exports = {
  matchOperationsDetailed,
  urlMatchesSwaggerPath,
  validateParamWithSchema,
  matchOperations: matchOperationsDetailed
};
