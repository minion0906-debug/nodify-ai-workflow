import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'paypal',
  name: 'PayPal',
  description: 'Credentials for PayPal REST API',
  icon: 'CreditCard',
  testable: true,
  properties: [
    {
      name: 'clientId',
      displayName: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'AYSq...',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'ECluS...',
    },
    {
      name: 'environment',
      displayName: 'Environment',
      type: 'select',
      required: true,
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Production', value: 'production' },
      ],
    },
  ],
};

export default definition;
