import { isGoogleSignInEnabled } from '../../../plugins/google-oauth'
import { SignupForm } from './SignupForm'

// Server component: the "Sign up with Google" link is rendered only when Google sign-in
// is configured (FR-004a). GOOGLE_CLIENT_ID is a server secret, so this decision is made
// here and passed to the client form.
const SignupPage = () => <SignupForm googleEnabled={isGoogleSignInEnabled()} />

export default SignupPage
