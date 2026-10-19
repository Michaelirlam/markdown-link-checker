import { describe, expect, test } from "vitest"
import { File, Link } from "../src/types/types.js"
import path from "path"
import { classifyLink, classifyLinks } from "../src/resolution/classify-links.js";

const mockFile: File = {
    fullPath: path.resolve("src/docs/subject/index.md"),
    relativePath: "index.md",
    directory: ".",
    filename: "index.md",
    staged: false,
};

const externalHTTPLink: Link = {
    file: mockFile,
    rawLink: "[link](http://www.test.com)",
    normalisedLink: "http://www.test.com",
    line: 1,
    linkType: "unknown",
};

const externalHTTPSLink: Link = {
    file: mockFile,
    rawLink: "[link](https://www.test.com)",
    normalisedLink: "https://www.test.com",
    line: 1,
    linkType: "unknown",
};

const internalLink: Link = {
    file: mockFile,
    rawLink: "[link](docs/test/test.md)",
    normalisedLink: "docs/test/test.md",
    line: 3,
    linkType: "unknown",
};

const anchorLink: Link = {
    file: mockFile,
    rawLink: "[link](#test)",
    normalisedLink: "#test",
    line: 3,
    linkType: "unknown",
};

const mailtoLink: Link = {
    file: mockFile,
    rawLink: "[email](mailto:test@example.com)",
    normalisedLink: "mailto:test@example.com",
    line: 4,
    linkType: "unknown",
};

const telLink: Link = {
    file: mockFile,
    rawLink: "[phone](tel:+1234567890)",
    normalisedLink: "tel:+1234567890",
    line: 5,
    linkType: "unknown",
};

describe("classifyLink", () => {
    test("Classifies external http links correctly", () => {
        const result = classifyLink(externalHTTPLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[link](http://www.test.com)",
            normalisedLink: "http://www.test.com",
            line: 1,
            linkType: "external",
        });
    });

    test("Classifies external https links correctly", () => {
        const result = classifyLink(externalHTTPSLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[link](https://www.test.com)",
            normalisedLink: "https://www.test.com",
            line: 1,
            linkType: "external",
        });
    });

    test("Classifies uppercase HTTP schemes as external", () => {
        const result = classifyLink({
            ...externalHTTPLink,
            normalisedLink: "HTTP://www.test.com",
        });

        expect(result.linkType).toBe("external");
    });

    test("Classifies internal links correctly", () => {
        const result = classifyLink(internalLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[link](docs/test/test.md)",
            normalisedLink: "docs/test/test.md",
            line: 3,
            linkType: "internal",
        });
    });

    test("Classifies relative links with query strings and fragments as internal", () => {
        const result = classifyLink({
            ...internalLink,
            rawLink: "[link](guide.md?view=full#setup)",
            normalisedLink: "guide.md?view=full#setup",
        });

        expect(result.linkType).toBe("internal");
    });

    test("Classifies achor links correctly", () => {
        const result = classifyLink(anchorLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[link](#test)",
            normalisedLink: "#test",
            line: 3,
            linkType: "anchor",
        });
    });

    test("Classifies mailto links correctly", () => {
        const result = classifyLink(mailtoLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[email](mailto:test@example.com)",
            normalisedLink: "mailto:test@example.com",
            line: 4,
            linkType: "mailto",
        });
    });

    test("Classifies uppercase MAILTO schemes as mailto", () => {
        const result = classifyLink({
            ...mailtoLink,
            normalisedLink: "MAILTO:test@example.com",
        });

        expect(result.linkType).toBe("mailto");
    });

    test("Classifies tel links correctly", () => {
        const result = classifyLink(telLink);
        expect(result).toEqual({
            file: mockFile,
            rawLink: "[phone](tel:+1234567890)",
            normalisedLink: "tel:+1234567890",
            line: 5,
            linkType: "tel",
        });
    });

    test("Classifies uppercase TEL schemes as tel", () => {
        const result = classifyLink({
            ...telLink,
            normalisedLink: "TEL:+1234567890",
        });

        expect(result.linkType).toBe("tel");
    });
});

describe("classifyLinks", () => {
    test("Classifies a list of links", () => {
        const links = [externalHTTPLink, internalLink, anchorLink, mailtoLink, telLink];

        const result = classifyLinks(links);

        expect(result.map(link => link.linkType)).toEqual([
            "external",
            "internal",
            "anchor",
            "mailto",
            "tel",
        ]);
        expect(links.every(link => link.linkType === "unknown")).toBe(true);
    });

    test("returns an empty array when given no links", () => {
        expect(classifyLinks([])).toEqual([]);
    });
});