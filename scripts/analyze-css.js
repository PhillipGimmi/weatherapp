#!/usr/bin/env node

import fs from 'fs';
import glob from 'glob';

// Function to extract CSS classes from content
function extractCSSClasses(content) {
  const classRegex = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g;
  const classes = new Set();
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    const classString = match[1];
    const classList = classString.split(/\s+/);
    classList.forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
  }

  return classes;
}

// Function to extract CSS classes from CSS files
function extractCSSSelectors(content) {
  const selectorRegex = /\.([a-zA-Z0-9_-]+)/g;
  const selectors = new Set();
  let match;

  while ((match = selectorRegex.exec(content)) !== null) {
    selectors.add(match[1]);
  }

  return selectors;
}

// Function to scan files
function scanFiles(pattern) {
  const files = glob.sync(pattern, { cwd: process.cwd() });
  const allClasses = new Set();

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const classes = extractCSSClasses(content);
    classes.forEach((cls) => allClasses.add(cls));
  });

  return allClasses;
}

// Function to scan CSS files
function scanCSSFiles() {
  const cssFiles = glob.sync('src/**/*.css', { cwd: process.cwd() });
  const allSelectors = new Set();

  cssFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const selectors = extractCSSSelectors(content);
    selectors.forEach((selector) => allSelectors.add(selector));
  });

  return allSelectors;
}

// Main analysis
console.log('🔍 Analyzing CSS usage...\n');

// Scan for used classes
const usedClasses = scanFiles('src/**/*.{js,jsx,ts,tsx}');
console.log(`📊 Found ${usedClasses.size} used CSS classes:`);
Array.from(usedClasses)
  .sort()
  .forEach((cls) => {
    console.log(`  ✅ ${cls}`);
  });

// Scan for defined selectors
const definedSelectors = scanCSSFiles();
console.log(`\n📊 Found ${definedSelectors.size} defined CSS selectors:`);
Array.from(definedSelectors)
  .sort()
  .forEach((selector) => {
    console.log(`  🎨 ${selector}`);
  });

// Find unused selectors
const unusedSelectors = new Set();
definedSelectors.forEach((selector) => {
  if (!usedClasses.has(selector)) {
    unusedSelectors.add(selector);
  }
});

console.log(
  `\n⚠️  Found ${unusedSelectors.size} potentially unused CSS selectors:`
);
if (unusedSelectors.size > 0) {
  Array.from(unusedSelectors)
    .sort()
    .forEach((selector) => {
      console.log(`  ❌ ${selector}`);
    });
} else {
  console.log('  🎉 All CSS selectors appear to be used!');
}

// Generate report
const report = {
  usedClasses: Array.from(usedClasses).sort(),
  definedSelectors: Array.from(definedSelectors).sort(),
  unusedSelectors: Array.from(unusedSelectors).sort(),
  summary: {
    totalUsed: usedClasses.size,
    totalDefined: definedSelectors.size,
    totalUnused: unusedSelectors.size,
    usagePercentage: ((usedClasses.size / definedSelectors.size) * 100).toFixed(
      1
    ),
  },
};

fs.writeFileSync('css-analysis-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to css-analysis-report.json');
