import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'notion',
  name: 'Notion',
  description: 'Notion Integration Token for accessing databases and pages',
  icon: 'FileText',
  properties: [
    {
      name: 'apiKey',
      displayName: 'Integration Token',
      type: 'password',
      required: true,
      placeholder: 'secret_...',
    },
  ],
};

export default definition;
