import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'apiKey',
  name: 'API Key',
  description: 'Credential for services that use a single API key for authentication.',
  icon: 'Key',
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your API key',
    },
  ],
};

export default definition;
