// swagger.js

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

/**
 * Загрузка и парсинг Swagger/OpenAPI (v2/v3) файла.
 */
async function loadAndParseSpec(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Spec file not found:  ${filePath}`);
  }
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');

  let doc;
  if (ext === '.yaml' || ext === '.yml') {
    doc = YAML.load(raw);
  } else {
    doc = JSON.parse(raw);
  }

  // Валидируем и нормализуем через SwaggerParser
  const parsed = await SwaggerParser.validate(doc);
  return parsed;
}

/**
 * Сбор «операций» (method + path + statusCode + параметры) из спецификации.
 */
function extractOperationsFromSpec(spec, verbose = false) {
  const paths = spec.paths || {};
  const operations = [];

  Object.keys(paths).forEach(pathKey => {
    const pathItem = paths[pathKey];
    // Методы
    const methods = Object.keys(pathItem).filter(k =>
      ['get','post','put','patch','delete','options','head'].includes(k.toLowerCase())
    );

    methods.forEach(methodKey => {
      const opObj = pathItem[methodKey];
      const operationId = opObj.operationId || null;
      const summary = opObj.summary || null;
      const responses = opObj.responses || {};
      const statusCodes = Object.keys(responses);

      // Собираем параметры
      let parameters = [];
      if (opObj.parameters) {
        parameters = parameters.concat(opObj.parameters);
      }
      if (pathItem.parameters) {
        parameters = parameters.concat(pathItem.parameters);
      }

      // Преобразуем параметры в упрощённый вид
      const mappedParams = parameters.map(p => ({
        name: p.name,
        in: p.in,
        required: !!p.required,
        schema: p.schema || {}
      }));

      // Для v3 requestBody
      let requestBodyContent = null;
      if (opObj.requestBody && opObj.requestBody.content) {
        requestBodyContent = Object.keys(opObj.requestBody.content);
      }

      // Собираем теги
      const tags = opObj.tags || [];

      // Собираем ожидаемые статус-коды (исключая 'default')
      const expectedStatusCodes = statusCodes.filter(sc => /^\d{3}$/.test(sc));

      // Для каждого статус-кода (кроме 'default')
      if (statusCodes.length > 0) {
        expectedStatusCodes.forEach(sc => {
          operations.push({
            method: methodKey.toLowerCase(),
            path: pathKey,
            operationId,
            summary,
            statusCode: sc,
            tags: tags,
            expectedStatusCodes: expectedStatusCodes,
            parameters: mappedParams, 
            requestBodyContent
          });
        });
      } else {
        // Fallback, если нет явных ответов
        operations.push({
          method: methodKey.toLowerCase(),
          path: pathKey,
          operationId,
          summary,
          statusCode: null,
          tags: tags,
          expectedStatusCodes: [],
          parameters: mappedParams,
          requestBodyContent
        });
      }
    });
  });

  if (verbose) {
    console.log(`Extracted operations from the specification: ${operations.length}`);
  }
  return operations;
}

module.exports = {
  loadAndParseSpec,
  extractOperationsFromSpec
};
