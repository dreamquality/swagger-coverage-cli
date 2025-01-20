const XLSX = require('xlsx');

/**
 * loadExcelSpec - Reads an Excel file and returns an array of operations:
 *   [
 *     {
 *       method: "GET",
 *       path: "/v2/artist/elements",
 *       name: "listElements",
 *       tags: ["Artists","Collections"],
 *       expectedStatusCodes: ["200"],
 *       statusCode: "200",
 *       requestBodyContent: [],
 *       ...
 *     },
 *     ...
 *   ]
 */
function loadExcelSpec(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("No sheets found in Excel file.");
    }

    const operations = [];
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      rows.forEach(row => {
        const method = (row.METHOD || "GET").toLowerCase();
        const path = row.URI || "";
        const name = row.NAME || "";
        const tags = row.TAGS ? row.TAGS.split(",").map(t => t.trim()) : [];
        const statusCode = row["STATUS CODE"] || "";
        const expectedStatusCodes = statusCode ? [statusCode] : [];
        const requestBodyContent = row.BODY ? ["application/json"] : [];

        operations.push({
          method,
          path,
          operationId: name,
          summary: name,
          tags,
          statusCode,
          expectedStatusCodes,
          requestBodyContent
        });
      });
    });

    return operations;
  } catch (err) {
    throw new Error(`Error parsing Excel file: ${err.message}`);
  }
}

module.exports = { loadExcelSpec };