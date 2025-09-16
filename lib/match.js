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
function matchOperationsDetailed(specOps, postmanReqs, { verbose, strictQuery, strictBody, smartMapping = false }) {
  let coverageItems = [];

  if (smartMapping) {
    // Group operations by method and path to handle smart status code prioritization
    const operationGroups = groupOperationsByMethodAndPath(specOps);
    
    for (const groupKey in operationGroups) {
      const operations = operationGroups[groupKey];
      const smartMatches = findSmartMatches(operations, postmanReqs, { strictQuery, strictBody });
      coverageItems = coverageItems.concat(smartMatches);
    }
  } else {
    // Original matching logic
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
  }

  if (verbose) {
    const totalCount = coverageItems.length;
    const matchedCount = coverageItems.filter(i => !i.unmatched).length;
    console.log(`Operations mapped: ${matchedCount}, not covered: ${totalCount - matchedCount}`);
    
    if (smartMapping) {
      const primaryMatches = coverageItems.filter(i => !i.unmatched && i.isPrimaryMatch);
      const secondaryMatches = coverageItems.filter(i => !i.unmatched && !i.isPrimaryMatch);
      console.log(`Smart mapping: ${primaryMatches.length} primary matches, ${secondaryMatches.length} secondary matches`);
    }
  }

  return coverageItems;
}

/**
 * doesMatch:
 *  - Compares a single specOp to a single pmReq to see if they match.
 *  - Checks method, path, and optional status-code presence in pmReq.testedStatusCodes.
 *  - If strictQuery is enabled, ensures required query params are present and conform.
 *  - If strictBody is enabled, ensures requestBody is JSON (if spec says application/json).
 *
 * @param {Object} specOp
 * @param {Object} pmReq
 * @param {boolean} strictQuery
 * @param {boolean} strictBody
 * @returns {boolean} whether pmReq matches specOp
 */
function doesMatch(specOp, pmReq, { strictQuery, strictBody }) {
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
 *  - Enhanced with better parameter pattern matching
 */
function urlMatchesSwaggerPath(postmanUrl, swaggerPath) {
  let cleaned = postmanUrl.replace(/^(https?:\/\/)?\{\{.*?\}\}/, "");
  cleaned = cleaned.replace(/^https?:\/\/[^/]+/, "");
  cleaned = cleaned.split("?")[0];
  cleaned = cleaned.replace(/\/+$/, "");
  if (!cleaned) cleaned = "/";

  // Enhanced regex generation with more flexible parameter matching
  const regexStr =
    "^" +
    swaggerPath
      .replace(/\/+$/, "")
      .replace(/\{[^}]+\}/g, "[^/]+") +
    "$";

  const re = new RegExp(regexStr);
  return re.test(cleaned);
}

/**
 * Calculate path similarity for fuzzy matching
 */
function calculatePathSimilarity(postmanUrl, swaggerPath) {
  const cleanedUrl = postmanUrl.replace(/^(https?:\/\/)?\{\{.*?\}\}/, "")
                               .replace(/^https?:\/\/[^/]+/, "")
                               .split("?")[0]
                               .replace(/\/+$/, "");
  const normalizedUrl = cleanedUrl || "/";
  const normalizedSwagger = swaggerPath.replace(/\/+$/, "") || "/";
  
  // Direct match gets highest score
  if (urlMatchesSwaggerPath(postmanUrl, swaggerPath)) {
    return 1.0;
  }
  
  // Split paths into segments for comparison
  const urlSegments = normalizedUrl.split('/').filter(s => s);
  const swaggerSegments = normalizedSwagger.split('/').filter(s => s);
  
  if (urlSegments.length !== swaggerSegments.length) {
    return 0; // Different segment count = no match
  }
  
  let matches = 0;
  for (let i = 0; i < urlSegments.length; i++) {
    const urlSeg = urlSegments[i];
    const swaggerSeg = swaggerSegments[i];
    
    if (urlSeg === swaggerSeg) {
      matches += 1; // Exact segment match
    } else if (swaggerSeg.startsWith('{') && swaggerSeg.endsWith('}')) {
      matches += 0.8; // Parameter match (slightly lower score)
    } else if (urlSeg.match(/^\d+$/) && swaggerSeg.startsWith('{') && swaggerSeg.endsWith('}')) {
      matches += 0.9; // Numeric parameter match (higher confidence)
    } else {
      // No match for this segment
      return 0;
    }
  }
  
  return urlSegments.length > 0 ? matches / urlSegments.length : 0;
}

/**
 * Group operations by method and path for smart status code handling
 */
