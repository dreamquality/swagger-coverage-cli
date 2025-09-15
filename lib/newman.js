// newman.js

'use strict';

const fs = require('fs');

/**
 * Load Newman run report (JSON).
 */
function loadNewmanReport(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Newman report file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Unexpected token in JSON: ${e.message}`);
  }
  if (!data.run || !data.run.executions) {
    throw new Error('Incorrect Newman report format: missing run or executions fields.');
  }
  return data;
}

/**
 * Extract requests from Newman run report.
 * Newman reports contain actual execution data with responses.
 */
function extractRequestsFromNewman(newmanReport, verbose = false) {
  const requests = [];
  const executions = newmanReport.run.executions || [];

  executions.forEach(execution => {
    const item = execution.item || {};
    const request = execution.request || {};
    const response = execution.response || {};
    
    const method = (request.method || 'GET').toLowerCase();
    const rawUrl = typeof request.url === 'object' ? request.url.raw : request.url || '';
    
    // Extract query parameters from URL if present
    let queryParams = [];
    if (request.url && request.url.query) {
      queryParams = request.url.query.map(q => ({ key: q.key, value: q.value }));
    }
    
    // Extract body information
    let bodyInfo = null;
    if (request.body && request.body.mode) {
      bodyInfo = {
        mode: request.body.mode,
        content: request.body[request.body.mode]
      };
    }
    
    // Extract tested status codes from actual response
    let testedStatusCodes = [];
    if (response.code) {
      testedStatusCodes.push(String(response.code));
    }
    
    // Extract test scripts and assertions
    let testScripts = '';
    let assertionDetails = [];
    if (execution.assertions && Array.isArray(execution.assertions)) {
      execution.assertions.forEach(assertion => {
        if (assertion.assertion) {
          testScripts += `// ${assertion.assertion}\n`;
          assertionDetails.push({
            name: assertion.assertion,
            passed: !assertion.error,
            error: assertion.error
          });
        }
      });
    }
    
    requests.push({
      name: item.name || 'Unnamed Request',
      folder: '', // Newman reports don't typically include folder structure
      method,
      rawUrl,
      queryParams,
      bodyInfo,
      testedStatusCodes,
      testScripts: testScripts.trim(),
      // Additional Newman-specific data
      executed: true,
      responseCode: response.code,
      responseStatus: response.status,
      responseTime: response.responseTime,
      assertions: assertionDetails
    });
  });

  if (verbose) {
    console.log(`Requests found in the Newman report: ${requests.length}`);
  }
  return requests;
}

module.exports = {
  loadNewmanReport,
  extractRequestsFromNewman
};