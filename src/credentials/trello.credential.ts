import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'trello',
  name: 'Trello',
  description: 'Credentials for Trello API',
  icon: 'Trello',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: '...',
    },
    {
      name: 'token',
      displayName: 'Token',
      type: 'password',
      required: true,
      placeholder: '...',
    },
  ],
};

export default definition;
