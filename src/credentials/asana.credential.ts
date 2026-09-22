import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'asana',
  name: 'Asana',
  description: 'Credentials for Asana API',
  icon: 'CheckSquare',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: '0/...',
    },
  ],
};

export default definition;
