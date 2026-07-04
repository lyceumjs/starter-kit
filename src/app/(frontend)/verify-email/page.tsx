'use client'

import { useEffect, useState } from 'react'

// Consumes the `?token=…` from the emailed link and calls Payload's verify endpoint
// (research D1). Shows success (with a link to sign in) or failure.
const VerifyEmailPage = () => {
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setState('error')
      return
    }
    fetch(`/api/users/verify/${token}`, { method: 'POST' })
      .then((res) => setState(res.ok ? 'success' : 'error'))
      .catch(() => setState('error'))
  }, [])

  if (state === 'verifying') {
    return (
      <div className="card">
        <div className="status-icon status-icon--info" aria-hidden="true">
          <span className="spinner" />
        </div>
        <h1 className="card__title">Verifying…</h1>
        <p className="prose">Confirming your email address.</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="card">
        <div className="status-icon status-icon--success" aria-hidden="true">
          ✓
        </div>
        <h1 className="card__title">Email verified</h1>
        <p className="prose">Your account is active.</p>
        <div className="form">
          <a className="btn btn--primary" href="/signin">
            Continue to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="status-icon status-icon--error" aria-hidden="true">
        !
      </div>
      <h1 className="card__title">Verification failed</h1>
      <p className="prose">This link is invalid or has already been used.</p>
      <p className="meta">
        <a className="link" href="/signin">Sign in</a> · <a className="link" href="/signup">Sign up</a>
      </p>
    </div>
  )
}

export default VerifyEmailPage
