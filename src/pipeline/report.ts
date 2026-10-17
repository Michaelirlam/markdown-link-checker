import { Link } from "../types/types";

export function invalidInternalLinks(links: Link[]): Link[] {
  return links.filter(link => link.linkType === "internal" && link.validationStatus === "invalid");
}

export function invalidExternalLinks(links: Link[]): Link[] {
  return links.filter(link => link.linkType === "external" && link.validationStatus === "invalid");
}

export function generateReport(links: Link[]): Object {
  const internal = invalidInternalLinks(links);
  const external = invalidExternalLinks(links);
  return { internal, external };
}