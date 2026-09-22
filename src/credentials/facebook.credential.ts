import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'facebook',
  name: 'Facebook Graph API',
  description: 'Credentials for Facebook Graph API',
  icon: 'Facebook',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'EAAx...',
    },
    {
      name: 'appId',
      displayName: 'App ID',
      type: 'string',
      required: false,
      placeholder: '123456789012345',
    },
    {
      name: 'appSecret',
      displayName: 'App Secret',
      type: 'password',
      required: false,
      placeholder: 'abcdef1234567890abcdef1234567890',
    },
  ],
};

export default definition;
