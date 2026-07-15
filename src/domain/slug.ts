// Name → URL slug transform for course creation (research R9). Pure module (no Payload/Next).
// The custom rules will evolve, so each transform step is kept isolated and named. Output
// ALWAYS matches SLUG_PATTERN, or is '' when the name has no transliterable characters —
// callers treat '' as "no suggestion" (slug stays required at the route boundary, so an
// empty suggestion just means the user must type one). No runtime caller yet: the 004
// creation UI prefills this suggestion; the module ships tested and ready.

/** Canonical slug format enforced by the engine and reused by the route layer. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Basic Russian Cyrillic → Latin transliteration (lowercase keys; extend as needed). */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Strip diacritics via NFD decomposition + removal of combining marks (é → e). */
const stripDiacritics = (input: string): string =>
  input.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Replace each Cyrillic character with its Latin equivalent (others pass through). */
const transliterate = (input: string): string =>
  input.replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC_TO_LATIN[ch] ?? ch)

/**
 * Suggest a slug from a display name. Steps: strip diacritics, lowercase, transliterate
 * Cyrillic, reduce any run of non-[a-z0-9] to a single hyphen, then trim edge hyphens.
 */
export const suggestSlug = (name: string): string =>
  transliterate(stripDiacritics(name).toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
