export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []

  const normalized: string[] = []
  for (const value of tags) {
    if (typeof value !== 'string') continue
    const tag = value.trim()
    if (tag && !normalized.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      normalized.push(tag)
    }
  }

  return normalized.slice(0, 3)
}
