#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { Command } = require("commander");

const { loadAndParseSpec, extractOperationsFromSpec } = require("./lib/swagger");
const { loadPostmanCollection, extractRequestsFromPostman } = require("./lib/postman");
const { matchOperationsDetailed } = require("./lib/match");
const { generateHtmlReport } = require("./lib/report");

const program = new Command();

program
  .name("swagger-coverage-cli")
  .description(
    "CLI tool for comparing an OpenAPI/Swagger specification with a Postman collection, producing an enhanced HTML report"
  )
  .version("1.0.0")
  .argument("<swaggerFile>", "Path to the Swagger/OpenAPI file (JSON or YAML).")
  .argument("<postmanCollection>", "Path to the Postman collection (JSON).")
  .option("-v, --verbose", "Show verbose debug info")
  .option("--strict-query", "Enable strict validation of query parameters")
  .option("--strict-body", "Enable strict validation of requestBody (JSON)")
  .option("--output <file>", "HTML report output file", "coverage-report.html")
  .action(async (swaggerFile, postmanFile, options) => {
    try {
      const { verbose, strictQuery, strictBody, output } = options;

      // 1. Load & parse spec
      const spec = await loadAndParseSpec(swaggerFile);
      if (verbose) {
        console.log(
          "Specification loaded successfully:",
          spec.info.title,
          spec.info.version
        );
      }

      // 2. Extract spec operations
      const specOperations = extractOperationsFromSpec(spec, verbose);

      // 3. Load Postman collection
      const postmanData = loadPostmanCollection(postmanFile);
      if (verbose) {
        console.log(
          `Postman collection loaded successfully: "${postmanData.info.name}"`
        );
      }

      // 4. Extract Postman requests
      const postmanRequests = extractRequestsFromPostman(postmanData, verbose);

      // 5. Match operations in a "detailed" way that returns coverageItems
      const coverageItems = matchOperationsDetailed(specOperations, postmanRequests, {
        verbose,
        strictQuery,
        strictBody,
      });
      // coverageItems is an array of objects:
      // [
      //   {
      //     method: "GET",
      //     path: "/v2/artist/elements",
      //     name: "listElements",
      //     tags: ["Artists", "Collections"],
      //     expectedStatusCodes: ["200", "400"],
      //     statusCode: "200",
      //     unmatched: false,
      //     matchedRequests: [
      //       { name: "Get Elements (Postman)", rawUrl: "...", method: "GET", testedStatusCodes: ["200", "404"], scriptCode: "..." },
      //       ...
      //     ]
      //   },
      //   ...
      // ]

      // Calculate coverage: # of spec items that are NOT unmatched
      const totalSpecOps = coverageItems.length;
      const matchedCount = coverageItems.filter(item => !item.unmatched).length;
      const coverage = totalSpecOps ? (matchedCount / totalSpecOps) * 100 : 0;

      // 6. Print console summary
      console.log("=== Swagger Coverage Report ===");
      console.log(`Total operations in spec: ${totalSpecOps}`);
      console.log(`Matched operations in Postman: ${matchedCount}`);
      console.log(`Coverage: ${coverage.toFixed(2)}%`);

      // Also show which items are truly unmatched
      const unmatchedItems = coverageItems.filter(item => item.unmatched);
      if (unmatchedItems.length > 0) {
        console.log("\nUnmatched Spec operations:");
        unmatchedItems.forEach(item => {
          console.log(` - [${item.method}] ${item.path} (statusCode=${item.statusCode || ""})`);
        });
      }

      // 7. Generate HTML report (enhanced with nested tables, charts, etc.)
      const html = generateHtmlReport({
        coverage,
        coverageItems, // used by the expand/collapse table
        meta: {
          timestamp: new Date().toLocaleString(),
          specName: spec.info.title,
          postmanCollectionName: postmanData.info.name,
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
