import { Auth0Provider } from '@auth0/auth0-react';

// Check if Auth0 is properly configured
export const isAuth0Configured = () => {
  return !!(
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN && 
    process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID &&
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN !== 'your-tenant.us.auth0.com' &&
    process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID !== 'your-client-id-here'
  );
};

export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    scope: 'openid profile email'
  },
  cacheLocation: 'memory' as const,
  useRefreshTokens: false,
  useRefreshTokensFallback: false,
};

export const getAuth0Config = () => {
  return {
    ...auth0Config,
    authorizationParams: {
      ...auth0Config.authorizationParams,
      redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    },
  };
}; 