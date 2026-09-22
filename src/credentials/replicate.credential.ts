import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'replicate',
  name: 'Replicate',
  description: 'Credentials for Replicate AI API',
  icon: 'Sparkles',
  testable: true,
  properties: [
    {
      name: 'apiToken',
      displayName: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'r8_...',
    },
  ],
};

export default definition;
