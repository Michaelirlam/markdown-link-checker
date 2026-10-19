import { existsSync, statSync } from "node:fs";
import path from "path";
import { File, Link } from "../types/types.js";

export function resolveLink(link: Link, allFiles: File[], root: string, extensions: string[]): Link {
  if (link.linkType !== "internal") return link;

  const linkPath = link.normalisedLink.split(/[?#]/, 1)[0]!;
  const resolvedPath = linkPath.startsWith("/")
    ? path.resolve(root, `.${linkPath}`)
    : path.resolve(path.dirname(link.file.fullPath), linkPath);
  const targetPath = path.normalize(resolvedPath);
  const targetStats = existsSync(targetPath) ? statSync(targetPath) : null;
  const indexPath = targetStats?.isDirectory()
    ? extensions
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

export function resolveLinks(links: Link[], allFiles: File[], 
  root: string, extensions: string[]): Link[] {
  return links.map(link => resolveLink(link, allFiles, root, extensions));
};