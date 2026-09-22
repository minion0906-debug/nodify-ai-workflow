import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'anthropic',
  name: 'Anthropic (Claude)',
  description: 'Credentials for Anthropic Claude AI API',
  icon: 'Bot',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'sk-ant-...',
    },
  ],
};

export default definition;
