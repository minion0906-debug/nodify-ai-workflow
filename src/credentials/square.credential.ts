import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'square',
  name: 'Square',
  description: 'Credentials for Square API',
  icon: 'Square',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'EAAAE...',
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
    {
      name: 'locationId',
      displayName: 'Location ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'L1234567890',
    },
  ],
};

export default definition;
