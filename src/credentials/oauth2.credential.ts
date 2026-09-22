import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'oauth2',
  name: 'OAuth2',
  description: 'OAuth2 authentication credentials',
  icon: 'UserCheck',
  properties: [
    {
      name: 'clientId',
      displayName: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Enter client ID',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter client secret',
    },
    {
      name: 'accessToken',
      displayName: 'Access Token (Optional)',
      type: 'password',
      required: false,
      placeholder: 'Enter access token if available',
    },
    {
      name: 'refreshToken',
      displayName: 'Refresh Token (Optional)',
      type: 'password',
      required: false,
      placeholder: 'Enter refresh token if available',
    },
  ],
};

export default definition;
