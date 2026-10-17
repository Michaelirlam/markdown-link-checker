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