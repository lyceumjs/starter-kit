import { isGoogleSignInEnabled } from '../../../plugins/google-oauth'
import { SigninForm } from './SigninForm'

const SigninPage = () => <SigninForm googleEnabled={isGoogleSignInEnabled()} />

export default SigninPage
