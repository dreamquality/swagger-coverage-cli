#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { Command } = require("commander");

const { loadAndParseSpec, extractOperationsFromSpec } = require("./lib/swagger");
const { loadPostmanCollection, extractRequestsFromPostman } = require("./lib/postman");
const { loadNewmanReport, extractRequestsFromNewman } = require("./lib/newman");
const { matchOperationsDetailed } = require("./lib/match");
const { generateHtmlReport, generateHeatmapReport } = require("./lib/report");
const { loadExcelSpec } = require("./lib/excel");

const program = new Command();

program
  .name("swagger-coverage-cli")
  .description(
    "CLI tool for comparing OpenAPI/Swagger specifications with a Postman collection or Newman run report, producing an enhanced HTML report"
  )
  .version("4.0.0")
  .argument("<swaggerFiles>", "Path(s) to the Swagger/OpenAPI file(s) (JSON or YAML). Use comma-separated values for multiple files.")
  .argument("<postmanCollectionOrNewmanReport>", "Path to the Postman collection (JSON) or Newman run report (JSON).")
  .option("-v, --verbose", "Show verbose debug info")
  .option("--strict-query", "Enable strict validation of query parameters")
  .option("--strict-body", "Enable strict validation of requestBody (JSON)")
  .option("--output <file>", "HTML report output file", "coverage-report.html")
  .option("--newman", "Treat input file as Newman run report instead of Postman collection")
  .option("--heatmap", "Generate coverage heatmap (graph API with endpoints nodes, methods edges, and coverage highlighting)")
  .action(async (swaggerFiles, postmanFile, options) => {
    try {
      const { verbose, strictQuery, strictBody, output, newman, heatmap } = options;

      // Parse comma-separated swagger files
      const files = swaggerFiles.includes(',') ? 
        swaggerFiles.split(',').map(f => f.trim()) : 
        [swaggerFiles];
      
      let allSpecOperations = [];
      let allSpecNames = [];
      const excelExtensions = [".xlsx", ".xls", ".csv"];

      // Process each swagger file
      for (const swaggerFile of files) {
        const ext = path.extname(swaggerFile).toLowerCase();
        let specOperations;
        let specName;

        if (excelExtensions.includes(ext)) {
          // Parse Excel
          specOperations = loadExcelSpec(swaggerFile);
          specName = path.basename(swaggerFile);
        } else {
          // Original Swagger flow
          const spec = await loadAndParseSpec(swaggerFile);
          specName = spec.info.title;
          if (verbose) {
            console.log(
              "Specification loaded successfully:",
              specName,
              spec.info.version
            );
          }
          specOperations = extractOperationsFromSpec(spec, verbose);
        }

        // Add API name to each operation for identification
        const operationsWithSource = specOperations.map(op => ({
          ...op,
          apiName: specName,
          sourceFile: path.basename(swaggerFile)
        }));

        allSpecOperations = allSpecOperations.concat(operationsWithSource);
        allSpecNames.push(specName);
      }

      // Ensure Postman/Newman file exists
      if (!fs.existsSync(postmanFile)) {
        throw new Error(`Input file not found: ${postmanFile}`);
      }

      // Safely parse input JSON (Postman collection or Newman report)
      let inputData;
      let collectionName;
      try {
        const rawInput = fs.readFileSync(postmanFile, "utf8");
        if (!rawInput.trim()) {
          throw new Error("Input file is empty.");
        }
        inputData = JSON.parse(rawInput);
      } catch (err) {
        throw new Error(`Unable to parse input JSON: ${err.message}`);
      }

      let postmanRequests;
      
      if (newman) {
        // Handle Newman report
        if (!inputData.run || !inputData.run.executions) {
          throw new Error('Invalid Newman report format: missing run or executions fields.');
        }
        collectionName = inputData.collection?.info?.name || 'Newman Report';
        if (verbose) {
          console.log(`Newman report loaded successfully: "${collectionName}"`);
        }
        postmanRequests = extractRequestsFromNewman(inputData, verbose);
      } else {
        // Auto-detect format or handle as Postman collection
        if (inputData.run && inputData.run.executions) {
          // This looks like a Newman report but --newman flag wasn't used
          console.log("Detected Newman report format. Consider using --newman flag for explicit handling.");
          collectionName = inputData.collection?.info?.name || 'Auto-detected Newman Report';
          postmanRequests = extractRequestsFromNewman(inputData, verbose);
        } else {
          // Handle as Postman collection
          if (!inputData.info || !inputData.item) {
            throw new Error('Invalid Postman collection format: missing info or item fields.');
          }
          collectionName = inputData.info.name;
          if (verbose) {
            console.log(`Postman collection loaded successfully: "${collectionName}"`);
          }
          postmanRequests = extractRequestsFromPostman(inputData, verbose);
        }
      }

      // 5. Match operations in a "detailed" way that returns coverageItems
      const coverageItems = matchOperationsDetailed(allSpecOperations, postmanRequests, {
        verbose,
        strictQuery,
        strictBody,
      });

      // Collect matched request names
      const matchedReqNames = new Set();
      coverageItems.forEach(ci => {
        ci.matchedRequests.forEach(mr => matchedReqNames.add(mr.name));
      });

      // Identify any Postman requests that weren't matched
      const undocumentedRequests = postmanRequests.filter(
        r => !matchedReqNames.has(r.name)
      );

      // Calculate coverage: # of spec items that are NOT unmatched
      const totalSpecOps = coverageItems.length;
      const matchedCount = coverageItems.filter(item => !item.unmatched).length;
      const coverage = totalSpecOps ? (matchedCount / totalSpecOps) * 100 : 0;

      // 6. Print console summary
      console.log("=== Swagger Coverage Report ===");
      if (files.length > 1) {
        console.log(`APIs analyzed: ${allSpecNames.join(', ')}`);
      }
      console.log(`Total operations in spec(s): ${totalSpecOps}`);
      console.log(`Matched operations in Postman/Newman: ${matchedCount}`);
      console.log(`Coverage: ${coverage.toFixed(2)}%`);

      // Also show which items are truly unmatched
      const unmatchedItems = coverageItems.filter(item => item.unmatched);
      if (unmatchedItems.length > 0) {
        console.log("\nUnmatched Spec operations:");
        unmatchedItems.forEach(item => {
          const prefix = files.length > 1 ? `[${item.apiName}] ` : '';
          console.log(` - ${prefix}[${item.method}] ${item.path} (statusCode=${item.statusCode || ""})`);
        });
      }

      // 7. Generate HTML report with combined spec name
      const combinedSpecName = files.length > 1 ? 
        `Multiple APIs (${allSpecNames.join(', ')})` : 
        allSpecNames[0];
        
      const reportMeta = {
        timestamp: new Date().toLocaleString(),
        specName: combinedSpecName,
        postmanCollectionName: collectionName,
        undocumentedRequests,
        apiCount: files.length,
        apiNames: allSpecNames
      };

      let html;
      if (heatmap) {
        html = generateHeatmapReport({
          coverage,
          coverageItems,
          meta: reportMeta
        });
        console.log(`\nHeatmap report saved to: ${output}`);
      } else {
        html = generateHtmlReport({
          coverage,
          coverageItems,
          meta: reportMeta
        });
        console.log(`\nHTML report saved to: ${output}`);
      }

      fs.writeFileSync(path.resolve(output), html, "utf8");
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
