import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'dropbox',
  name: 'Dropbox',
  description: 'Credentials for Dropbox API',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'sl.B...',
    },
    {
      name: 'appKey',
      displayName: 'App Key (Optional)',
      type: 'string',
      required: false,
      placeholder: 'xxxxxxxxxx',
    },
    {
      name: 'appSecret',
      displayName: 'App Secret (Optional)',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxx',
    },
  ],
};

export default definition;
