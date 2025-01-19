const { loadPostmanCollection, extractRequestsFromPostman } = require('../lib/postman');
const fs = require('fs');
const path = require('path');

describe('Postman Module', () => {
  test('loadPostmanCollection should throw error if file does not exist', () => {
    expect(() => loadPostmanCollection('nonexistent.json')).toThrow('Postman collection file not found');
  });

  test('loadPostmanCollection should parse Postman collection correctly', () => {
    const collectionPath = path.resolve(__dirname, 'fixtures', 'valid.json');
    const collectionData = {
      info: { name: 'Test Collection' },
      item: []
    };
    fs.writeFileSync(collectionPath, JSON.stringify(collectionData));
    const collection = loadPostmanCollection(collectionPath);
    expect(collection.info.name).toBe('Test Collection');
    fs.unlinkSync(collectionPath);
  });

  test('extractRequestsFromPostman should extract requests', () => {
    const collection = {
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test'
          },
          event: []
        }
      ]
    };
    const requests = extractRequestsFromPostman(collection);
    expect(requests.length).toBe(1);
    expect(requests[0].name).toBe('Test Request');
    expect(requests[0].method).toBe('get');
  });
});