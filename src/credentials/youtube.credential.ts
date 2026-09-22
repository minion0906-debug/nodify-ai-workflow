import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'youtube',
  name: 'YouTube Data API',
  description: 'Credentials for YouTube Data API v3',
  icon: 'Youtube',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'AIzaSy...',
    },
    {
      name: 'accessToken',
      displayName: 'OAuth Access Token (Optional)',
      type: 'password',
      required: false,
      placeholder: 'ya29...',
    },
  ],
};

export default definition;
