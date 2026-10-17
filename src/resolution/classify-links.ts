import { Link } from "../types/types";

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