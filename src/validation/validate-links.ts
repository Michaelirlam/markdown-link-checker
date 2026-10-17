import { Link } from "../types/types";

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