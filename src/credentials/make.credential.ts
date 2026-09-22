import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'make',
  name: 'Make (Integromat)',
  description: 'Credentials for Make (formerly Integromat) Webhooks',
  icon: 'Workflow',
  testable: true,
  properties: [
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL',
      type: 'string',
      required: true,
      placeholder: 'https://hook.integromat.com/...',
    },
    {
      name: 'apiKey',
      displayName: 'API Key (Optional)',
      type: 'password',
      required: false,
      placeholder: 'xxx...',
    },
  ],
};

export default definition;
