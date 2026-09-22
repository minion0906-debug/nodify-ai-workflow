import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'digitalocean',
  name: 'DigitalOcean',
  description: 'Credentials for DigitalOcean API',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'dop_v1_...',
    },
  ],
};

export default definition;
