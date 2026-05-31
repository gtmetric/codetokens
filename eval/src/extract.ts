const FENCE = /```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g

export function extractCode(response: string): string {
  const blocks = [...response.matchAll(FENCE)].map((m) => m[1] ?? '')
  if (blocks.length > 0) {
    return blocks.reduce((a, b) => (b.length > a.length ? b : a)).trim()
  }
  return response.trim()
}
