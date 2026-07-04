'use client'

import { useEffect, useState } from 'react'

// Dev-only affordance: asks the dev-only endpoint for the verification link (which is
// otherwise just logged, since local dev sends no email) and renders it inline. Renders
// nothing in production (the endpoint 404s) or once the account is already verified.
export const DevVerifyLink = ({ email }: { email: string }) => {
  const [link, setLink] = useState<string | null>(null)

  useEffect(() => {
    if (!email) return
    let active = true
    fetch(`/dev/verify-link?email=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.link) setLink(data.link)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [email])

  if (!link) return null

  return (
    <div className="dev-note">
      <span className="dev-note__tag">Dev</span>
      No email is sent locally.{' '}
      <a className="link" href={link}>
        Verify this account →
      </a>
    </div>
  )
}
