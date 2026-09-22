import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'monday',
  name: 'Monday.com',
  description: 'Credentials for Monday.com API',
  icon: 'Calendar',
  testable: true,
  properties: [
    {
      name: 'apiToken',
      displayName: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'eyJhb...',
    },
  ],
};

export default definition;
