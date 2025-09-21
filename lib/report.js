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
  const { timestamp, specName, postmanCollectionName, apiCount = 1, apiNames = [] } = meta;
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
      justify-content: center; /* Center containers horizontally */
      gap: 20px;
      padding: 16px;
    }
    .chart-container {
      width: 300px;
      max-width: 50%;
      position: relative;
      height: 400px; /* Fixed height for chart */
      margin-bottom: 30px; /* Add bottom margin */
    }

    /* Special styling for tag chart container */
    .chart-container:nth-child(3) {
      width: 750px;  /* 300px * 2.5 = 750px */
      max-width: 100%; /* Allow full width */
    }

    /* При большом количестве тегов увеличиваем высоту */
    @media (min-height: 1000px) {
      .chart-container {
        height: 600px; /* Increase height for many tags */
      }
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
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .search-container {
      position: relative;
      flex: 1;
      max-width: 300px;
    }

    .search-input {
      width: 100%;
      padding: 8px 16px;
      border: 1px solid var(--md-primary-color);
      border-radius: 20px;
      outline: none;
      background: var(--md-surface-color);
      color: var(--md-text-color);
      font-size: 0.9rem;
      transition: border-color 0.3s, box-shadow 0.3s;
    }

    .search-input:focus {
      border-color: var(--md-primary-color);
      box-shadow: 0 0 0 2px rgba(98, 0, 238, 0.2);
    }

    .search-input::placeholder {
      color: rgba(0, 0, 0, 0.5);
    }

    .dark-theme .search-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
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

    /* Smart Mapping Badges */
    .primary-match-badge {
      background-color: #4caf50;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      margin-left: 5px;
      font-weight: bold;
    }
    .confidence-badge {
      background-color: #2196f3;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      margin-left: 5px;
      font-weight: bold;
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

    /* Tooltip styles */
    [data-tooltip] {
      position: relative;
      cursor: help;
    }

    [data-tooltip]:hover:after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 100;
      margin-bottom: 4px;
    }

    /* Ensure tooltips are visible even in dark theme */
    .dark-theme [data-tooltip]:hover:after {
      background: rgba(255, 255, 255, 0.9);
      color: black;
    }

    .recommendation-icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      background-color: #ffd700;
      color: #000;
      border-radius: 50%;
      cursor: pointer;
      font-weight: bold;
    }

    .recommendation-text {
      display: none;
    }

    .recommendation-text.visible {
      display: block;
    }

    /* Update the code-toggle style to remove background color */
    .code-toggle {
      display: inline-block;
      color: #ffd700;
      cursor: pointer;
      font-family: monospace;
      font-weight: bold;
      font-size: 14px;
      transition: opacity 0.2s;
    }
    .code-toggle:hover {
      opacity: 0.8;
    }
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
    <p><strong>API Spec${apiCount > 1 ? 's' : ''}:</strong> ${specName}</p>
    ${apiCount > 1 ? `<p><strong>Individual APIs:</strong> ${apiNames.join(', ')}</p>` : ''}
    <p><strong>Postman Collection:</strong> ${postmanCollectionName}</p>
    <p><strong>Coverage:</strong> ${coverage.toFixed(2)}%</p>
    <p>Covered: ${covered.toFixed(2)}%<br/>
    Not Covered: ${notCovered.toFixed(2)}%</p>
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
</section>

<div class="filter-container">
  <button class="filter-button" id="filterBtn" onclick="cycleFilterMode()">
    Show: All
  </button>
  <div class="search-container">
    <input type="text" 
           class="search-input" 
           id="searchInput" 
           placeholder="Search..."
           oninput="filterTable()">
  </div>
