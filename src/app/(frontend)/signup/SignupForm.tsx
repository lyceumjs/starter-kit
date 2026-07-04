'use client'

import { useState } from 'react'

import { DevVerifyLink } from '../DevVerifyLink'

// Email/password self-signup — posts to Payload's public create endpoint. A successful
// create always yields a Student (server-enforced) and dispatches a verification email.
export const SignupForm = ({ googleEnabled }: { googleEnabled: boolean }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body?.errors?.[0]?.message || 'That didn’t work. This email may already be registered.',
        )
      }
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="card">
        <div className="status-icon status-icon--info" aria-hidden="true">
          ✉
        </div>
        <h1 className="card__title">Check your inbox</h1>
        <p className="prose">
          We sent a verification link to <strong>{email}</strong>. Open it to activate your
          account, then <a className="link" href="/signin">sign in</a>.
        </p>
        <DevVerifyLink email={email} />
      </div>
    )
  }

  return (
    <div className="card">
      <h1 className="card__title">Create your account</h1>
      <p className="card__subtitle">Start learning in a couple of minutes.</p>

      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {status === 'error' && <p className="alert alert--error">{error}</p>}

        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="divider">or</div>
          <a className="btn-link" href="/api/users/oauth/google">
            Continue with Google
          </a>
        </>
      )}

      <p className="meta">
        Already have an account? <a className="link" href="/signin">Sign in</a>
      </p>
    </div>
  )
}
