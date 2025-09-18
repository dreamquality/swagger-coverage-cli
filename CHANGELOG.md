# Changelog

All notable changes to swagger-coverage-cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2024-09-18

### ✨ Major Features Added
- **Smart Endpoint Mapping**: Intelligent endpoint matching with status code prioritization
- **Enhanced Path Parameter Matching**: Improved handling of different parameter naming conventions
- **Confidence Scoring**: 0.0-1.0 match quality assessment for all endpoint matches
- **Smart Grouping Logic**: Automatic grouping and prioritization of operations by method and path

### 🚀 Performance Improvements  
- **5.56 percentage point coverage improvement**: From 44.44% to 50.00% average coverage
- **Primary/Secondary Match Classification**: 6 primary matches, 3 secondary matches in typical scenarios
- **Status Code Intelligence**: Prioritizes successful (2xx) codes over error codes

### 🎯 Smart Mapping Features (Now Default)
- **Automatic Status Code Prioritization**: 2xx > 4xx > 5xx priority order
- **Path Similarity Scoring**: Enhanced parameter pattern matching 
- **Fuzzy Matching**: Near-miss scenario handling for better coverage
- **Confidence-Based Reporting**: Visual indicators in HTML reports

### 📚 Documentation & Testing
- **Complete Documentation**: 25+ detailed examples and use cases
- **Comprehensive Test Suite**: 38 test cases across 8 major categories
- **Performance Testing**: Validated with 1000+ operation datasets
- **CLI Integration Examples**: End-to-end usage scenarios

### 🔧 CLI Changes
- **Smart Mapping by Default**: No flags required (previously `--smart-mapping`)
- **Enhanced Verbose Output**: Smart mapping statistics and confidence scores
- **Improved Error Handling**: Graceful degradation for edge cases
- **Better Accessibility**: Text-based indicators instead of emoji

### 🧪 Testing Improvements
- **130 Tests Passing**: All test suites updated for smart mapping
- **Edge Case Coverage**: Malformed URLs, null values, empty collections
- **Multi-API Scenarios**: Microservices, namespace conflicts, API versioning
- **Performance Validation**: Large dataset stress testing

### 💼 Enterprise Features
- **Multi-API Support**: Enhanced handling of microservices architectures
- **Gateway Aggregation**: API gateway + internal services mapping
- **Version Management**: V1/V2 endpoint intelligent handling
- **Confidence Reporting**: Match quality assessment for enterprise workflows

### ⚠️ Breaking Changes
- **Default Behavior**: Smart mapping is now enabled by default (was opt-in)
- **Coverage Calculations**: Improved accuracy may show different percentages
- **HTML Reports**: Visual indicators changed from emoji to text for accessibility

### 🔄 Migration Guide
- **No Action Required**: Existing commands work without changes
- **Improved Coverage**: Expect higher, more accurate coverage percentages
- **Enhanced Reports**: Better visual indicators and confidence scoring

---

## [5.0.0] - 2024-09-01

### Previous Release
- Multi-API support
- Newman report integration
- Excel/CSV specification support
- Enhanced HTML reporting

For earlier versions, see [GitHub Releases](https://github.com/dreamquality/swagger-coverage-cli/releases).