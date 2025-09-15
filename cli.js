#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { Command } = require("commander");

const { loadAndParseSpec, extractOperationsFromSpec } = require("./lib/swagger");
const { loadPostmanCollection, extractRequestsFromPostman } = require("./lib/postman");
const { matchOperationsDetailed } = require("./lib/match");
const { generateHtmlReport } = require("./lib/report");
const { loadExcelSpec } = require("./lib/excel");

const program = new Command();

program
  .name("swagger-coverage-cli")
  .description(
    "CLI tool for comparing OpenAPI/Swagger specifications with a Postman collection, producing an enhanced HTML report"
  )
  .version("1.0.1")
  .argument("<swaggerFiles>", "Path(s) to the Swagger/OpenAPI file(s) (JSON or YAML). Use comma-separated values for multiple files.")
  .argument("<postmanCollection>", "Path to the Postman collection (JSON).")
  .option("-v, --verbose", "Show verbose debug info")
  .option("--strict-query", "Enable strict validation of query parameters")
  .option("--strict-body", "Enable strict validation of requestBody (JSON)")
  .option("--output <file>", "HTML report output file", "coverage-report.html")
  .action(async (swaggerFiles, postmanFile, options) => {
    try {
      const { verbose, strictQuery, strictBody, output } = options;

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

      // Ensure Postman file exists
      if (!fs.existsSync(postmanFile)) {
        throw new Error(`Postman file not found: ${postmanFile}`);
      }

      // Safely parse Postman JSON
      let postmanData;
      try {
        const rawPostman = fs.readFileSync(postmanFile, "utf8");
        if (!rawPostman.trim()) {
          throw new Error("Postman file is empty.");
        }
        postmanData = JSON.parse(rawPostman);
      } catch (err) {
        throw new Error(`Unable to parse Postman JSON: ${err.message}`);
      }

      if (verbose) {
        console.log(
          `Postman collection loaded successfully: "${postmanData.info.name}"`
        );
      }

      // 4. Extract Postman requests
      const postmanRequests = extractRequestsFromPostman(postmanData, verbose);

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
      console.log(`Matched operations in Postman: ${matchedCount}`);
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
        
      const html = generateHtmlReport({
        coverage,
        coverageItems,
        meta: {
          timestamp: new Date().toLocaleString(),
          specName: combinedSpecName,
          postmanCollectionName: postmanData.info.name,
          undocumentedRequests,
          apiCount: files.length,
          apiNames: allSpecNames
        },
      });

      fs.writeFileSync(path.resolve(output), html, "utf8");
      console.log(`\nHTML report saved to: ${output}`);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
