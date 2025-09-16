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
});