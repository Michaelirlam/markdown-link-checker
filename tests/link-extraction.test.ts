import { describe, expect, test, vi , beforeEach} from "vitest"
import { readFile } from "node:fs/promises";
import { extractLinksFromFile, extractLinksFromLine, linkExtraction } from "../src/extraction/link-extraction.js";
import { File } from "../src/types/types.js"
import path from "path"

vi.mock(import("node:fs/promises"), () => ({
    readFile: vi.fn(),
}));

describe("extractLinksFromFile", () => {
    const mockFile: File = {
        fullPath: path.resolve("src/docs/subject/index.md"),
        relativePath: "index.md",
        directory: ".",
        filename: "index.md",
        staged: false,
    };

    beforeEach(() => {
        vi.clearAllMocks()
    });

    test("extracts link where there is a single link in line", () => {
        const line = "this is a test line with a single link [single](http://www.test.com)"

        const result = extractLinksFromLine(line, 1, mockFile);
        expect(result).toEqual([{
            file: mockFile,
            rawLink: "[single](http://www.test.com)",
            normalisedLink: "http://www.test.com",
            line: 1,
            linkType: "unknown"
        }]);
    });

    test("extracts multiple links from a single line", () => {
        const line = "this is a test line with multiple links [first](http://www.first.com) and [second](http://www.second.com)"
        const result = extractLinksFromLine(line, 1, mockFile);
        expect(result).toEqual([
            {
                file: mockFile,
                rawLink: "[first](http://www.first.com)",
                normalisedLink: "http://www.first.com",
                line: 1,
                linkType: "unknown"
            },
            {
                file: mockFile,
                rawLink: "[second](http://www.second.com)",
                normalisedLink: "http://www.second.com",
                line: 1,
                linkType: "unknown"
            }
        ]);
    });

    test("ignores image links", () => {
        const line = "this is a test line with an image link ![image](http://www.image.com)"
        const result = extractLinksFromLine(line, 1, mockFile);
        expect(result).toEqual([]);
    });

    test("ignores image links while extracting regular links", () => {
        const line = "![image](http://www.image.com) and [link](http://www.test.com)";
        const result = extractLinksFromLine(line, 1, mockFile);

        expect(result).toEqual([{
            file: mockFile,
            rawLink: "[link](http://www.test.com)",
            normalisedLink: "http://www.test.com",
            line: 1,
            linkType: "unknown",
        }]);
    });
});

describe("linkExtraction", () => {
    const files: File[] = [
        {
            fullPath: path.resolve("src/docs/first.md"),
            relativePath: "first.md",
            directory: ".",
            filename: "first.md",
            staged: false,
        },
        {
            fullPath: path.resolve("src/docs/second.md"),
            relativePath: "second.md",
            directory: ".",
            filename: "second.md",
            staged: false,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("extracts and combines links from all files", async () => {
        vi.mocked(readFile).mockImplementation(async (filePath) => {
            if (filePath === files[0].fullPath) {
                return "[first](https://first.example)";
            }
            if (filePath === files[1].fullPath) {
                return "[second](https://second.example)";
            }
            throw new Error(`Unexpected file: ${filePath}`);
        });

        const result = await linkExtraction(files);

        expect(readFile).toHaveBeenCalledTimes(2);
        expect(readFile).toHaveBeenCalledWith(files[0].fullPath, "utf8");
        expect(readFile).toHaveBeenCalledWith(files[1].fullPath, "utf8");
        expect(result).toEqual([
            {
                file: files[0],
                rawLink: "[first](https://first.example)",
                normalisedLink: "https://first.example",
                line: 1,
                linkType: "unknown",
            },
            {
                file: files[1],
                rawLink: "[second](https://second.example)",
                normalisedLink: "https://second.example",
                line: 1,
                linkType: "unknown",
            },
        ]);
    });

    test("throws when given no files", async () => {
        await expect(linkExtraction([])).rejects.toThrow("No files provided.");
        expect(readFile).not.toHaveBeenCalled();
    });

    test("propagates a file read error", async () => {
        const error = new Error("Unable to read file");
        vi.mocked(readFile).mockRejectedValue(error);

        await expect(linkExtraction(files)).rejects.toBe(error);
    });
});

describe("extractLinksFromFile", () => {
    const mockFile: File = {
        fullPath: path.resolve("src/docs/subject/index.md"),
        relativePath: "index.md",
        directory: ".",
        filename: "index.md",
        staged: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("reads the file and extracts links with their line numbers", async () => {
        vi.mocked(readFile).mockResolvedValue(
            "First line [first](https://first.example)\n\n![image](image.png) and [second](https://second.example)"
        );

        const result = await extractLinksFromFile(mockFile);

        expect(readFile).toHaveBeenCalledWith(mockFile.fullPath, "utf8");
        expect(result).toEqual([
            {
                file: mockFile,
                rawLink: "[first](https://first.example)",
                normalisedLink: "https://first.example",
                line: 1,
                linkType: "unknown",
            },
            {
                file: mockFile,
                rawLink: "[second](https://second.example)",
                normalisedLink: "https://second.example",
                line: 3,
                linkType: "unknown",
            },
        ]);
    });

    test("returns an empty array when the file has no links", async () => {
        vi.mocked(readFile).mockResolvedValue("Plain text\n![image](image.png)");

        await expect(extractLinksFromFile(mockFile)).resolves.toEqual([]);
    });

    test("propagates file read errors", async () => {
        const error = new Error("Unable to read file");
        vi.mocked(readFile).mockRejectedValue(error);

        await expect(extractLinksFromFile(mockFile)).rejects.toBe(error);
    });
});
