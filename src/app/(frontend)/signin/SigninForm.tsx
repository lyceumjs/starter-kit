'use client'

import { useState } from 'react'

import { DevVerifyLink } from '../DevVerifyLink'

// Sign-in form — posts to Payload's login endpoint. Surfaces the unverified-email case
// (403) distinctly from bad credentials (FR-004c), and redirects to /dashboard on success.
export const SigninForm = ({ googleEnabled }: { googleEnabled: boolean }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    setUnverified(false)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = '/dashboard'
        return
      }
      if (res.status === 403) {
        setUnverified(true)
        throw new Error('Your email isn’t verified yet. Check your inbox for the link.')
      }
      throw new Error('Incorrect email or password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setStatus('error')
    }
  }

  return (
    <div className="card">
      <h1 className="card__title">Welcome back</h1>
      <p className="card__subtitle">Sign in to continue learning.</p>

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
            autoComplete="current-password"
            placeholder="Your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {status === 'error' && <p className="alert alert--error">{error}</p>}
        {unverified && <DevVerifyLink email={email} />}

        <button className="btn btn--primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Signing in…' : 'Sign in'}
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
        New here? <a className="link" href="/signup">Create an account</a>
      </p>
    </div>
  )
}
