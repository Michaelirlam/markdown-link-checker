import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { File, Link } from "../src/types/types.js";
import {
    validateExternalLink,
    validateInternalOrAnchorLink,
    validateLinks,
} from "../src/validation/validate-links.js";
import path from "node:path";

const mockFile: File = {
    fullPath: path.resolve("src/docs/index.md"),
    relativePath: "index.md",
    directory: ".",
    filename: "index.md",
    staged: false,
};

function makeLink(
    linkType: Link["linkType"],
    overrides: Partial<Link> = {},
): Link {
    return {
        file: mockFile,
        rawLink: "[link](target)",
        normalisedLink: "target",
        line: 1,
        linkType,
        ...overrides,
    };
}

describe("validateInternalOrAnchorLink", () => {
    test("marks anchor links unchecked", () => {
        const link = makeLink("anchor", { normalisedLink: "#section" });

        expect(validateInternalOrAnchorLink(link)).toEqual({
            ...link,
            validationStatus: "unchecked",
            validationError: null,
        });
    });

    test("marks an existing internal link valid", () => {
        const link = makeLink("internal", { exists: true });

        expect(validateInternalOrAnchorLink(link)).toEqual({
            ...link,
            validationStatus: "valid",
            validationError: null,
        });
    });

    test("marks a missing internal link invalid with its resolution error", () => {
        const link = makeLink("internal", {
            exists: false,
            resolutionError: "File not found.",
        });

        expect(validateInternalOrAnchorLink(link)).toEqual({
            ...link,
            validationStatus: "invalid",
            validationError: "File not found.",
        });
    });

    test("uses a fallback error when a missing internal link has no resolution error", () => {
        const link = makeLink("internal", { exists: false });

        expect(validateInternalOrAnchorLink(link)).toMatchObject({
            validationStatus: "invalid",
            validationError: "Unknown resolution error",
        });
    });

    test("marks link types other than internal and anchor unchecked", () => {
        const link = makeLink("mailto", { normalisedLink: "mailto:test@example.com" });

        expect(validateInternalOrAnchorLink(link)).toEqual({
            ...link,
            validationStatus: "unchecked",
            validationError: null,
        });
    });
});

describe("validateExternalLink", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("returns non-external links unchanged without making a request", async () => {
        const link = makeLink("internal");

        await expect(validateExternalLink(link)).resolves.toBe(link);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test("marks an external link valid when the HEAD request succeeds", async () => {
        const link = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

        await expect(validateExternalLink(link)).resolves.toEqual({
            ...link,
            exists: true,
            validationStatus: "valid",
            validationError: null,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://example.com",
            expect.objectContaining({ method: "HEAD" }),
        );
    });

    test.each([403, 405, 501])(
        "retries a HEAD response with status %i using GET",
        async status => {
            const link = makeLink("external", {
                normalisedLink: "https://example.com",
            });
            fetchMock
                .mockResolvedValueOnce(new Response(null, { status }))
                .mockResolvedValueOnce(new Response(null, { status: 200 }));

            await expect(validateExternalLink(link)).resolves.toMatchObject({
                exists: true,
                validationStatus: "valid",
                validationError: null,
            });
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                "https://example.com",
                expect.objectContaining({ method: "GET" }),
            );
        },
    );

    test("marks an unsuccessful HTTP response invalid", async () => {
        const link = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

        await expect(validateExternalLink(link)).resolves.toMatchObject({
            exists: false,
            validationStatus: "invalid",
            validationError: "HTTP 404",
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("reports the GET response status when the fallback request fails", async () => {
        const link = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status: 403 }))
            .mockResolvedValueOnce(new Response(null, { status: 404 }));

        await expect(validateExternalLink(link)).resolves.toMatchObject({
            exists: false,
            validationStatus: "invalid",
            validationError: "HTTP 404",
        });
    });

    test("marks a network error invalid", async () => {
        const link = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        fetchMock.mockRejectedValue(new Error("Network unavailable"));

        await expect(validateExternalLink(link)).resolves.toEqual({
            ...link,
            exists: false,
            validationStatus: "invalid",
            validationError: "Network error",
        });
    });

    test("marks a network error during the GET fallback invalid", async () => {
        const link = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status: 405 }))
            .mockRejectedValueOnce(new Error("Network unavailable"));

        await expect(validateExternalLink(link)).resolves.toMatchObject({
            exists: false,
            validationStatus: "invalid",
            validationError: "Network error",
        });
    });
});

describe("validateLinks", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("validates external, internal, and anchor links", async () => {
        const externalLink = makeLink("external", {
            normalisedLink: "https://example.com",
        });
        const validInternalLink = makeLink("internal", { exists: true });
        const missingInternalLink = makeLink("internal", {
            exists: false,
            resolutionError: "File not found.",
        });
        const anchorLink = makeLink("anchor", { normalisedLink: "#section" });

        await expect(
            validateLinks([externalLink, validInternalLink, missingInternalLink, anchorLink]),
        ).resolves.toEqual([
            {
                ...externalLink,
                exists: true,
                validationStatus: "valid",
                validationError: null,
            },
            {
                ...validInternalLink,
                validationStatus: "valid",
                validationError: null,
            },
            {
                ...missingInternalLink,
                validationStatus: "invalid",
                validationError: "File not found.",
            },
            {
                ...anchorLink,
                validationStatus: "unchecked",
                validationError: null,
            },
        ]);
    });

    test("returns an empty array for an empty list", async () => {
        await expect(validateLinks([])).resolves.toEqual([]);
    });
});