import type { ReactNode } from 'react'

import './theme.css'

// Root layout for the student-facing surface (FR-015). Sibling to the (payload) root
// layout. Branding here is a placeholder token system (see theme.css) meant to be
// re-skinned via CSS variables when the real brand lands.

// Brand mark reused as favicon (an "ascending progress" glyph — the subject is learning).
const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%234f46e5'/%3E%3Cg fill='white'%3E%3Crect x='7' y='17' width='4.5' height='8' rx='2'/%3E%3Crect x='13.75' y='11' width='4.5' height='14' rx='2'/%3E%3Crect x='20.5' y='6' width='4.5' height='19' rx='2'/%3E%3C/g%3E%3C/svg%3E"

export const metadata = {
  title: 'LMS',
  description: 'Learning platform',
  icons: { icon: favicon },
}

const BrandMark = () => (
  <span className="brand__mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="3" y="13" width="4" height="8" rx="1.5" />
      <rect x="10" y="8" width="4" height="13" rx="1.5" opacity="0.85" />
      <rect x="17" y="3" width="4" height="18" rx="1.5" opacity="0.7" />
    </svg>
  </span>
)

const RootLayout = ({ children }: { children: ReactNode }) => (
  // suppressHydrationWarning: browser extensions (LanguageTool, Grammarly) inject
  // attributes on <html> before hydration; without this, React logs a mismatch warning.
  <html lang="en" suppressHydrationWarning>
    <body>
      <div className="stack">
        <a className="brand" href="/">
          <BrandMark />
          <span className="brand__word">
            LMS <span className="brand__word-soft">Learn</span>
          </span>
        </a>
        {children}
      </div>
    </body>
  </html>
)

export default RootLayout
