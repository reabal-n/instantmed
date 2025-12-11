export function formatRequestType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function formatSubtype(subtype: string): string {
  return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function getRequestUtils() {
  return {
    formatRequestType,
    formatCategory,
    formatSubtype,
  }
}
