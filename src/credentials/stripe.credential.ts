import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'stripe',
  name: 'Stripe',
  description: 'Stripe payment processing API credentials',
  icon: 'CreditCard',
  testable: true,
  properties: [
    {
      name: 'secretKey',
      displayName: 'Secret Key',
      type: 'password',
      required: true,
      placeholder: 'sk_test_... or sk_live_...',
    },
    {
      name: 'publishableKey',
      displayName: 'Publishable Key (Optional)',
      type: 'string',
      required: false,
      placeholder: 'pk_test_... or pk_live_...',
    },
  ],
};

export default definition;
