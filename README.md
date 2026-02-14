# Code Quality Linter

A code quality linter that detects style issues, best practices, and code smells.

## Features

- 🔍 **Style Checking**: Detect formatting and style issues
- ⚠️ **Best Practices**: Warn about common mistakes
- 📊 **Complexity Analysis**: Measure code complexity
- 🔗 **GitHub PR Integration**: Lint pull requests

## Installation

```bash
npm install
```

## Usage

```bash
# Lint files
node src/index.js lint file.js

# Lint directory
node src/index.js lint ./src --recursive

# Check complexity
node src/index.js complexity file.js

# Lint PR
node src/index.js pr -o owner -r repo -p 123
```

## Detects

- var usage (use let/const)
- Debug statements
- TODO/FIXME comments
- Loose equality (==)
- Long lines
- Trailing whitespace
- And more...

## License

MIT
