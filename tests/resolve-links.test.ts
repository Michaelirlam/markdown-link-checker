import { beforeEach, describe, expect, test, vi } from "vitest";
import { existsSync, statSync, type Stats } from "node:fs";
import path from "node:path";
import { File, Link } from "../src/types/types.js";
import { resolveLink, resolveLinks } from "../src/resolution/resolve-links.js";

vi.mock(import("node:fs"), () => ({
    existsSync: vi.fn(),
    statSync: vi.fn(),
}));

const root = path.resolve("/virtual/docs");
const sourcePath = path.join(root, "current.md");
const sourceFile: File = {
    fullPath: sourcePath,
    relativePath: "current.md",
    directory: ".",
    filename: "current.md",
    staged: false,
};
const existingPaths = new Set<string>();
const directoryPaths = new Set<string>();

function makeFile(fullPath: string): File {
    return {
        fullPath,
        relativePath: path.relative(root, fullPath),
        directory: path.dirname(path.relative(root, fullPath)),
        filename: path.basename(fullPath),
        staged: false,
    };
}

function makeLink(normalisedLink: string, linkType: Link["linkType"] = "internal"): Link {
    return {
        file: sourceFile,
        rawLink: `[link](${normalisedLink})`,
        normalisedLink,
        line: 1,
        linkType,
    };
}

function addFile(filePath: string): File {
    existingPaths.add(filePath);
    return makeFile(filePath);
}

function addDirectory(directoryPath: string): void {
    existingPaths.add(directoryPath);
    directoryPaths.add(directoryPath);
}

describe("resolveLink", () => {
    beforeEach(() => {
        existingPaths.clear();
        directoryPaths.clear();
        addDirectory(root);
        addFile(sourcePath);

        vi.mocked(existsSync).mockImplementation(filePath =>
            existingPaths.has(filePath.toString()),
        );
        vi.mocked(statSync).mockImplementation(filePath => {
            const resolved = filePath.toString();
            const isDirectory = directoryPaths.has(resolved);
            return {
                isDirectory: () => isDirectory,
                isFile: () => !isDirectory,
            } as Stats;
        });
    });

    test("resolves a relative file link and removes query and fragment", () => {
        const targetPath = path.join(root, "guide.md");
        const targetFile = addFile(targetPath);

        const result = resolveLink(
            makeLink("guide.md?view=full#setup"),
            [sourceFile, targetFile],
            root,
            [".md"],
        );

        expect(result).toMatchObject({
            resolvedPath: targetPath,
            resolvedFile: targetFile,
            exists: true,
            resolutionError: null,
        });
    });

    test("resolves a root-relative link from the supplied root", () => {
        const targetPath = path.join(root, "guides", "start.md");
        const targetFile = addFile(targetPath);

        const result = resolveLink(
            makeLink("/guides/start.md"),
            [sourceFile, targetFile],
            root,
            [".md"],
        );

        expect(result).toMatchObject({
            resolvedPath: targetPath,
            resolvedFile: targetFile,
            exists: true,
            resolutionError: null,
        });
    });

    test("resolves a directory link to the first matching index extension", () => {
        const targetDirectory = path.join(root, "tutorial");
        const indexPath = path.join(targetDirectory, "index.html.md.erb");
        addDirectory(targetDirectory);
        const indexFile = addFile(indexPath);

        const result = resolveLink(
            makeLink("tutorial"),
            [sourceFile, indexFile],
            root,
            [".md", ".html.md.erb"],
        );

        expect(result).toMatchObject({
            resolvedPath: indexPath,
            resolvedFile: indexFile,
            exists: true,
            resolutionError: null,
        });
    });

    test("marks a missing target as unresolved", () => {
        const result = resolveLink(makeLink("missing.md"), [sourceFile], root, [".md"]);

        expect(result).toMatchObject({
            resolvedPath: path.join(root, "missing.md"),
            resolvedFile: null,
            exists: false,
            resolutionError: "File not found.",
        });
    });

    test("marks an existing target as existing even if it is absent from allFiles", () => {
        const targetPath = path.join(root, "untracked.md");
        addFile(targetPath);

        const result = resolveLink(makeLink("untracked.md"), [sourceFile], root, [".md"]);

        expect(result).toMatchObject({
            resolvedPath: targetPath,
            resolvedFile: null,
            exists: true,
            resolutionError: null,
        });
    });

    test("leaves non-internal links unchanged", () => {
        const link = makeLink("https://example.com", "external");

        expect(resolveLink(link, [sourceFile], root, [".md"])).toBe(link);
    });
});

describe("resolveLinks", () => {
    beforeEach(() => {
        existingPaths.clear();
        directoryPaths.clear();
        addDirectory(root);
        addFile(sourcePath);

        vi.mocked(existsSync).mockImplementation(filePath =>
            existingPaths.has(filePath.toString()),
        );
        vi.mocked(statSync).mockImplementation(filePath => {
            const isDirectory = directoryPaths.has(filePath.toString());
            return {
                isDirectory: () => isDirectory,
                isFile: () => !isDirectory,
            } as Stats;
        });
    });

    test("resolves internal links and preserves non-internal links", () => {
        const targetPath = path.join(root, "guide.md");
        const targetFile = addFile(targetPath);
        const internalLink = makeLink("guide.md");
        const externalLink = makeLink("https://example.com", "external");
        const anchorLink = makeLink("#section", "anchor");

        const result = resolveLinks(
            [internalLink, externalLink, anchorLink],
            [sourceFile, targetFile],
            root,
            [".md"],
        );

        expect(result).toEqual([
            {
                ...internalLink,
                resolvedPath: targetPath,
                resolvedFile: targetFile,
                exists: true,
                resolutionError: null,
            },
            externalLink,
            anchorLink,
        ]);
    });

    test("returns an empty array when given no links", () => {
        expect(resolveLinks([], [], root, [".md"])).toEqual([]);
    });
});