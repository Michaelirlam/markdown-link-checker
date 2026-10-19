import { describe, expect, test } from "vitest";
import path from "node:path";
import { File, Link } from "../src/types/types.js";
import {
    generateReport,
    invalidExternalLinks,
    invalidInternalLinks,
} from "../src/pipeline/report.js";

const file: File = {
    fullPath: path.resolve("src/docs/index.md"),
    relativePath: "index.md",
    directory: ".",
    filename: "index.md",
    staged: false,
};

function makeLink(
    linkType: Link["linkType"],
    validationStatus: Link["validationStatus"],
    normalisedLink: string,
): Link {
    return {
        file,
        rawLink: `[link](${normalisedLink})`,
        normalisedLink,
        line: 1,
        linkType,
        validationStatus,
    };
}

describe("invalidInternalLinks", () => {
    test("returns only invalid internal links", () => {
        const invalidInternal = makeLink("internal", "invalid", "missing.md");
        const links = [
            invalidInternal,
            makeLink("internal", "valid", "existing.md"),
            makeLink("external", "invalid", "https://example.com"),
            makeLink("anchor", "invalid", "#section"),
            makeLink("internal", "unchecked", "not-checked.md"),
        ];

        expect(invalidInternalLinks(links)).toEqual([invalidInternal]);
    });

    test("returns an empty array when there are no invalid internal links", () => {
        expect(invalidInternalLinks([
            makeLink("internal", "valid", "existing.md"),
            makeLink("external", "invalid", "https://example.com"),
        ])).toEqual([]);
        expect(invalidInternalLinks([])).toEqual([]);
    });
});

describe("invalidExternalLinks", () => {
    test("returns only invalid external links", () => {
        const invalidExternal = makeLink("external", "invalid", "https://broken.example");
        const links = [
            invalidExternal,
            makeLink("external", "valid", "https://working.example"),
            makeLink("internal", "invalid", "missing.md"),
            makeLink("mailto", "invalid", "mailto:test@example.com"),
            makeLink("external", "unchecked", "https://unchecked.example"),
        ];

        expect(invalidExternalLinks(links)).toEqual([invalidExternal]);
    });

    test("returns an empty array when there are no invalid external links", () => {
        expect(invalidExternalLinks([
            makeLink("external", "valid", "https://working.example"),
            makeLink("internal", "invalid", "missing.md"),
        ])).toEqual([]);
        expect(invalidExternalLinks([])).toEqual([]);
    });
});

describe("generateReport", () => {
    test("returns invalid internal and external links in separate groups", () => {
        const invalidInternal = makeLink("internal", "invalid", "missing.md");
        const invalidExternal = makeLink("external", "invalid", "https://broken.example");
        const links = [
            invalidInternal,
            invalidExternal,
            makeLink("internal", "valid", "existing.md"),
            makeLink("external", "valid", "https://working.example"),
            makeLink("anchor", "unchecked", "#section"),
        ];

        expect(generateReport(links)).toEqual({
            internal: [invalidInternal],
            external: [invalidExternal],
        });
    });

    test("returns empty groups when there are no links", () => {
        expect(generateReport([])).toEqual({
            internal: [],
            external: [],
        });
    });
});