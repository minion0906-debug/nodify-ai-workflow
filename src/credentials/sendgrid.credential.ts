import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'sendgrid',
  name: 'SendGrid',
  description: 'SendGrid API key for sending emails',
  icon: 'Mail',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'SG...',
    },
  ],
};

export default definition;
