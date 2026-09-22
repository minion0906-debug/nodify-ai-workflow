import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'bearerToken',
  name: 'Bearer Token',
  description: 'Bearer token authentication for API requests',
  icon: 'Shield',
  properties: [
    {
      name: 'token',
      displayName: 'Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your bearer token',
    },
  ],
};

export default definition;
