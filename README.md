# Markdown Link Checker

A pipeline for discovering documentation files, extracting links, resolving internal paths, and checking external URLs in a static-site codebase.

It reports detected broken links. External checks depend on network availability and cannot guarantee that a URL will always be reachable.

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

Install the dependencies:

```bash
npm install
```

### Current status

The project currently provides pipeline functions, but does not yet include a command-line entry point to run the complete checker against a directory. The main functions are:

1. `discoverFiles(root)` discovers supported documentation files recursively.
2. `linkExtraction(files)` extracts Markdown-style links from those files.
3. `classifyLinks(links)` classifies links as internal, external, anchor, `mailto`, or `tel`.
4. `resolveLinks(links, allFiles, root, extensions)` resolves internal file paths.
5. `validateLinks(links)` validates resolved internal links and checks external HTTP(S) links.
6. `generateReport(links)` groups invalid internal and external links.

Anchor, `mailto`, and `tel` links are recognized but are not validated. Add a CLI or application entry point before adding an `npm run check` script; there is currently no executable command for that script to invoke.

In the future, I plan to use GitHub Actions to run scheduled link checks and publish reports.

### Supported files and link syntax

File discovery currently includes files ending in `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mkd`, `.mdwn`, and `.html.md.erb`.

Link extraction currently recognizes inline Markdown links in the form `[text](target)` and skips image links. It uses a simple pattern, so it may not recognize every valid Markdown construct.

Internal links are resolved relative to the source file, or relative to the supplied root when they begin with `/`. Query strings and fragments are removed for file resolution. Directory links are resolved using matching `index` files for the extensions supplied to `resolveLinks`.

External HTTP(S) URLs are checked with a `HEAD` request. If the server responds with status `403`, `405`, or `501`, the checker retries with `GET`. Network errors and unsuccessful HTTP responses are reported as invalid, so transient connectivity issues may produce false alarms.

### Tests

Run the test suite once:

```bash
npm test
```

Run Vitest in watch mode while developing:

```bash
npm run test:watch
```
