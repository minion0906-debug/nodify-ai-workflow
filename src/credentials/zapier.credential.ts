import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'zapier',
  name: 'Zapier',
  description: 'Credentials for Zapier Webhooks',
  icon: 'Zap',
  testable: true,
  properties: [
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL',
      type: 'string',
      required: true,
      placeholder: 'https://hooks.zapier.com/hooks/catch/...',
    },
  ],
};

export default definition;
