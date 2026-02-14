#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

const program = new Command();

program
  .name('code-linter')
  .description('Code quality linter - detect style issues, best practices, and code smells')
  .version(packageJson.version);

// Quality rules
const LINT_RULES = [
  // JavaScript/TypeScript
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /\bvar\s+\w+/g, issue: 'Use "let" or "const" instead of "var"', severity: 'warning' },
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /console\.(log|debug|info)\(/g, issue: 'Remove debug statements', severity: 'warning' },
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /TODO|FIXME|HACK:/g, issue: 'TODO/FIXME comment found', severity: 'info' },
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /==(?!=)/g, issue: 'Use === instead of ==', severity: 'warning' },
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /new\s+Array\(/g, issue: 'Use array literal []', severity: 'info' },
  { lang: ['js', 'ts', 'jsx', 'tsx'], pattern: /throw\s+new\s+Error/g, issue: 'Just "throw Error" is enough', severity: 'info' },
  // Python
  { lang: ['py'], pattern: /except\s*:/g, issue: 'Use "except Exception:"', severity: 'warning' },
  { lang: ['py'], pattern: /print\s*\(/g, issue: 'Consider using logging', severity: 'info' },
  { lang: ['py'], pattern: /from\s+\w+\s+import\s+\*/g, issue: 'Avoid wildcard imports', severity: 'warning' },
  // General
  { pattern: /.{120,}/g, issue: 'Line exceeds 120 characters', severity: 'info' },
  { pattern: /\s+$/gm, issue: 'Trailing whitespace', severity: 'info' },
  { pattern: /\t/g, issue: 'Use spaces instead of tabs', severity: 'warning' },
];

function getExtension(filePath) {
  return filePath.split('.').pop().toLowerCase();
}

function lintFile(filePath, content) {
  const ext = getExtension(filePath);
  const issues = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    for (const rule of LINT_RULES) {
      // Check language compatibility
      if (rule.lang && !rule.lang.includes(ext)) continue;
      
      // Check pattern
      let match;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      while ((match = regex.exec(line)) !== null) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: rule.issue,
          severity: rule.severity,
          column: match.index + 1
        });
      }
    }
  }
  
  return issues;
}

function calculateComplexity(content) {
  const lines = content.split('\n');
  let complexity = 1;
  
  for (const line of lines) {
    if (/\bif\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\bcase\b/.test(line)) {
      complexity++;
    }
  }
  
  return complexity;
}

// Lint command
program
  .command('lint')
  .description('Lint files or directories')
  .argument('<paths...>', 'Files or directories to lint')
  .option('-r, --recursive', 'Lint directories recursively')
  .option('-o, --output <file>', 'Save results to file')
  .option('--fix', 'Auto-fix issues where possible')
  .action(async (paths, options) => {
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('🔍 Code Quality Linter\n');
    
    const allIssues = [];
    let filesLinted = 0;
    
    for (const lintPath of paths) {
      const stat = fs.statSync(lintPath);
      
      if (stat.isDirectory() && options.recursive) {
        const lintDir = (dir) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const itemStat = fs.statSync(fullPath);
            if (itemStat.isDirectory()) {
              lintDir(fullPath);
            } else if (itemStat.isFile()) {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const issues = lintFile(fullPath, content);
              allIssues.push(...issues);
              filesLinted++;
            }
          }
        };
        lintDir(lintPath);
      } else if (stat.isFile()) {
        const content = fs.readFileSync(lintPath, 'utf-8');
        const issues = lintFile(lintPath, content);
        allIssues.push(...issues);
        filesLinted++;
      }
    }
    
    // Group by severity
    const bySeverity = { error: 0, warning: 0, info: 0 };
    for (const issue of allIssues) {
      bySeverity[issue.severity]++;
    }
    
    // Print results
    console.log(`Linted ${filesLinted} files`);
    console.log(`Found ${allIssues.length} issues\n`);
    
    if (allIssues.length > 0) {
      console.log('═'.repeat(60));
      console.log('LINT RESULTS');
      console.log('═'.repeat(60));
      
      for (const issue of allIssues) {
        const icon = issue.severity === 'error' ? '❌' : 
                     issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${issue.severity}] ${issue.file}:${issue.line}`);
        console.log(`   ${issue.issue}\n`);
      }
      
      console.log('═'.repeat(60));
      console.log('SUMMARY');
      console.log('═'.repeat(60));
      console.log(`Errors: ${bySeverity.error}`);
      console.log(`Warnings: ${bySeverity.warning}`);
      console.log(`Info: ${bySeverity.info}`);
    } else {
      console.log('✅ No issues found!');
    }
    
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(allIssues, null, 2));
      console.log(`\n📁 Results saved to: ${options.output}`);
    }
    
    if (bySeverity.error > 0) {
      process.exit(1);
    }
  });

// Check complexity
program
  .command('complexity')
  .description('Check code complexity')
  .argument('<file>', 'File to analyze')
  .action(async (filePath) => {
    const fs = await import('fs');
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const complexity = calculateComplexity(content);
    
    console.log(`\n📊 Complexity: ${complexity}\n`);
    
    if (complexity < 10) {
      console.log('✅ Low complexity - easy to understand');
    } else if (complexity < 20) {
      console.log('⚠️  Moderate complexity - consider refactoring');
    } else {
      console.log('❌ High complexity - needs refactoring');
    }
  });

// GitHub PR lint
program
  .command('pr')
  .description('Lint GitHub PR changes')
  .requiredOption('-o, --owner <owner>', 'Owner')
  .requiredOption('-r, --repo <repo>', 'Repo')
  .requiredOption('-p, --pr-number <number>', 'PR number')
  .action(async (options) => {
    const { Octokit } = await import('octokit');
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      console.error('Error: GITHUB_TOKEN required');
      process.exit(1);
    }
    
    const octokit = new Octokit({ auth: token });
    
    console.log('🔍 Linting PR...\n');
    
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: options.owner,
      repo: options.repo,
      pull_number: parseInt(options.prNumber),
      per_page: 100
    });
    
    let totalIssues = 0;
    
    for (const file of files) {
      if (!file.patch) continue;
      
      const issues = lintFile(file.filename, file.patch);
      if (issues.length > 0) {
        totalIssues += issues.length;
        console.log(`\n📄 ${file.filename}`);
        for (const issue of issues.slice(0, 3)) {
          console.log(`   ${issue.severity}: ${issue.issue}`);
        }
      }
    }
    
    console.log(`\n✅ Found ${totalIssues} lint issues`);
  });

program.parse();
