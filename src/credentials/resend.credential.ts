import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'resend',
  name: 'Resend',
  description: 'Credentials for Resend Email API',
  icon: 'Mail',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 're_...',
    },
  ],
};

export default definition;
