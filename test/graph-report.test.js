const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Graph Report Integration', () => {
  const testApiFile = path.join(__dirname, 'fixtures', 'sample-api.yaml');
  const testCollectionFile = path.join(__dirname, 'fixtures', 'test-collection.json');
  const outputFile = path.join(__dirname, '..', 'tmp', 'test-graph-report.html');
  const graphOutputFile = path.join(__dirname, '..', 'tmp', 'test-graph-report-graph.html');

  beforeAll(() => {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(outputFile);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up generated files
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    if (fs.existsSync(graphOutputFile)) {
      fs.unlinkSync(graphOutputFile);
    }
  });

  test('CLI should generate graph report when --graph-report flag is used', (done) => {
    const command = `node cli.js --graph-report --output ${outputFile} ${testApiFile} ${testCollectionFile}`;
    
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      expect(error).toBeNull();
      expect(stderr).toBe('');
      expect(stdout).toContain('HTML report saved to');
      expect(stdout).toContain('Graph report saved to');
      
      // Check that both files were created
      expect(fs.existsSync(outputFile)).toBe(true);
      expect(fs.existsSync(graphOutputFile)).toBe(true);
      
      // Check content of graph report
      const graphContent = fs.readFileSync(graphOutputFile, 'utf8');
      expect(graphContent).toContain('API Coverage Graph Report');
      expect(graphContent).toContain('d3js.org');
      expect(graphContent).toContain('Coverage Status');
      expect(graphContent).toContain('graph-container');
      expect(graphContent).toContain('forceSimulation');
      
      done();
    });
  });

  test('CLI should NOT generate graph report when --graph-report flag is not used', (done) => {
    const command = `node cli.js --output ${outputFile} ${testApiFile} ${testCollectionFile}`;
    
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      expect(error).toBeNull();
      expect(stderr).toBe('');
      expect(stdout).toContain('HTML report saved to');
      expect(stdout).not.toContain('Graph report saved to');
      
      // Check that only regular report was created
      expect(fs.existsSync(outputFile)).toBe(true);
      expect(fs.existsSync(graphOutputFile)).toBe(false);
      
      done();
    });
  });
});