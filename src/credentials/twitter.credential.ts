import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'twitter',
  name: 'Twitter/X API',
  description: 'Credentials for Twitter (X) API v2',
  icon: 'Twitter',
  testable: true,
  properties: [
    {
      name: 'bearerToken',
      displayName: 'Bearer Token',
      type: 'password',
      required: true,
      placeholder: 'AAAAAAAAAAAAAAAAAAAAAA...',
    },
    {
      name: 'apiKey',
      displayName: 'API Key (Consumer Key)',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      name: 'apiSecret',
      displayName: 'API Secret (Consumer Secret)',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      name: 'accessTokenSecret',
      displayName: 'Access Token Secret',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],
};

export default definition;
