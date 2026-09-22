import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'linkedin',
  name: 'LinkedIn API',
  description: 'Credentials for LinkedIn REST API',
  icon: 'Linkedin',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'AQVx...',
    },
    {
      name: 'clientId',
      displayName: 'Client ID',
      type: 'string',
      required: false,
      placeholder: '86xxxxxxxxxx',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxx',
    },
  ],
};

export default definition;
