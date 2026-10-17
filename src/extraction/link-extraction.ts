import { readFile } from "node:fs/promises";
import { Link, File } from "../types/types";


function extractLinksFromLine(line: string, lineNumber: number, file: File): Link[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: Link[] = [];

  for (const match of line.matchAll(linkRegex)) {
    const [rawLink, _, normalisedLink] = match;
    if (rawLink.startsWith("![")) continue;

    links.push({
      file,
      rawLink,
      normalisedLink,
      line: lineNumber,
      linkType: "unknown",
    });
  }

  return links;
}

async function extractLinksFromFile(file: File): Promise<Link[]> {
  const content = await readFile(file.fullPath, "utf8");
  const lines = content.split("\n");

  return lines.flatMap((line, i) =>
    extractLinksFromLine(line, i + 1, file)
  );
}

export async function linkExtraction(files: File[]): Promise<Link[]> {
  if (!files?.length) throw new Error("No files provided.");

  const allLinks = await Promise.all(files.map(extractLinksFromFile));
  return allLinks.flat();
}