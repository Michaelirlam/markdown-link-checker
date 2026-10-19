import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { File } from "../types/types.js";

const supportedExtentions = [
  ".md",
  ".markdown",
  ".mdown",
  ".mkdn",
  ".mkd",
  ".mdwn",
  ".html.md.erb"
];

export async function discoverFiles(root: string): Promise<File[]> {
  if (!existsSync(root)) {
    throw new Error(`Directory ${root} does not exist.`);
  }
  const stats = await stat(root);
  if (!stats.isDirectory()) {
    throw new Error(`${root} is not a directory.`);
  }

  const files = await readdir(root, { recursive: true });
  if (files.length === 0) {
    return [];
  }

  return files.filter(
    file =>
        supportedExtentions.some(ext => file.endsWith(ext))
    ).map(file => ({
      fullPath: path.resolve(root, file),
      relativePath: path.normalize(file),
      directory: path.dirname(file),
      filename: path.basename(file),
      staged: false,
  }));
};