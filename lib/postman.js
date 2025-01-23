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

  function traverseItems(items, currentFolder = '') {
    items.forEach(item => {
      if (item.item) {
        // Это папка
        traverseItems(item.item, item.name);
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

        // Ищем status-коды в тест-скриптах
        let testedStatusCodes = new Set();
        let testScripts = '';
        if (item.event && Array.isArray(item.event)) {
          item.event.forEach(ev => {
            if (ev.listen === 'test' && ev.script && ev.script.exec) {
              const scriptCode = ev.script.exec.join('\n');
              testScripts += scriptCode + '\n'; // Aggregate all test scripts

              // Ищем различные паттерны
              const patterns = [
                /to\.have\.status\((\d+)\)/g,
                /pm\.expect\(pm\.response\.code\)\.to\.eql\((\d+)\)/g,
                /pm\.response\.code\s*={1,3}\s*(\d+)/g,
                /pm\.response\.status\s*={1,3}\s*(\d+)/g,
                /pm\.expect\(pm\.response\.code\)\.to\.be\.oneOf\(\[\s*([^]]+)\]/g
              ];
              patterns.forEach(regex => {
                let match;
                while ((match = regex.exec(scriptCode)) !== null) {
                  if (regex === patterns[4]) {
                    // Extract multiple codes if present
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

        requests.push({
          name: item.name,
          folder: currentFolder,
          method,
          rawUrl,
          queryParams,
          bodyInfo,
          testedStatusCodes: Array.from(testedStatusCodes),
          testScripts: testScripts.trim() // Include aggregated test scripts
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
