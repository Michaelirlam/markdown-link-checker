import { describe, expect, test, vi , beforeEach} from "vitest"
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { discoverFiles } from "../src/discovery/discover-files.js";

vi.mock(import("node:fs/promises"), () => ({
        readdir: vi.fn(),
        stat: vi.fn(),
    }));

vi.mock(import("node:fs"), () => ({
    existsSync: vi.fn(),
}));


describe("discoverFiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("file discovery works with a single file", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(readdir).mockResolvedValue(["index.md"] as any);

        const result = await discoverFiles("src/docs/fake-docs");
        expect(result).toEqual([
            {
                fullPath: path.resolve("src/docs/fake-docs/index.md"),
                relativePath: "index.md",
                directory: ".",
                filename: "index.md",
                staged: false,
            }
        ])
    });

    test("discovers files in nested directories with correct paths", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(readdir).mockResolvedValue(["guides/setup/installation.md"] as any);

        const result = await discoverFiles("src/docs");
        expect(result).toEqual([
            {
                fullPath: path.resolve("src/docs/guides/setup/installation.md"),
                relativePath: path.join("guides", "setup", "installation.md"),
                directory: path.join("guides", "setup"),
                filename: "installation.md",
                staged: false,
            }
        ]);
    });

    test("non-matching files are not returned", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(readdir).mockResolvedValue(["script.js", "styles.css", "image.png"] as any);

        const result = await discoverFiles("src/javascript");
        expect(result).toEqual([]);
    });

    test("returns an empty array without error if directory is empty", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(readdir).mockResolvedValue([]);

        const result = await discoverFiles("empty/directory");
        expect(result).toEqual([]);
    });

    test("throws an error if the directory doesn't exist", async () => {
        vi.mocked(existsSync).mockReturnValue(false);
        await expect(discoverFiles("Iamnotreal")).rejects.toThrow("Directory Iamnotreal does not exist");
    });

    test("throws an error if a file path is passed in instead of a directory", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => false } as any);

        await expect(discoverFiles("some/file.md")).rejects.toThrow("some/file.md is not a directory.");
    });

    test("discovers all supported Markdown extensions and ignores unsupported ones", async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any);
        vi.mocked(readdir).mockResolvedValue([
            "doc.md",
            "guide.markdown",
            "notes.mdown",
            "reference.mkdn",
            "draft.mkd",
            "chapter.mdwn",
            "template.html.md.erb",
            "page.html",
            "styles.css",
            "data.json",
            "readmenotmd",
            "readme.notmd",
            "ignore.txt",
        ] as any);

        const result = await discoverFiles("src/docs");
        const fileNames = result.map(file => file.filename);
        expect(fileNames).toEqual([
            "doc.md",
            "guide.markdown",
            "notes.mdown",
            "reference.mkdn",
            "draft.mkd",
            "chapter.mdwn",
            "template.html.md.erb",
        ]);
    });
});