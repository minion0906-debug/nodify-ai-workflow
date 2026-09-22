import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'googleApi',
  name: 'Google API',
  description: 'Google Cloud API credentials (API Key)',
  icon: 'Chrome',
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'AIza...',
    },
  ],
};

export default definition;
