export const AVATAR_PRESETS = [
  {
    id: 1,
    label: "Morning sky",
    url: "https://api.dicebear.com/7.x/notionists/svg?seed=instantmed-avatar-1&backgroundColor=bad4f5,f5c6a0,f7f3ec",
  },
  {
    id: 2,
    label: "Coffee run",
    url: "https://api.dicebear.com/7.x/notionists/svg?seed=instantmed-avatar-2&backgroundColor=f5c6a0,e8d5a3,bad4f5",
  },
  {
    id: 3,
    label: "Quiet shift",
    url: "https://api.dicebear.com/7.x/notionists/svg?seed=instantmed-avatar-3&backgroundColor=e8d5a3,f7f3ec,bad4f5",
  },
  {
    id: 4,
    label: "Day off",
    url: "https://api.dicebear.com/7.x/notionists/svg?seed=instantmed-avatar-4&backgroundColor=f7f3ec,bad4f5,f5c6a0",
  },
] as const

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"]

export function getAvatarPresetUrl(id: number): string | null {
  return AVATAR_PRESETS.find((preset) => preset.id === id)?.url ?? null
}

export function getAvatarPresetId(avatarUrl: string | null | undefined): number | null {
  return AVATAR_PRESETS.find((preset) => preset.url === avatarUrl)?.id ?? null
}