function groupOperationsByMethodAndPath(specOps) {
  const groups = {};
  
  for (const op of specOps) {
    const key = `${op.method}:${op.path}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(op);
  }
  
  return groups;
}

/**
 * Find smart matches for a group of operations (same method/path, different status codes)
 */
function findSmartMatches(operations, postmanReqs, { strictQuery, strictBody }) {
  const coverageItems = [];
  
  // Sort operations by status code priority (2xx first, then others)
  const prioritizedOps = operations.sort((a, b) => {
    const aCode = parseInt(a.statusCode) || 999;
    const bCode = parseInt(b.statusCode) || 999;
    const aIsSuccess = aCode >= 200 && aCode < 300;
    const bIsSuccess = bCode >= 200 && bCode < 300;
    
    if (aIsSuccess && !bIsSuccess) return -1;
    if (!aIsSuccess && bIsSuccess) return 1;
    return aCode - bCode;
  });
  
  // Find matching requests for this operation group
  const matchingRequests = [];
  for (const pmReq of postmanReqs) {
    // Check if this request could match any operation in the group
    if (operations.some(op => doesMatchBasic(op, pmReq, { strictQuery, strictBody }))) {
      matchingRequests.push(pmReq);
    }
  }
  
  let primaryMatchAssigned = false;
  
  for (const specOp of prioritizedOps) {
    const coverageItem = {
      method: specOp.method ? specOp.method.toUpperCase() : "GET",
      path: specOp.path || "",
      name: specOp.operationId || specOp.summary || "(No operationId in spec)",
      statusCode: specOp.statusCode || "",
      tags: specOp.tags || [],
      expectedStatusCodes: specOp.expectedStatusCodes || [],
      apiName: specOp.apiName || "",
      sourceFile: specOp.sourceFile || "",
      unmatched: true,
      matchedRequests: [],
      isPrimaryMatch: false,
      matchConfidence: 0
    };

    // Find requests that match this specific operation
    for (const pmReq of matchingRequests) {
      const matchResult = doesMatchWithConfidence(specOp, pmReq, { strictQuery, strictBody });
      if (matchResult.matches) {
        // Only mark as matched if:
        // 1. This is the primary match (first successful status code), OR
        // 2. No primary match has been assigned yet and this request actually tests this status code
        const requestTestsThisStatus = specOp.statusCode && pmReq.testedStatusCodes.includes(specOp.statusCode.toString());
        const isPrimaryCandidate = !primaryMatchAssigned && isSuccessStatusCode(specOp.statusCode);
        
        if (isPrimaryCandidate || requestTestsThisStatus) {
          coverageItem.unmatched = false;
          coverageItem.matchConfidence = Math.max(coverageItem.matchConfidence, matchResult.confidence);
          coverageItem.matchedRequests.push({
            name: pmReq.name,
            rawUrl: pmReq.rawUrl,
            method: pmReq.method.toUpperCase(),
            testedStatusCodes: pmReq.testedStatusCodes,
            testScripts: pmReq.testScripts || "",
            confidence: matchResult.confidence
          });
          
          if (isPrimaryCandidate) {
            coverageItem.isPrimaryMatch = true;
            primaryMatchAssigned = true;
          }
        }
      }
    }

    coverageItems.push(coverageItem);
  }
  
  return coverageItems;
}

/**
 * Basic matching without status code requirement (for grouping)
 */
function doesMatchBasic(specOp, pmReq, { strictQuery, strictBody }) {
  // 1. Method
  if (pmReq.method.toLowerCase() !== specOp.method.toLowerCase()) {
    return false;
  }

  // 2. Path
  if (!urlMatchesSwaggerPath(pmReq.rawUrl, specOp.path)) {
    return false;
  }

  // 3. Strict Query (if enabled)
  if (strictQuery) {
    if (!checkQueryParamsStrict(specOp, pmReq)) {
      return false;
    }
  }

  // 4. Strict Body (if enabled)
  if (strictBody) {
    if (!checkRequestBodyStrict(specOp, pmReq)) {
      return false;
    }
  }

  return true;
}

/**
 * Enhanced matching with confidence scoring
 */
function doesMatchWithConfidence(specOp, pmReq, { strictQuery, strictBody }) {
  let confidence = 0;
  
  // Basic match first
  if (!doesMatchBasic(specOp, pmReq, { strictQuery, strictBody })) {
    return { matches: false, confidence: 0 };
  }
  
  // Base confidence for method and path match
  confidence += 0.6;
  
  // Status code matching
  if (specOp.statusCode) {
    const specStatusCode = specOp.statusCode.toString();
    if (pmReq.testedStatusCodes.includes(specStatusCode)) {
      confidence += 0.3; // High bonus for exact status code match
    } else if (pmReq.testedStatusCodes.some(code => isSuccessStatusCode(code)) && 
               isSuccessStatusCode(specStatusCode)) {
      confidence += 0.2; // Medium bonus for both being success codes
    } else {
      // No status code penalty, but don't add bonus
    }
  } else {
    confidence += 0.1; // Small bonus for operations without specific status codes
  }
  
  // Additional confidence for parameter matching
  if (strictQuery || strictBody) {
    confidence += 0.1; // Bonus for strict validation passing
  }
  
  return { 
    matches: true, 
    confidence: Math.min(confidence, 1.0) // Cap at 1.0
  };
}

/**
 * Check if a status code represents success (2xx)
 */
function isSuccessStatusCode(statusCode) {
  if (!statusCode) return false;
  const code = parseInt(statusCode);
  return code >= 200 && code < 300;
}

module.exports = {
  matchOperationsDetailed,
  urlMatchesSwaggerPath,
  validateParamWithSchema,
  matchOperations: matchOperationsDetailed,
  groupOperationsByMethodAndPath,
  findSmartMatches,
  isSuccessStatusCode,
  calculatePathSimilarity
};
