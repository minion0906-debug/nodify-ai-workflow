import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'amplitude',
  name: 'Amplitude',
  description: 'Credentials for Amplitude Analytics API',
  icon: 'Activity',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      name: 'secretKey',
      displayName: 'Secret Key',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],
};

export default definition;
