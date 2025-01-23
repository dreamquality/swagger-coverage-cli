// report.js

"use strict";

/**
 * generateHtmlReport - enhanced version adding:
 *   - Coverage by Tags/Groups (an extra bar/donut chart)
 *   - PDF export button
 *   - Detailed Status Code checks in the sub-table
 *   - History/Trend Over Time displayed as a line chart next to the coverage pie
 *   - Nested expandable tables for JS test scripts with syntax highlighting
 *
 * coverageItems: [
 *   {
 *     method: "GET",
 *     path: "/v2/artist/elements",
 *     name: "listElements",
 *     tags: ["Artists", "Collections"],
 *     expectedStatusCodes: ["200","400"],
 *     statusCode: "200",
 *     unmatched: false,
 *     matchedRequests: [
 *       {
 *         name: "Get Elements (Postman)",
 *         rawUrl: "https://api.example.com/v2/artist/elements?foo=bar",
 *         method: "GET",
 *         testedStatusCodes: ["200","404"],
 *         testScripts: "pm.test('Status code is 200', function () { pm.response.to.have.status(200); });"
 *       },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
function generateHtmlReport({ coverage, coverageItems, meta }) {
  const { timestamp, specName, postmanCollectionName } = meta;
  const covered = coverage;
  const notCovered = 100 - coverage;

  // Convert coverageItems to JSON for client side
  const coverageDataJson = JSON.stringify(coverageItems);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enhanced Swagger Coverage Report</title>

  <!-- Basic Material-like style + dark theme classes -->
  <style>
    :root {
      --md-bg-color: #fafafa;
      --md-text-color: #212121;
      --md-surface-color: #ffffff;
      --md-table-header-bg: #f5f5f5;
      --md-table-hover: #eee;
      --md-subtable-bg: #e0f2e9; /* soft green for sub-tables */
      --md-primary-color: #6200ee; /* example, can adapt */
      --md-border-color: #ccc;
    }
    .dark-theme {
      --md-bg-color: #121212;
      --md-text-color: #eeeeee;
      --md-surface-color: #1e1e1e;
      --md-table-header-bg: #2a2a2a;
      --md-table-hover: #333333;
      --md-subtable-bg: #224f3b; /* darker green for sub-table in dark theme */
      --md-border-color: #666;
    }

    body {
      margin: 0;
      font-family: "Roboto", sans-serif;
      background-color: var(--md-bg-color);
      color: var(--md-text-color);
    }
    header {
      padding: 16px;
      background-color: var(--md-surface-color);
      position: relative;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 1.6rem;
    }
    .meta-info {
      font-size: 0.9em;
      opacity: 0.8;
    }
    .theme-toggle {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.4rem;
      opacity: 0.7;
      transition: opacity 0.3s;
    }
    .theme-toggle:hover {
      opacity: 1;
    }

    .top-buttons {
      padding: 8px 16px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    button {
      cursor: pointer;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      background-color: var(--md-primary-color);
      color: #fff;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    button:hover {
      background-color: #3700b3;
    }

    .coverage-section {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding: 16px;
    }
    .chart-container {
      width: 300px;
      max-width: 50%;
      position: relative;
    }
    .chart-title {
      text-align: center;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .coverage-text {
      min-width: 180px;
    }

    .trend-chart-container {
      width: 300px;
      max-width: 50%;
      position: relative;
    }

    .filter-container {
      padding: 0 16px 16px 16px;
    }
    .filter-button {
      margin-bottom: 10px;
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      background-color: var(--md-primary-color);
      color: #fff;
      font-weight: 500;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    th, td {
      border: 1px solid var(--md-border-color);
      padding: 8px;
    }
    th {
      background-color: var(--md-table-header-bg);
      text-align: left;
      cursor: pointer;
    }
    tr:hover {
      background-color: var(--md-table-hover);
    }
    tr.unmatched-spec > td.spec-cell {
      background-color: rgba(255,229,229, 0.7); /* light red */
    }
    tr.spec-row.matched {
      cursor: pointer;
    }
    .matched-requests-row {
      display: none;
    }
    .postman-table {
      border: 1px solid var(--md-border-color);
      margin-top: 5px;
      width: 100%;
      background-color: var(--md-subtable-bg);
    }
    .postman-table th {
      background-color: rgba(255,255,255,0.2);
    }

    /* Nested JS Code Table */
    .js-code-row {
      display: none;
    }
    .js-code-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
      background-color: #f0f0f0; /* Light grey for code table */
    }
    .js-code-table th, .js-code-table td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    .js-code-table th {
      background-color: #e0e0e0;
      text-align: left;
    }

    /* Footer */
    footer {
      text-align: center;
      font-size: 0.9em;
      opacity: 0.6;
      margin: 16px;
    }

    /* Highlight.js Styles */
    /* Выберите тему по вашему усмотрению на https://highlightjs.org/static/demo/ */
    .hljs {
      background: none;
      color: inherit;
    }
    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-literal,
    .hljs-section,
    .hljs-link {
      color: #d73a49;
      font-weight: bold;
    }
    .hljs-string,
    .hljs-title,
    .hljs-name,
    .hljs-type,
    .hljs-attr,
    .hljs-number,
    .hljs-selector-id,
    .hljs-selector-class {
      color: #005cc5;
    }
    .hljs-comment,
    .hljs-quote {
      color: #6a737d;
      font-style: italic;
    }
    .hljs-doctag,
    .hljs-meta,
    .hljs-tag .hljs-attr {
      color: #22863a;
      font-weight: bold;
    }
    .hljs-title.class_,
    .hljs-title.class_.inherited__,
    .hljs-title.function_,
    .hljs-title.function_.inherited__ {
      color: #6f42c1;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      margin: 1px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    .badge-green { background: #c8e6c9; color: #2e7d32; }
    .badge-yellow { background: #fff9c4; color: #f57f17; }
    .badge-red { background: #ffcdd2; color: #c62828; }
    
    .eye-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2em;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .eye-btn:hover { opacity: 1; }
  </style>
</head>
<body>

<header>
  <h1>Swagger Coverage Report</h1>
  <button class="theme-toggle" id="themeToggleBtn" onclick="toggleTheme()">
    &#128262; <!-- flashlight icon -->
  </button>
  <div class="meta-info">
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    <p><strong>API Spec:</strong> ${specName}</p>
    <p><strong>Postman Collection:</strong> ${postmanCollectionName}</p>
  </div>
</header>

<div class="top-buttons">
  <!-- Button to export to PDF -->
  <button onclick="exportToPDF()">Export PDF</button>
</div>

<section class="coverage-section">
  <!-- Coverage Pie Chart -->
  <div class="chart-container">
    <canvas id="coverageChart"></canvas>
    <div class="chart-title">Overall Coverage</div>
  </div>

  <!-- Trend chart container -->
  <div class="trend-chart-container">
    <canvas id="trendChart"></canvas>
    <div class="chart-title">Coverage Trend Over Time</div>
  </div>

  <!-- Tag coverage chart container -->
  <div class="chart-container">
    <canvas id="tagChart"></canvas>
    <div class="chart-title">Coverage by Tag</div>
  </div>

  <div class="coverage-text">
    <p><strong>Coverage:</strong> ${coverage.toFixed(2)}%</p>
    <p>Covered: ${covered.toFixed(2)}%<br/>
    Not Covered: ${notCovered.toFixed(2)}%</p>
  </div>
</section>

<div class="filter-container">
  <button class="filter-button" id="filterBtn" onclick="cycleFilterMode()">
    Show: All
  </button>

  <table id="specTable">
    <thead>
      <tr>
        <th onclick="sortTableBy('method')">Method</th>
        <th onclick="sortTableBy('path')">Path</th>
        <th onclick="sortTableBy('name')">Name</th>
        <th onclick="sortTableBy('statusCode')">StatusCode</th>
      </tr>
    </thead>
    <tbody id="specTbody">
      <!-- Rows rendered by JS -->
    </tbody>
  </table>
</div>

<footer>
  <p>Generated by swagger-coverage-cli</p>
</footer>

<!-- Chart.js from a CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- Highlight.js for code formatting -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
<script>
  // Initialize Highlight.js
  hljs.highlightAll();

  // coverageData from server
  let coverageData = ${coverageDataJson};

  // Merge duplicates for display only
  function unifyByMethodAndPath(items) {
    const result = {};
    items.forEach(item => {
      const key = (item.method + item.path).toLowerCase();
      if (!result[key]) {
        result[key] = { ...item, matchedRequests: [...item.matchedRequests] };
      } else {
        // Merge matchedRequests
        result[key].matchedRequests.push(...item.matchedRequests);
        // Merge tags if needed
        result[key].tags = Array.from(new Set([...result[key].tags, ...item.tags]));
        // Merge expectedStatusCodes
        result[key].expectedStatusCodes = Array.from(
          new Set([...result[key].expectedStatusCodes, ...item.expectedStatusCodes])
        );
        // If any item is matched, set unmatched = false
        if (!item.unmatched) result[key].unmatched = false;
      }
    });
    return Object.values(result);
  }

  // Sort direction
  let sortAsc = true;
  // Filter mode: "all", "matched", "unmatched"
  let filterMode = "all";
  // Method priority for custom sorting
  const methodPriority = ["get","post","put","patch","delete","head","options","trace"];

  // The "darkTheme" toggle
  let darkTheme = false;

  // On load
  window.onload = function() {
    coverageData = unifyByMethodAndPath(coverageData);
    // Save coverage in localStorage to build a trend
    updateCoverageHistory(${coverage.toFixed(2)});

    renderCoverageChart(${coverage.toFixed(2)});
    renderTrendChart();
    renderTagChart();
    renderTable();
  };

  // Render Trend Chart from localStorage coverageHistory
  function renderTrendChart() {
    let hist = localStorage.getItem('coverageHistory');
    let arr = hist ? JSON.parse(hist) : [];
    const labels = arr.map(e => new Date(e.timestamp).toLocaleDateString() + " " + new Date(e.timestamp).toLocaleTimeString());
    const dataPoints = arr.map(e => e.coverage);

    const ctx = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Coverage Trend (%)',
          data: dataPoints,
          borderColor: '#6200ee',
          backgroundColor: 'rgba(98, 0, 238, 0.1)',
          fill: true,
          tension: 0.2,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  // Render Tag coverage chart
  function renderTagChart() {
    // coverageData items might have tags: [...]
    // We'll group by tag => { total: X, matched: Y }
    let tagStats = {};
    coverageData.forEach(item => {
      let tags = item.tags || [];
      tags.forEach(tag => {
        if(!tagStats[tag]) {
          tagStats[tag] = { total: 0, matched: 0 };
        }
        tagStats[tag].total += 1;
        if(!item.unmatched) {
          tagStats[tag].matched += 1;
        }
      });
    });

    let labels = Object.keys(tagStats);
    let coverageVals = labels.map(t => (tagStats[t].matched / tagStats[t].total) * 100);

    const ctx = document.getElementById('tagChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tag Coverage (%)',
            data: coverageVals,
            backgroundColor: '#03dac6'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  // Render coverage pie chart
  function renderCoverageChart(cov) {
    const ctx = document.getElementById('coverageChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Covered', 'Not Covered'],
        datasets: [{
          data: [cov, 100 - cov],
          backgroundColor: ['#4caf50','#f44336']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // Export PDF via window.print() approach
  function exportToPDF() {
    window.print();
  }

  // Update localStorage coverage history
  function updateCoverageHistory(current) {
    let hist = localStorage.getItem('coverageHistory');
    let arr = hist ? JSON.parse(hist) : [];
    // Limit to 10 entries to avoid unbounded growth
    if (arr.length >= 10) {
      arr.shift();
    }
    arr.push({ timestamp: Date.now(), coverage: current });
    localStorage.setItem('coverageHistory', JSON.stringify(arr));
  }

  // Toggle theme
  function toggleTheme() {
    darkTheme = !darkTheme;
    document.body.classList.toggle('dark-theme', darkTheme);
    const btn = document.getElementById('themeToggleBtn');
    btn.innerHTML = darkTheme ? '&#9788;' : '&#128262;'; 
    // e.g., sun (☀) vs flashlight (🔦)
  }

  // Cycle the filter mode: all -> matched -> unmatched -> all ...
  function cycleFilterMode() {
    if (filterMode === 'all') {
      filterMode = 'matched';
    } else if (filterMode === 'matched') {
      filterMode = 'unmatched';
    } else {
      filterMode = 'all';
    }
    renderTable();
    const filterBtn = document.getElementById('filterBtn');
    filterBtn.textContent = 'Show: ' + (filterMode.charAt(0).toUpperCase() + filterMode.slice(1));
  }

  // Add helper function for color-coded status code badges
  function buildStatusBadges(specCodes, testedCodes) {
    const specSet = new Set(specCodes || []);
    const testSet = new Set(testedCodes || []);
    let result = '';
    
    // Check if all spec codes were found in tests
    const allFound = Array.from(specSet).every(code => testSet.has(code));

    // For spec codes, use green if all found, else use appropriate colors
    specSet.forEach(code => {
      const badgeClass = allFound ? 'badge-green' : 
                        testSet.has(code) ? 'badge-green' : 'badge-red';
      result += '<span class="badge ' + badgeClass + '">' + code + '</span> ';
    });

    // For extra tested codes not in spec, use yellow
    testSet.forEach(code => {
      if (!specSet.has(code)) {
        result += '<span class="badge badge-yellow">' + code + '</span> ';
      }
    });

    return result.trim();
  }

  // Render the main table
  function renderTable() {
    const tbody = document.getElementById('specTbody');
    tbody.innerHTML = '';

    const filtered = coverageData.filter(item => {
      if(filterMode === 'matched') return !item.unmatched;
      if(filterMode === 'unmatched') return item.unmatched;
      return true; // 'all'
    });

    filtered.forEach((item, idx) => {
      const rowClass = item.unmatched ? "unmatched-spec" : "";
      const hasMatches = item.matchedRequests && item.matchedRequests.length > 0;
      const tr = document.createElement('tr');
      tr.className = "spec-row " + rowClass;

      // Only matched items get the onclick
      if (hasMatches) {
        tr.classList.add("matched");
        const rowId = "match-row-" + idx;
        tr.onclick = () => toggleMatchedRow(rowId);
      }

      // Columns
      const tdMethod = document.createElement('td');
      tdMethod.className = "spec-cell";
      tdMethod.textContent = (item.method || "").toUpperCase();

      const tdPath = document.createElement('td');
      tdPath.className = "spec-cell";
      tdPath.textContent = item.path || "";

      const tdName = document.createElement('td');
      tdName.className = "spec-cell";
      tdName.textContent = item.name || item.summary || item.operationId || '(No operationId in spec)';

      const tdStatus = document.createElement('td');
      tdStatus.className = "spec-cell";
      tdStatus.innerHTML = buildStatusBadges(
        item.expectedStatusCodes,
        item.matchedRequests.flatMap(req => req.testedStatusCodes || [])
      );

      tr.appendChild(tdMethod);
      tr.appendChild(tdPath);
      tr.appendChild(tdName);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);

      // If matched, add a hidden sub-row with the postman requests
      if(hasMatches) {
        const subTr = document.createElement('tr');
        subTr.id = "match-row-" + idx;
        subTr.className = "matched-requests-row";

        const subTd = document.createElement('td');
        subTd.colSpan = 4;

        const pmTable = document.createElement('table');
        pmTable.className = "postman-table";

        // Extra column for Detailed Status Code Checks
        const pmThead = document.createElement('thead');
        pmThead.innerHTML = '<tr><th>Postman Request Name</th><th>Method</th><th>URL</th><th>Codes (Spec vs. Tested)</th><th>Test Scripts</th></tr>';
        pmTable.appendChild(pmThead);

        const pmTbody = document.createElement('tbody');
        item.matchedRequests.forEach(pmReq => {
          const pmRow = document.createElement('tr');

          const pmName = document.createElement('td');
          pmName.textContent = pmReq.name || "";
          pmRow.appendChild(pmName);

          const pmMethod = document.createElement('td');
          pmMethod.textContent = (pmReq.method || "").toUpperCase();
          pmRow.appendChild(pmMethod);

          const pmUrl = document.createElement('td');
          pmUrl.textContent = pmReq.rawUrl || "";
          pmRow.appendChild(pmUrl);

          // Detailed Status Code checks:
          // Show "Spec: 200,400 | Tested: 200,404"
          const pmCodes = document.createElement('td');
          const expectedCodes = (item.expectedStatusCodes || []).join(", ");
          const testedCodes = (pmReq.testedStatusCodes || []).join(", ");
          pmCodes.innerHTML = buildStatusBadges(expectedCodes.split(", "), testedCodes.split(", "));
          pmRow.appendChild(pmCodes);

          // Test Scripts with eye icon for long content
          const pmScripts = document.createElement('td');
          if(pmReq.testScripts) {
            if(pmReq.testScripts.length > 100) {
              const id = 'script_' + idx + '_' + Math.random().toString(36).substr(2,9);
              pmScripts.innerHTML = 
                '<button class="eye-btn" onclick="toggleScript(\\'' + id + '\\')">👁</button>' +
                '<div id="' + id + '" style="display:none">' +
                  '<pre><code class="javascript">' + pmReq.testScripts + '</code></pre>' +
                '</div>';
            } else {
              const pre = document.createElement('pre');
              const code = document.createElement('code');
              code.className = 'javascript';
              code.textContent = pmReq.testScripts;
              pre.appendChild(code);
              pmScripts.appendChild(pre);
            }
          } else {
            pmScripts.textContent = 'No scripts found';
          }
          pmRow.appendChild(pmScripts);

          pmTbody.appendChild(pmRow);
        });
        pmTable.appendChild(pmTbody);

        subTd.appendChild(pmTable);
        subTr.appendChild(subTd);
        tbody.appendChild(subTr);
      }
    });

    // Re-initialize Highlight.js for new code blocks
    hljs.highlightAll();
  }

  // Toggle the matched requests sub-row
  function toggleMatchedRow(rowId) {
    const row = document.getElementById(rowId);
    if(!row) return;
    row.style.display = (row.style.display === 'none' || row.style.display === '') ? 'table-row' : 'none';
  }

  // Sort coverageData
  function sortTableBy(columnKey) {
    coverageData.sort((a, b) => {
      let valA = a[columnKey] || "";
      let valB = b[columnKey] || "";

      if(columnKey === "method") {
        const mA = valA.toLowerCase();
        const mB = valB.toLowerCase();
        const iA = methodPriority.indexOf(mA);
        const iB = methodPriority.indexOf(mB);
        if(iA !== -1 && iB !== -1) {
          return sortAsc ? iA - iB : iB - iA;
        }
        if(iA !== -1 && iB === -1) {
          return sortAsc ? -1 : 1;
        }
        if(iB !== -1 && iA === -1) {
          return sortAsc ? 1 : -1;
        }
      }

      // Fallback to standard string compare
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      if(valA < valB) return sortAsc ? -1 : 1;
      if(valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    sortAsc = !sortAsc;
    renderTable();
  }

  // Add toggle script function
  function toggleScript(id) {
    const codeBlock = document.getElementById(id);
    const btn = codeBlock.previousElementSibling;
    const isHidden = codeBlock.style.display === 'none';
    
    codeBlock.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '🔒' : '👁';
  }

</script>
</body>
</html>
`;

  return html;
}

module.exports = { generateHtmlReport };
