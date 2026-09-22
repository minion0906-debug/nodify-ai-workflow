import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'vonage',
  name: 'Vonage',
  description: 'Credentials for Vonage (Nexmo) API',
  icon: 'Phone',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string',
      required: true,
      placeholder: 'abcd1234',
    },
    {
      name: 'apiSecret',
      displayName: 'API Secret',
      type: 'password',
      required: true,
      placeholder: 'abcdefghijklmnop',
    },
    {
      name: 'applicationId',
      displayName: 'Application ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'aaaaaaaa-bbbb-cccc-dddd-0123456789ab',
    },
    {
      name: 'privateKey',
      displayName: 'Private Key (Optional)',
      type: 'password',
      required: false,
      placeholder: '-----BEGIN PRIVATE KEY-----\n...',
    },
  ],
};

export default definition;
