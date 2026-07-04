import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

// Signed-in placeholder page — the SC-006 destination. Reachable by any authenticated
// role (FR-017, no role gate); anonymous visitors are redirected to /signin. Auth is
// resolved server-side from the Payload cookie.
const DashboardPage = async () => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await nextHeaders() })

  if (!user) redirect('/signin')

  return (
    <div className="card">
      <h1 className="card__title">You’re in</h1>
      <p className="card__subtitle">
        Signed in as <strong>{user.email}</strong>
        <span className="badge">{user.role}</span>
      </p>

      <p className="prose">
        The learning experience — course catalog, enrollment, and lessons — arrives in a later
        feature. This is your placeholder home.
      </p>

      <form className="form" action="/api/users/logout" method="post">
        <button className="btn btn--ghost" type="submit">
          Sign out
        </button>
      </form>
    </div>
  )
}

export default DashboardPage
