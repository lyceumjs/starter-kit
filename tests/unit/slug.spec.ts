import { describe, expect, it } from 'vitest'

// Purity guard: the slug module is pure (no Payload/Next); this file imports only it.
import { SLUG_PATTERN, suggestSlug } from '../../src/domain/slug'

describe('suggestSlug', () => {
  it('slugifies a plain name', () => {
    expect(suggestSlug('Hello World')).toBe('hello-world')
  })

  it('lowercases and hyphenates arbitrary separators', () => {
    expect(suggestSlug('UPPER  Case & Stuff')).toBe('upper-case-stuff')
  })

  it('strips Latin diacritics (NFD)', () => {
    expect(suggestSlug("Écoles d'été")).toBe('ecoles-d-ete')
    expect(suggestSlug('Ñoño café')).toBe('nono-cafe')
  })

  it('transliterates Cyrillic', () => {
    expect(suggestSlug('Курс по математике')).toBe('kurs-po-matematike')
    expect(suggestSlug('Привет World 42')).toBe('privet-world-42')
  })

  it('collapses consecutive separators to a single hyphen', () => {
    expect(suggestSlug('a---b')).toBe('a-b')
    expect(suggestSlug('café---bar')).toBe('cafe-bar')
  })

  it('trims leading and trailing separators', () => {
    expect(suggestSlug('  Trim  Me  ')).toBe('trim-me')
    expect(suggestSlug('--edge--')).toBe('edge')
  })

  it('passes an already-valid slug through unchanged', () => {
    expect(suggestSlug('already-valid-slug')).toBe('already-valid-slug')
    expect(suggestSlug('my-course-101')).toBe('my-course-101')
  })

  it("returns '' for names with no transliterable characters (callers treat '' as no suggestion)", () => {
    expect(suggestSlug('!!!')).toBe('')
    expect(suggestSlug('🎉🎉')).toBe('')
    expect(suggestSlug('   ')).toBe('')
    expect(suggestSlug('')).toBe('')
  })

  // Property: output is ALWAYS either '' or a valid slug, for every fixture.
  const fixtures = [
    'Hello World',
    "Écoles d'été",
    'Курс по математике',
    'Привет World 42',
    'UPPER  Case & Stuff',
    '  Trim  Me  ',
    'a---b',
    'café---bar',
    'already-valid-slug',
    'C++ & Rust',
    '123 Numbers',
    'Ñoño',
    '!!!',
    '🎉🎉',
    '',
    '汉字 only',
  ]

  it.each(fixtures)('output matches SLUG_PATTERN or is empty: %j', (name) => {
    const out = suggestSlug(name)
    expect(out === '' || SLUG_PATTERN.test(out)).toBe(true)
  })
})

describe('SLUG_PATTERN', () => {
  it('accepts canonical slugs and rejects malformed ones', () => {
    expect(SLUG_PATTERN.test('a')).toBe(true)
    expect(SLUG_PATTERN.test('a-b-c')).toBe(true)
    expect(SLUG_PATTERN.test('abc123')).toBe(true)
    expect(SLUG_PATTERN.test('')).toBe(false)
    expect(SLUG_PATTERN.test('-a')).toBe(false)
    expect(SLUG_PATTERN.test('a-')).toBe(false)
    expect(SLUG_PATTERN.test('a--b')).toBe(false)
    expect(SLUG_PATTERN.test('Abc')).toBe(false)
  })
})
