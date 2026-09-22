import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'mercadopago',
  name: 'Mercado Pago',
  description: 'Credentials for Mercado Pago API',
  icon: 'Wallet',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'APP_USR-...',
    },
    {
      name: 'publicKey',
      displayName: 'Public Key',
      type: 'string',
      required: false,
      placeholder: 'APP_USR-...',
    },
  ],
};

export default definition;
