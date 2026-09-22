import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'cloudflare',
  name: 'Cloudflare',
  description: 'Credentials for Cloudflare API',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'apiToken',
      displayName: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'xxx...',
    },
    {
      name: 'accountId',
      displayName: 'Account ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      name: 'zoneId',
      displayName: 'Zone ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],
};

export default definition;
