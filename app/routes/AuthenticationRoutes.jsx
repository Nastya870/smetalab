import { lazy } from 'react';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

// maintenance routing
const LoginPage = Loadable(lazy(() => import('views/pages/authentication/Login')));
const RegisterPage = Loadable(lazy(() => import('views/pages/authentication/Register')));
const ForgotPasswordPage = Loadable(lazy(() => import('views/pages/authentication/ForgotPassword')));
const ResetPasswordPage = Loadable(lazy(() => import('views/pages/authentication/ResetPassword')));
const VerifyEmailPage = Loadable(lazy(() => import('views/pages/VerifyEmail')));
const RegistrationSuccessPage = Loadable(lazy(() => import('views/pages/RegistrationSuccess')));
const TermsOfServicePage = Loadable(lazy(() => import('pages/TermsOfService')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const AuthenticationRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '/auth/login',
      element: <LoginPage />
    },
    {
      path: '/auth/register',
      element: <RegisterPage />
    },
    {
      path: '/auth/forgot-password',
      element: <ForgotPasswordPage />
    },
    {
      path: '/auth/reset-password',
      element: <ResetPasswordPage />
    },
    {
      path: '/pages/login',
      element: <LoginPage />
    },
    {
      path: '/pages/register', 
      element: <RegisterPage />
    },
    {
      path: '/pages/forgot-password',
      element: <ForgotPasswordPage />
    },
    {
      path: '/pages/reset-password',
      element: <ResetPasswordPage />
    },
    {
      path: '/registration-success',
      element: <RegistrationSuccessPage />
    },
    {
      path: '/verify-email',
      element: <VerifyEmailPage />
    },
    {
      path: '/terms-of-service',
      element: <TermsOfServicePage />
    }
  ]
};

export default AuthenticationRoutes;
