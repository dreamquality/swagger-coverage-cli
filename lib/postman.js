// postman.js

'use strict';

const fs = require('fs');

/**
 * Загрузка Postman-коллекции (JSON).
 */
function loadPostmanCollection(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Postman collection file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    // Re-throw an error containing the phrase "Unexpected token" so your test matches
    throw new Error(`Unexpected token in JSON: ${e.message}`);
  }
  if (!data.info || !data.item) {
    throw new Error('Incorrect Postman collection format: missing info or item fields.');
  }
  return data;
}

/**
 * Рекурсивно собираем запросы и тесты (status-коды).
 */
function extractRequestsFromPostman(collection, verbose = false) {
  const requests = [];

  /**
   * Extract status codes and test scripts from events
   */
  function extractTestsFromEvents(events) {
    const testedStatusCodes = new Set();
    let testScripts = '';
    
    if (events && Array.isArray(events)) {
      events.forEach(ev => {
        if (ev.listen === 'test' && ev.script && ev.script.exec) {
          const scriptCode = ev.script.exec.join('\n');
          testScripts += scriptCode + '\n'; // Aggregate all test scripts

          // Ищем различные паттерны
          const patterns = [
            /to\.have\.status\((\d+)\)/g,
            /pm\.expect\(pm\.response\.code\)\.to\.eql\((\d+)\)/g,
            /pm\.response\.code\s*={1,3}\s*(\d+)/g,
            /pm\.response\.status\s*={1,3}\s*(\d+)/g,
            /pm\.expect\(pm\.response\.code\)\.to\.be\.oneOf\(\[([^\]]+)\]\)/g,
            /to\.be\.oneOf\(\[([^\]]+)\]\)/g
          ];
          patterns.forEach(regex => {
            let match;
            while ((match = regex.exec(scriptCode)) !== null) {
              if (regex === patterns[4] || regex === patterns[5]) {
                // Extract multiple codes if present (oneOf pattern)
                const codesStr = match[1];
                const codesArr = codesStr.match(/\d+/g);
                if (codesArr) {
                  codesArr.forEach(c => testedStatusCodes.add(c));
                }
              } else {
                testedStatusCodes.add(match[1]);
              }
            }
          });
        }
      });
    }
    
    return { testedStatusCodes, testScripts };
  }

  function traverseItems(items, currentFolder = '', folderTests = { testedStatusCodes: new Set(), testScripts: '' }) {
    items.forEach(item => {
      if (item.item) {
        // Это папка - извлекаем тесты из папки
        const folderTestData = extractTestsFromEvents(item.event);
        
        // Объединяем тесты папки с родительскими тестами
        const combinedFolderTests = {
          testedStatusCodes: new Set([...folderTests.testedStatusCodes, ...folderTestData.testedStatusCodes]),
          testScripts: folderTests.testScripts + folderTestData.testScripts
        };
        
        traverseItems(item.item, item.name, combinedFolderTests);
      } else {
        // Это запрос
        const req = item.request || {};
        const method = (req.method || 'GET').toLowerCase();
        const rawUrl = typeof req.url === 'object' ? req.url.raw : req.url || '';

        // Собираем query-параметры
        let queryParams = [];
        if (req.url && req.url.query) {
          queryParams = req.url.query.map(q => ({ key: q.key, value: q.value }));
        }

        // Body
        let bodyInfo = null;
        if (req.body && req.body.mode) {
          bodyInfo = {
            mode: req.body.mode,
            content: req.body[req.body.mode] // formdata, raw, urlencoded и т.д.
          };
        }

        // Извлекаем тесты из самого запроса
        const requestTestData = extractTestsFromEvents(item.event);
        
        // Объединяем тесты запроса с тестами папки
        const combinedStatusCodes = new Set([...folderTests.testedStatusCodes, ...requestTestData.testedStatusCodes]);
        const combinedTestScripts = folderTests.testScripts + requestTestData.testScripts;

        requests.push({
          name: item.name,
          folder: currentFolder,
          method,
          rawUrl,
          queryParams,
          bodyInfo,
          testedStatusCodes: Array.from(combinedStatusCodes),
          testScripts: combinedTestScripts.trim() // Include aggregated test scripts
        });
      }
    });
  }

  traverseItems(collection.item);

  if (verbose) {
    console.log(`Requests found in the Postman collection: ${requests.length}`);
  }
  return requests;
}

module.exports = {
  loadPostmanCollection,
  extractRequestsFromPostman
};