</div>

  <table id="specTable">
    <thead>
      <tr>
        ${apiCount > 1 ? '<th onclick="sortTableBy(\'apiName\')">API</th>' : ''}
        <th onclick="sortTableBy('protocol')">Protocol</th>
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
  let apiCount = ${apiCount};

  // Merge duplicates for display only
  function unifyByMethodAndPath(items) {
    const result = {};
    items.forEach(item => {
      // Include API name in the key for multiple APIs to keep them separate
      const key = apiCount > 1 ? 
        (item.method + item.path + (item.apiName || '')).toLowerCase() :
        (item.method + item.path).toLowerCase();
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
    // Получаем все уникальные теги из спецификации
    let allTags = new Set();
    
    // Сначала собираем все теги из операций
    coverageData.forEach(item => {
      (item.tags || []).forEach(tag => allTags.add(tag));
    });

    // Инициализируем статистику для всех тегов
    let tagStats = {};
    allTags.forEach(tag => {
      tagStats[tag] = { total: 0, matched: 0 };
    });

    // Теперь подсчитываем статистику
    coverageData.forEach(item => {
      let tags = item.tags || [];
      tags.forEach(tag => {
        tagStats[tag].total += 1;
        if(!item.unmatched) {
          tagStats[tag].matched += 1;
        }
      });
    });

    // Сортируем теги по алфавиту для лучшей читаемости
    let labels = Object.keys(tagStats).sort();
    let coverageVals = labels.map(t => {
      // Если total === 0, возвращаем 0 чтобы избежать деления на ноль
      return tagStats[t].total === 0 ? 0 : (tagStats[t].matched / tagStats[t].total) * 100;
    });

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
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          },
          x: {
            ticks: {
              autoSkip: false, // Disable auto-skip
              maxRotation: 45, // Rotate labels for better readability 
              minRotation: 45
            }
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
    const filterBtn = document.getElementById('filterBtn');
    filterBtn.textContent = 'Show: ' + (filterMode.charAt(0).toUpperCase() + filterMode.slice(1));
    filterTable();
  }

  // Add helper function for color-coded status code badges
  function buildStatusBadges(specCodes, testedCodes) {
    const specSet = new Set(specCodes || []);
    const testSet = new Set(testedCodes || []);
    let result = '';
    
    // Check if all spec codes were found in tests
    const allFound = Array.from(specSet).every(code => testSet.has(code));

    // For spec codes, use green if found in tests, red if not
    specSet.forEach(code => {
      const badgeClass = testSet.has(code) ? 'badge-green' : 'badge-red';
      const tooltip = testSet.has(code) 
        ? 'Documented and verified'
        : 'Documented but not verified';
      result += '<span class="badge ' + badgeClass + '" data-tooltip="' + tooltip + '">' + code + '</span> ';
    });

    // For extra tested codes not in spec, use yellow
    testSet.forEach(code => {
      if (!specSet.has(code)) {
        const tooltip = 'Not documented';
        result += '<span class="badge badge-yellow" data-tooltip="' + tooltip + '">' + code + '</span> ';
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
      // Add API name column if multiple APIs
      if (apiCount > 1) {
        const tdApi = document.createElement('td');
        tdApi.className = "spec-cell";
        tdApi.textContent = item.apiName || '';
        tr.appendChild(tdApi);
      }

      // Add protocol column
      const tdProtocol = document.createElement('td');
      tdProtocol.className = "spec-cell protocol-cell";
      const protocol = item.protocol || 'rest';
      tdProtocol.textContent = protocol.toUpperCase();
      // Add styling based on protocol
      if (protocol === 'grpc') {
        tdProtocol.style.color = '#4caf50';
        tdProtocol.style.fontWeight = 'bold';
      } else if (protocol === 'graphql') {
        tdProtocol.style.color = '#e91e63';
        tdProtocol.style.fontWeight = 'bold';
      } else {
        tdProtocol.style.color = '#2196f3';
      }
      tr.appendChild(tdProtocol);

      const tdMethod = document.createElement('td');
      tdMethod.className = "spec-cell";
      tdMethod.textContent = (item.method || "").toUpperCase();

      const tdPath = document.createElement('td');
      tdPath.className = "spec-cell";
      tdPath.textContent = item.path || "";

      const tdName = document.createElement('td');
      tdName.className = "spec-cell";
      let nameContent = item.name || item.summary || item.operationId || '(No operationId in spec)';
      
      // Add smart mapping indicators
      if (item.isPrimaryMatch) {
        nameContent += ' <span class="primary-match-badge" title="Primary Match">Primary</span>';
      }
      if (item.matchConfidence && item.matchConfidence < 1.0) {
        const confidence = Math.round(item.matchConfidence * 100);
        nameContent += ' <span class="confidence-badge" title="Match Confidence: ' + confidence + '%">' + confidence + '%</span>';
      }
      
      tdName.innerHTML = nameContent;

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
        subTd.colSpan = apiCount > 1 ? 6 : 5;

        const pmTable = document.createElement('table');
        pmTable.className = "postman-table";

        // Update column header from "Codes (Spec vs. Tested)" to "Recommendation"
        const pmThead = document.createElement('thead');
        pmThead.innerHTML = '<tr><th>Postman Request Name</th><th>Method</th><th>URL</th><th>Recommendation</th><th>Test Scripts</th></tr>';
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

          // Replace status code badges with recommendations
          const pmCodes = document.createElement('td');
          const recommendations = generateRecommendations(pmReq, item);
          
          if (recommendations.length > 0) {
            const icon = document.createElement('div');
            icon.className = 'recommendation-icon';
            icon.textContent = '!';
            icon.onclick = function(e) {
              e.stopPropagation(); // Prevent row expansion
              this.style.display = 'none';
              text.classList.add('visible');
            };

            const text = document.createElement('div');
            text.className = 'recommendation-text';
            text.innerHTML = '<ul style="margin: 0; padding-left: 20px; color: var(--md-text-color);">' +
              recommendations.map(r => '<li>' + r + '</li>').join('') + '</ul>';
            text.onclick = function(e) {
              e.stopPropagation(); // Prevent row expansion
              this.classList.remove('visible');
              icon.style.display = 'inline-block';
            };

            pmCodes.appendChild(icon);
            pmCodes.appendChild(text);
          } else {
            pmCodes.innerHTML = '<span style="color: var(--md-text-color);">All recommended tests are present</span>';
          }

          pmRow.appendChild(pmCodes);

          // Update the Test Scripts cell generation code
          const pmScripts = document.createElement('td');
          if(pmReq.testScripts) {
            if(pmReq.testScripts.length > 100) {
              const id = 'script_' + idx + '_' + Math.random().toString(36).substr(2,9);
              const codeToggle = document.createElement('div');
              codeToggle.className = 'code-toggle';
              codeToggle.textContent = '</>';
              codeToggle.style.display = 'inline-block';
              codeToggle.id = 'toggle_' + id;
              codeToggle.onclick = function(e) {
                e.stopPropagation();
                this.style.display = 'none';
                codeBlock.style.display = 'block';
              };

              const codeBlock = document.createElement('div');
              codeBlock.id = id;
              codeBlock.style.display = 'none'; // Initially hidden
              codeBlock.innerHTML = '<pre><code class="javascript">' + pmReq.testScripts + '</code></pre>';
              codeBlock.onclick = function(e) {
                e.stopPropagation();
                this.style.display = 'none';
                codeToggle.style.display = 'block';
              };

              pmScripts.appendChild(codeToggle);
              pmScripts.appendChild(codeBlock);
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
    filterTable();
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

  // Update the generateRecommendations function to return array instead of HTML
  function generateRecommendations(pmReq, item) {
    const recommendations = [];
    const testScripts = pmReq.testScripts || '';
    const method = (pmReq.method || '').toUpperCase();
    
    const hasResponseTimeTest = /pm\.response\.responseTime|pm\.expect\([^)]*responseTime[^)]*\)|pm\.response\.time/i.test(testScripts);
    if (!hasResponseTimeTest) {
      recommendations.push('Missing response time validation');
    }

    const hasSchemaValidation = /pm\.response\.json\(\).*schema|tv4\.validate|ajv\.validate|expect\(.*\)\.to\.match\.schema/i.test(testScripts);
    if (!hasSchemaValidation && !(method === 'DELETE' && pmReq.testedStatusCodes.includes('204'))) {
      recommendations.push('Missing JSON schema validation');
    }

    if (method !== 'DELETE' && item.requestBodyContent) {
      recommendations.push('Consider testing boundary values');
    }

    const hasPaginationTerms = /page|per[_-]?page|perPage|perpage|Page|limit|offset|size|from|to|&[^=]*(?:page|perPage|per_page|limit|offset|size)[^&]*/i.test(testScripts);
    if (!hasPaginationTerms && method !== 'DELETE') {
      recommendations.push('Consider testing pagination if applicable');
    }

    if (method === 'PATCH') {
      recommendations.push('Verify all partial update scenarios');
    }

    return recommendations;
  }

  // Add new function for table filtering by search
  function filterTable() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#specTable tbody tr.spec-row');
    
    rows.forEach(row => {
      // Column indices adjust based on whether we have API column and protocol column
      let colIndex = 1;
      if (${apiCount > 1}) colIndex++; // API column
      colIndex++; // Protocol column
      
      const method = row.querySelector(\`td:nth-child(\${colIndex})\`).textContent;
      const path = row.querySelector(\`td:nth-child(\${colIndex + 1})\`).textContent;
      const name = row.querySelector(\`td:nth-child(\${colIndex + 2})\`).textContent;
      
      // Include protocol in search
      const protocolIndex = ${apiCount > 1} ? 2 : 1;
      const protocol = row.querySelector(\`td:nth-child(\${protocolIndex})\`).textContent;
      
      const text = method + ' ' + path + ' ' + name.toLowerCase() + ' ' + protocol.toLowerCase();
      
      const matchesSearch = searchText === '' || text.includes(searchText);
      const matchesFilter = (filterMode === 'all') || 
                          (filterMode === 'matched' && !row.classList.contains('unmatched-spec')) ||
                          (filterMode === 'unmatched' && row.classList.contains('unmatched-spec'));
      
      row.style.display = matchesSearch && matchesFilter ? '' : 'none';
            // Hide corresponding matched-requests-row if parent is hidden      const rowId = row.getAttribute('onclick')?.match(/toggleMatchedRow\('(.+?)'\)/)?.[1];      if (rowId) {        const matchedRow = document.getElementById(rowId);        if (matchedRow) {          matchedRow.style.display = 'none';        }      }
    });
  }
</script>
</body>
</html>
`;

  return html;
}

/**
 * generateGraphHtmlReport - generates an expandable tree visualization of API coverage
 * using D3.js to show hierarchical structure with expandable nodes and color coding
 */
function generateGraphHtmlReport({ coverage, coverageItems, meta }) {
  const { timestamp, specName, postmanCollectionName, apiCount = 1, apiNames = [] } = meta;
  
  // Create hierarchical tree structure
  function buildHierarchy(items) {
    const root = {
      name: 'API Coverage',
      children: [],
      type: 'root',
      status: 'root'
    };

    // Group by API name first (if multiple APIs)
    const apiGroups = {};
    items.forEach(item => {
      const apiName = item.apiName || 'Main API';
      if (!apiGroups[apiName]) {
        apiGroups[apiName] = [];
      }
      apiGroups[apiName].push(item);
    });

    Object.keys(apiGroups).forEach(apiName => {
      const apiNode = {
        name: apiName,
        children: [],
        type: 'api',
        status: 'group'
      };

      // Group by tags within each API
      const tagGroups = {};
      apiGroups[apiName].forEach(item => {
        const tag = (item.tags && item.tags.length > 0) ? item.tags[0] : 'General';
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(item);
      });

      Object.keys(tagGroups).forEach(tag => {
        const tagNode = {
          name: tag,
          children: [],
          type: 'tag',
          status: 'group'
        };

        // Group by base path within each tag
        const pathGroups = {};
        tagGroups[tag].forEach(item => {
          const basePath = item.path.split('/').slice(0, 3).join('/') || '/';
          if (!pathGroups[basePath]) {
            pathGroups[basePath] = [];
          }
          pathGroups[basePath].push(item);
        });

        Object.keys(pathGroups).forEach(basePath => {
          const pathNode = {
            name: basePath,
            children: [],
            type: 'path',
            status: 'group'
          };

          // Add individual endpoints
          pathGroups[basePath].forEach(item => {
            const status = item.unmatched ? 'not-covered' : 
                          (item.matchedRequests && item.matchedRequests.length > 0 ? 'covered' : 'partial');
            
            pathNode.children.push({
              name: `${item.method} ${item.path}`,
              method: item.method,
              path: item.path,
              status,
              type: 'endpoint',
              coverage: item.unmatched ? 0 : 100,
              matchedRequests: item.matchedRequests || [],
              operationName: item.name
            });
          });

          tagNode.children.push(pathNode);
        });

        apiNode.children.push(tagNode);
      });

      root.children.push(apiNode);
    });

    return root;
  }

  const treeData = buildHierarchy(coverageItems);
  const treeDataJson = JSON.stringify(treeData);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Coverage Tree Report</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background-color: #f8fafc;
      color: #334155;
      line-height: 1.6;
    }
    
    header {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    h1 {
      margin: 0 0 16px 0;
      font-size: 2rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .meta-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      max-width: 1000px;
      margin: 0 auto;
      font-size: 0.95em;
    }
    
    .meta-card {
      background: rgba(255,255,255,0.1);
      padding: 12px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    
    .meta-label {
      font-weight: 600;
      opacity: 0.9;
      margin-bottom: 4px;
    }
    
    .meta-value {
      font-size: 1.1em;
      font-weight: 700;
    }
    
    .coverage-highlight {
      font-size: 1.3em;
      color: #fbbf24;
    }
    
    .controls {
      background: white;
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .tree-controls {
      text-align: center;
      margin-bottom: 16px;
    }
    
    .tree-btn {
      margin: 0 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    }
    
    .tree-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
    }
    
    .legend {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 24px;
    }
    
    .legend h3 {
      margin: 0;
      color: #475569;
      font-weight: 600;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      font-weight: 500;
    }
    
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .covered { background-color: #10b981; }
    .partial { background-color: #f59e0b; }
    .not-covered { background-color: #ef4444; }
    .group { background-color: #3b82f6; }
    
    .main-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .tree-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    
    .tree-node {
      border-bottom: 1px solid #f1f5f9;
    }
    
    .tree-node:last-child {
      border-bottom: none;
    }
    
    .node-header {
      padding: 16px 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      user-select: none;
    }
    
    .node-header:hover {
      background-color: #f8fafc;
    }
    
    .node-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      flex-shrink: 0;
    }
    
    .expand-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: #e2e8f0;
      color: #475569;
      font-size: 14px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    .expand-icon.expanded {
      background: #3b82f6;
      color: white;
      transform: rotate(90deg);
    }
    
    .node-content {
      flex: 1;
      min-width: 0;
    }
    
    .node-title {
      font-weight: 600;
      font-size: 1rem;
      color: #1e293b;
      margin-bottom: 2px;
    }
    
    .node-subtitle {
      font-size: 0.85em;
      color: #64748b;
    }
    
    .node-stats {
      display: flex;
      gap: 16px;
      margin-left: auto;
      flex-shrink: 0;
    }
    
    .stat-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 600;
      color: white;
    }
    
    .children {
      background: #f8fafc;
      border-left: 3px solid #e2e8f0;
      margin-left: 20px;
      display: none;
    }
    
    .children.expanded {
      display: block;
    }
    
    .endpoint {
      padding: 12px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .endpoint:last-child {
      border-bottom: none;
    }
    
    .method-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 700;
      text-transform: uppercase;
      min-width: 50px;
      text-align: center;
    }
    
    .method-get { background: #10b981; color: white; }
    .method-post { background: #3b82f6; color: white; }
    .method-put { background: #f59e0b; color: white; }
    .method-patch { background: #8b5cf6; color: white; }
    .method-delete { background: #ef4444; color: white; }
    
    .endpoint-path {
      font-family: 'Monaco', 'Consolas', monospace;
      flex: 1;
      font-size: 0.9em;
      color: #475569;
    }
    
    .endpoint-status {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .test-count {
      font-size: 0.8em;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 10px;
    }
    
    footer {
      text-align: center;
      padding: 24px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.9em;
      margin-top: 40px;
    }
    
    @media (max-width: 768px) {
      .meta-info {
        grid-template-columns: 1fr;
        text-align: left;
      }
      
      .legend {
        justify-content: flex-start;
        gap: 16px;
      }
      
      .tree-btn {
        margin: 4px;
        padding: 8px 16px;
        font-size: 13px;
      }
      
      .node-stats {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>API Coverage Tree Report</h1>
    <div class="meta-info">
      <div class="meta-card">
        <div class="meta-label">Generated</div>
        <div class="meta-value">${timestamp}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">API Spec${apiCount > 1 ? 's' : ''}</div>
        <div class="meta-value">${specName}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Test Collection</div>
        <div class="meta-value">${postmanCollectionName}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Coverage</div>
        <div class="meta-value coverage-highlight">${coverage.toFixed(2)}%</div>
      </div>
    </div>
  </header>
  
  <div class="controls">
    <div class="tree-controls">
      <button class="tree-btn" onclick="expandAll()">📖 Expand All</button>
      <button class="tree-btn" onclick="collapseAll()">📚 Collapse All</button>
      <button class="tree-btn" onclick="showOnlyCovered()">✅ Show Covered</button>
      <button class="tree-btn" onclick="showOnlyUncovered()">❌ Show Uncovered</button>
      <button class="tree-btn" onclick="showAll()">👀 Show All</button>
    </div>
    <div class="legend">
      <h3>Coverage Status:</h3>
      <div class="legend-item">
        <span class="legend-color covered"></span>
        <span>Covered (${coverageItems.filter(item => !item.unmatched && item.matchedRequests && item.matchedRequests.length > 0).length})</span>
      </div>
      <div class="legend-item">
        <span class="legend-color partial"></span>
        <span>Partial (${coverageItems.filter(item => !item.unmatched && (!item.matchedRequests || item.matchedRequests.length === 0)).length})</span>
      </div>
      <div class="legend-item">
        <span class="legend-color not-covered"></span>
        <span>Not Covered (${coverageItems.filter(item => item.unmatched).length})</span>
      </div>
      <div class="legend-item">
        <span class="legend-color group"></span>
        <span>Groups</span>
      </div>
    </div>
  </div>
  
  <div class="main-content">
    <div class="tree-container" id="tree-container">
      <!-- Tree will be generated here -->
    </div>
  </div>
  
  <footer>
    <p>Generated by swagger-coverage-cli - Interactive tree visualization shows API endpoints hierarchically with coverage status</p>
  </footer>

  <script>
    // Tree data
    const treeData = ${treeDataJson};
    
    function renderTree() {
      const container = document.getElementById('tree-container');
      container.innerHTML = renderNode(treeData, 0);
    }
    
    function renderNode(node, level) {
      const isEndpoint = node.type === 'endpoint';
      const hasChildren = node.children && node.children.length > 0;
      const statusClass = node.status || 'group';
      
      let html = '';
      
      if (isEndpoint) {
        // Render endpoint
        const testCount = node.matchedRequests ? node.matchedRequests.length : 0;
        html += \`
          <div class="endpoint" data-status="\${statusClass}">
            <span class="method-badge method-\${node.method.toLowerCase()}">\${node.method}</span>
            <span class="endpoint-path">\${node.path}</span>
            <span class="endpoint-status \${statusClass}"></span>
            \${testCount > 0 ? \`<span class="test-count">\${testCount} test\${testCount !== 1 ? 's' : ''}</span>\` : ''}
          </div>
        \`;
      } else {
        // Render group node
        const childrenCount = hasChildren ? node.children.length : 0;
        const coveredChildren = hasChildren ? 
          node.children.filter(child => {
            if (child.type === 'endpoint') {
              return child.status === 'covered';
            } else if (child.children) {
              return child.children.some(grandchild => grandchild.status === 'covered');
            }
            return false;
          }).length : 0;
        
        const nodeId = \`node-\${Math.random().toString(36).substr(2, 9)}\`;
        
        html += \`
          <div class="tree-node">
            <div class="node-header" onclick="toggleNode('\${nodeId}')">
              \${hasChildren ? \`<div class="expand-icon" id="icon-\${nodeId}">▶</div>\` : '<div style="width: 20px;"></div>'}
              <div class="node-icon \${statusClass}">\${getNodeIcon(node.type)}</div>
              <div class="node-content">
                <div class="node-title">\${node.name}</div>
                \${childrenCount > 0 ? \`<div class="node-subtitle">\${childrenCount} item\${childrenCount !== 1 ? 's' : ''}\${coveredChildren > 0 ? \` • \${coveredChildren} covered\` : ''}</div>\` : ''}
              </div>
              \${childrenCount > 0 ? \`<div class="node-stats">
                <span class="stat-badge covered">\${coveredChildren}</span>
                <span class="stat-badge not-covered">\${childrenCount - coveredChildren}</span>
              </div>\` : ''}
            </div>
            \${hasChildren ? \`<div class="children" id="children-\${nodeId}">\${node.children.map(child => renderNode(child, level + 1)).join('')}</div>\` : ''}
          </div>
        \`;
      }
      
      return html;
    }
    
    function getNodeIcon(type) {
      switch(type) {
        case 'root': return '🌳';
        case 'api': return '🔗';
        case 'tag': return '🏷️';
        case 'path': return '📁';
        default: return '📄';
      }
    }
    
    function toggleNode(nodeId) {
      const children = document.getElementById(\`children-\${nodeId}\`);
      const icon = document.getElementById(\`icon-\${nodeId}\`);
      
      if (children && icon) {
        const isExpanded = children.classList.contains('expanded');
        
        if (isExpanded) {
          children.classList.remove('expanded');
          icon.classList.remove('expanded');
          icon.textContent = '▶';
        } else {
          children.classList.add('expanded');
          icon.classList.add('expanded');
          icon.textContent = '▼';
        }
      }
    }
    
    function expandAll() {
      document.querySelectorAll('.children').forEach(el => {
        el.classList.add('expanded');
      });
      document.querySelectorAll('.expand-icon').forEach(el => {
        el.classList.add('expanded');
        el.textContent = '▼';
      });
    }
    
    function collapseAll() {
      document.querySelectorAll('.children').forEach(el => {
        el.classList.remove('expanded');
      });
      document.querySelectorAll('.expand-icon').forEach(el => {
        el.classList.remove('expanded');
        el.textContent = '▶';
      });
    }
    
    function showOnlyCovered() {
      document.querySelectorAll('.endpoint').forEach(el => {
        const status = el.getAttribute('data-status');
        el.style.display = status === 'covered' ? 'flex' : 'none';
      });
    }
    
    function showOnlyUncovered() {
      document.querySelectorAll('.endpoint').forEach(el => {
        const status = el.getAttribute('data-status');
        el.style.display = status === 'not-covered' ? 'flex' : 'none';
      });
    }
    
    function showAll() {
      document.querySelectorAll('.endpoint').forEach(el => {
        el.style.display = 'flex';
      });
    }
    
    // Initialize the tree
    document.addEventListener('DOMContentLoaded', function() {
      renderTree();
      // Expand the first level by default
      document.querySelectorAll('.tree-node > .children').forEach(el => {
        el.classList.add('expanded');
      });
      document.querySelectorAll('.tree-node > .node-header .expand-icon').forEach(el => {
        el.classList.add('expanded');
        el.textContent = '▼';
      });
    });
  </script>
</body>
</html>
`;

  return html;
}

// Export the functions
module.exports = { generateHtmlReport, generateGraphHtmlReport };
