import { Link } from "../types/types.js";

export function classifyLink(link: Link): Link {
  const { normalisedLink } = link;
  if (normalisedLink.toLowerCase().startsWith("http://") || normalisedLink.toLowerCase().startsWith("https://")) {
    return { ...link, linkType: "external" };
  }

  if (normalisedLink.startsWith("#")) {
    return { ...link, linkType: "anchor" };
  }

  if (normalisedLink.toLowerCase().startsWith("mailto:")) {
    return { ...link, linkType: "mailto" }
  }

  if (normalisedLink.toLowerCase().startsWith("tel:")) {
    return { ...link, linkType: "tel" }
  }

  return { ...link, linkType: "internal" };
};

export function classifyLinks(links: Link[]): Link[] {
  return links.map(classifyLink);
};