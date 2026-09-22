import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'googleDrive',
  name: 'Google Drive',
  description: 'Credentials for Google Drive API',
  icon: 'HardDrive',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'ya29...',
    },
    {
      name: 'refreshToken',
      displayName: 'Refresh Token',
      type: 'password',
      required: false,
      placeholder: '1//...',
    },
    {
      name: 'clientId',
      displayName: 'Client ID',
      type: 'string',
      required: false,
      placeholder: '123456789-xxx.apps.googleusercontent.com',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: false,
      placeholder: 'GOCSPX-...',
    },
  ],
};

export default definition;
