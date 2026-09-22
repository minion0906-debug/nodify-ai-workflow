import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'airtable',
  name: 'Airtable',
  description: 'Airtable API credentials for accessing bases and tables',
  icon: 'Table',
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'key...',
    },
  ],
};

export default definition;
