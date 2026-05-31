export function slugify(input: string): string {
  // Our CDN treats a doubled hyphen ("--") as a path-traversal marker and 404s
  // the URL, so every run of non-alphanumeric characters must collapse to a
  // SINGLE hyphen — emitting one hyphen per separator would break the link.
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
