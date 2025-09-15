# Release Workflow

This repository includes a GitHub Actions workflow for releasing new versions to NPM with manual approval.

## How to Create a Release

1. **Navigate to Actions tab** in the GitHub repository
2. **Select "Release to NPM"** workflow from the left sidebar
3. **Click "Run workflow"** button
4. **Configure release options:**
   - **Version type**: Choose from `patch`, `minor`, `major`, or `specific`
   - **Specific version**: If you selected "specific", enter the exact version (e.g., "2.1.0")
   - **Dry run**: Check this to test the release process without actually publishing

## Version Types

- **patch**: Bug fixes (2.0.0 → 2.0.1)
- **minor**: New features (2.0.0 → 2.1.0)  
- **major**: Breaking changes (2.0.0 → 3.0.0)
- **specific**: Set exact version (e.g., "2.0.1-beta.1")

## What the Workflow Does

1. **Quality Checks**: Runs all tests to ensure code quality
2. **Version Bump**: Updates package.json with new version
3. **Git Operations**: Creates commit and tag for the new version
4. **GitHub Release**: Creates a release with changelog
5. **NPM Publishing**: Publishes package to NPM registry

## Environment Setup

The workflow requires these secrets to be configured in your repository:

### Required Secrets

1. **NPM_TOKEN**: Your NPM authentication token
   - Go to [NPM tokens page](https://www.npmjs.com/settings/tokens)
   - Create a new "Automation" token
   - Add it as a repository secret named `NPM_TOKEN`

### Environment Protection (Recommended)

1. Go to **Settings → Environments** in your repository
2. Create an environment named `npm-release`
3. Add required reviewers for manual approval
4. This ensures releases are reviewed before publishing

## Example Usage

### Regular Patch Release
```
Version type: patch
Dry run: false
```

### Beta Release
```
Version type: specific
Specific version: 2.1.0-beta.1
Dry run: false
```

### Test Release Process
```
Version type: patch
Dry run: true
```

## Manual Release (Alternative)

If you prefer to release manually:

```bash
# Update version
npm version patch # or minor/major

# Test package
npm run test

# Publish to NPM
npm publish

# Create GitHub release
gh release create v$(node -p "require('./package.json').version")
```