# Markdown Link Checker

A fast accurate pipeline for discovering documentation files, extracting links, resolving and validating them for their correctness across a static-site codebase.

This tool ensures that every internal link in your documentation points to a real file, and that every URL is alive.

## Why this checker exists

Large documentation repositories often accumulate broken links due to:

- moved or renamed files
- incorrect relative paths
- missing index files
- inconsistent directory
- extensionless links
- human error

This pipeline provides an easy way to detect and report broken links before they reach production.

## Getting started

### Installation

Install the dependencies
```bash
npm install
```
