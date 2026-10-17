import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { File } from "../types/types.ts";

export async function discoverFiles(root: string, extensions: string[]): Promise<File[]> {
  root = path.resolve(root);
  
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
    (file: File) =>
        extensions.some(ext => file.filename.endsWith(ext))
    ).map((file: File) => ({
    fullPath: path.resolve(root, file),
    relativePath: path.normalize(file),
    directory: path.dirname(file),
    filename: path.basename(file),
    staged: false,
  }));
};