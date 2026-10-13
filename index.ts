import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "path";

// File object structure
export type File = {
    fullPath: string,
    relativePath: string,
    directory: string,
    filename: string,
    staged: boolean,
};

// Link object structure
export type Link = {
  file: File;
  rawLink: string;
  normalisedLink: string;
  line: number;
  linkType: "internal" | "external" | "anchor" | "unknown";
  resolvedPath?: string; // internal links only
  resolvedFile?: File | null; // internal links only
  exists?: boolean;
  resolutionError?: string | null;
  validationStatus?: "valid" | "invalid" | "unchecked";
  validationError?: string | null;
};


const sourceRoot = path.resolve("./source");
const validExtensions = [".html", ".html.md.erb", ".html.erb", ".md"]

export async function discoverFiles(root: string = sourceRoot): Promise<File[]> {
  if (!existsSync(root)) {
    throw new Error(`Directory ${root} does not exist.`);
  }
  const stats = await stat(root);
  if (!stats.isDirectory()) {
    throw new Error(`${root} is not a directory.`)
  }

  const files = await readdir(root, { recursive: true });
  if (files.length === 0) {
    return [];
  }

  return files.filter(
    file =>
        validExtensions.some(ext => file.endsWith(ext))
    ).map(file => ({
    fullPath: path.resolve(root, file),
    relativePath: path.normalize(file),
    directory: path.dirname(file),
    filename: path.basename(file),
    staged: false,
  }));
};

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


export function classifyLink(link: Link): Link {
  const { normalisedLink } = link;
  if (normalisedLink.startsWith("http://") || normalisedLink.startsWith("https://")) {
    return { ...link, linkType: "external"};
  }
  if (normalisedLink.startsWith("#")) {
    return { ...link, linkType: "anchor"};
  }
  return { ...link, linkType: "internal"};
};

export function classifyLinks(links: Link[]): Link[] {
  return links.map(classifyLink);
};

export function resolveLink(link: Link, allFiles: File[], root: string): Link {
  if (link.linkType !== "internal") return link;

  const linkPath = link.normalisedLink.split(/[?#]/, 1)[0]!;
  const resolvedPath = linkPath.startsWith("/")
    ? path.resolve(root, `.${linkPath}`)
    : path.resolve(path.dirname(link.file.fullPath), linkPath);
  const targetPath = path.normalize(resolvedPath);
  const targetStats = existsSync(targetPath) ? statSync(targetPath) : null;
  const indexPath = targetStats?.isDirectory()
    ? validExtensions
        .map(extension => path.join(targetPath, `index${extension}`))
        .find(candidate => existsSync(candidate) && statSync(candidate).isFile())
    : undefined;
  const normalisedResolvedPath = indexPath ?? targetPath;
  const resolvedFile = allFiles.find(
    file => path.resolve(file.fullPath) === normalisedResolvedPath
  ) ?? null;
  const exists = Boolean(targetStats?.isFile() || indexPath);

  return {
    ...link,
    resolvedPath: normalisedResolvedPath,
    resolvedFile,
    exists,
    resolutionError: exists ? null : "File not found.",
  };
};

export function resolveLinks(links: Link[], allFiles: File[], root: string): Link[] {
  return links.map(link => resolveLink(link, allFiles, root));
};

export function validateInternalOrAnchorLink(link: Link): Link {
  if (link.linkType === "anchor") {
    return {
      ...link,
      validationStatus: "unchecked",
      validationError: null,
    };
  }

  if (link.linkType === "internal") {
    if (!link.exists) {
      return {
        ...link,
        validationStatus: "invalid",
        validationError: link.resolutionError ?? "Unknown resolution error",
      };
    }

    return {
      ...link,
      validationStatus: "valid",
      validationError: null,
    };
  }

  return {
    ...link,
    validationStatus: "unchecked",
    validationError: null,
  };
}

export async function validateExternalLink(link: Link): Promise<Link> {
  if (link.linkType !== "external") return link;

  try {
    const browserHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    let response = await fetch(link.normalisedLink, {
        method: "HEAD",
        headers: browserHeaders,
    });

    if (!response.ok && [403, 405, 501].includes(response.status)) {
      response = await fetch(link.normalisedLink, {
        method: "GET",
        headers: browserHeaders,
      });
    };

    const exists = response.ok;
    return {
      ...link,
      exists,
      validationStatus: exists ? "valid" : "invalid",
      validationError: exists ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
      return {
      ...link,
      exists: false,
      validationStatus: "invalid",
      validationError: "Network error",
    };
  };
};

export async function validateLinks(links: Link[]): Promise<Link[]> {
  const validated = await Promise.all(
    links.map(async link => {
      if (link.linkType === "external") {
        return validateExternalLink(link);
      }

      return validateInternalOrAnchorLink(link);
    })
  );

  return validated;
};

// a function to seperate Links, might be useful for reporting

export function invalidInternalLinks(links: Link[]): Link[] {
  return links.filter(link => link.linkType === "internal" && link.validationStatus === "invalid");
}

export function invalidExternalLinks(links: Link[]): Link[] {
  return links.filter(link => link.linkType === "external" && link.validationStatus === "invalid");
}