/**
 * Find the dotted path to the most deeply nested key in a plain object.
 *
 * Bespoke rules:
 * - A path's depth is its number of dotted segments; nested object keys are
 *   deeper than their parent key.
 * - Plain objects are descended into; any non-object value is a leaf.
 * - The deepest path wins. When several paths share the maximum depth, the one
 *   encountered FIRST during the walk (object key insertion order) is returned.
 * - An empty object yields the empty string.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepestKey(obj: Record<string, unknown>): string {
  let bestPath = ''
  let bestDepth = 0

  const visit = (node: Record<string, unknown>, prefix: string): void => {
    for (const key of Object.keys(node)) {
      const path = prefix === '' ? key : `${prefix}.${key}`
      const depth = path.split('.').length
      if (depth > bestDepth) {
        bestDepth = depth
        bestPath = path
      }
      const value = node[key]
      if (isPlainObject(value)) visit(value, path)
    }
  }

  visit(obj, '')
  return bestPath
}
