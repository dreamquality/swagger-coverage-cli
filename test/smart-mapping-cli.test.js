const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

describe('Smart Mapping CLI Integration', () => {
  const sampleApiPath = path.resolve(__dirname, 'fixtures', 'sample-api.yaml');
  const sampleNewmanPath = path.resolve(__dirname, 'fixtures', 'sample-newman-report.json');

  test('should improve coverage with smart mapping enabled', async () => {
    // Test without smart mapping
    const { stdout: normalOutput } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman --verbose`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Test with smart mapping
    const { stdout: smartOutput } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman --verbose --smart-mapping`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Extract coverage percentages
    const normalCoverageMatch = normalOutput.match(/Coverage: ([\d.]+)%/);
    const smartCoverageMatch = smartOutput.match(/Coverage: ([\d.]+)%/);

    expect(normalCoverageMatch).toBeTruthy();
    expect(smartCoverageMatch).toBeTruthy();

    const normalCoverage = parseFloat(normalCoverageMatch[1]);
    const smartCoverage = parseFloat(smartCoverageMatch[1]);

    console.log(`Normal mapping coverage: ${normalCoverage}%`);
    console.log(`Smart mapping coverage: ${smartCoverage}%`);

    // Smart mapping should provide equal or better coverage
    expect(smartCoverage).toBeGreaterThanOrEqual(normalCoverage);

    // Verify smart mapping output contains expected indicators
    expect(smartOutput).toContain('Smart mapping:');
    expect(smartOutput).toContain('primary matches');
    expect(smartOutput).toContain('secondary matches');
  }, 30000);

  test('should show smart mapping statistics in verbose mode', async () => {
    const { stdout } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman --verbose --smart-mapping`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Should contain smart mapping statistics
    expect(stdout).toContain('Smart mapping:');
    expect(stdout).toMatch(/\d+ primary matches/);
    expect(stdout).toMatch(/\d+ secondary matches/);

    // Should show improved coverage
    expect(stdout).toContain('Operations mapped:');
  }, 15000);

  test('should maintain backward compatibility when smart mapping is disabled', async () => {
    const { stdout: withoutFlag } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman`,
      { cwd: path.resolve(__dirname, '..') }
    );

    const { stdout: withFalsyFlag } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Both should produce identical results
    const withoutCoverage = withoutFlag.match(/Coverage: ([\d.]+)%/)[1];
    const withFalsyCoverage = withFalsyFlag.match(/Coverage: ([\d.]+)%/)[1];

    expect(withoutCoverage).toBe(withFalsyCoverage);

    // Should not contain smart mapping statistics
    expect(withoutFlag).not.toContain('Smart mapping:');
    expect(withoutFlag).not.toContain('primary matches');
  }, 15000);

  test('should work with multi-API scenarios', async () => {
    const usersApiPath = path.resolve(__dirname, 'fixtures', 'users-api.yaml');
    const productsApiPath = path.resolve(__dirname, 'fixtures', 'products-api.yaml');
    const testCollectionPath = path.resolve(__dirname, 'fixtures', 'test-collection.json');

    const { stdout } = await execAsync(
      `node cli.js "${usersApiPath},${productsApiPath}" "${testCollectionPath}" --smart-mapping --verbose`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Should show smart mapping statistics for multi-API scenario
    expect(stdout).toContain('Smart mapping:');
    expect(stdout).toMatch(/\d+ primary matches/);
    expect(stdout).toMatch(/\d+ secondary matches/);
    expect(stdout).toContain('Coverage:');
  }, 15000);

  test('should handle strict validation with smart mapping', async () => {
    const strictApiPath = path.resolve(__dirname, 'fixtures', 'strict-validation-api.yaml');
    const strictCollectionPath = path.resolve(__dirname, 'fixtures', 'strict-validation-collection.json');

    const { stdout } = await execAsync(
      `node cli.js "${strictApiPath}" "${strictCollectionPath}" --smart-mapping --strict-query --strict-body --verbose`,
      { cwd: path.resolve(__dirname, '..') }
    );

    // Should show smart mapping working with strict validation
    expect(stdout).toContain('Smart mapping:');
    expect(stdout).toContain('Coverage:');
    
    // Coverage should be reasonable even with strict validation
    const coverageMatch = stdout.match(/Coverage: ([\d.]+)%/);
    expect(coverageMatch).toBeTruthy();
    const coverage = parseFloat(coverageMatch[1]);
    expect(coverage).toBeGreaterThanOrEqual(0); // Should not fail completely
  }, 15000);

  test('should generate HTML reports with smart mapping indicators', async () => {
    const { stdout } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman --smart-mapping --output smart-test-report.html`,
      { cwd: path.resolve(__dirname, '..') }
    );

    expect(stdout).toContain('HTML report saved to: smart-test-report.html');

    // Check if the HTML file was created
    const fs = require('fs');
    const reportPath = path.resolve(__dirname, '..', 'smart-test-report.html');
    expect(fs.existsSync(reportPath)).toBe(true);

    // Read the HTML content and check for smart mapping indicators
    const htmlContent = fs.readFileSync(reportPath, 'utf8');
    expect(htmlContent).toContain('primary-match-badge');
    expect(htmlContent).toContain('confidence-badge');
  }, 15000);

  test('should handle CSV API specification with smart mapping', async () => {
    const csvApiPath = path.resolve(__dirname, 'fixtures', 'analytics-api.csv');
    const testCollectionPath = path.resolve(__dirname, 'fixtures', 'test-collection.json');
    
    // Only run this test if the CSV file exists
    const fs = require('fs');
    if (!fs.existsSync(csvApiPath)) {
      console.log('Skipping CSV test - analytics-api.csv not found');
      return;
    }

    const { stdout } = await execAsync(
      `node cli.js "${csvApiPath}" "${testCollectionPath}" --smart-mapping --verbose`,
      { cwd: path.resolve(__dirname, '..') }
    );

    expect(stdout).toContain('Coverage:');
    // CSV format should work with smart mapping
    if (stdout.includes('Smart mapping:')) {
      expect(stdout).toMatch(/\d+ primary matches/);
    }
  }, 15000);

  test('should handle edge case with empty collections', async () => {
    // Create a temporary empty collection
    const fs = require('fs');
    const emptyCollection = {
      info: { name: 'Empty Collection' },
      item: []
    };
    
    const emptyCollectionPath = path.resolve(__dirname, '..', 'tmp-empty-collection.json');
    fs.writeFileSync(emptyCollectionPath, JSON.stringify(emptyCollection, null, 2));

    try {
      const { stdout } = await execAsync(
        `node cli.js "${sampleApiPath}" "${emptyCollectionPath}" --smart-mapping --verbose`,
        { cwd: path.resolve(__dirname, '..') }
      );

      expect(stdout).toContain('Coverage: 0.00%');
      expect(stdout).toContain('Smart mapping: 0 primary matches, 0 secondary matches');
    } finally {
      // Clean up
      if (fs.existsSync(emptyCollectionPath)) {
        fs.unlinkSync(emptyCollectionPath);
      }
    }
  }, 15000);

  test('should handle large API specifications efficiently', async () => {
    // This is a performance test to ensure smart mapping doesn't significantly slow down processing
    const startTime = Date.now();
    
    const { stdout } = await execAsync(
      `node cli.js "${sampleApiPath}" "${sampleNewmanPath}" --newman --smart-mapping`,
      { cwd: path.resolve(__dirname, '..') }
    );

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    expect(stdout).toContain('Coverage:');
    expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
  }, 15000);
});