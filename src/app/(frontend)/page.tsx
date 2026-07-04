import { redirect } from 'next/navigation'

// Claims the root path `/` for the (frontend) route group. Without a page here, `/`
// falls through to Next's built-in DefaultLayout, whose <html> lacks
// suppressHydrationWarning — so browser extensions (LanguageTool, Grammarly) that add
// attributes to <html> trigger a hydration mismatch warning. Redirect to the dashboard,
// which sends authenticated users to their home and anonymous visitors to /signin.
const HomePage = () => {
  return redirect('/dashboard')
}

export default HomePage
