import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'aws',
  name: 'AWS',
  description: 'Credentials for Amazon Web Services',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'accessKeyId',
      displayName: 'Access Key ID',
      type: 'string',
      required: true,
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
    },
    {
      name: 'secretAccessKey',
      displayName: 'Secret Access Key',
      type: 'password',
      required: true,
      placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
    {
      name: 'region',
      displayName: 'Default Region',
      type: 'string',
      required: true,
      placeholder: 'us-east-1',
    },
    {
      name: 'sessionToken',
      displayName: 'Session Token (Optional)',
      type: 'password',
      required: false,
      placeholder: 'FwoGZXIvYXdzEBYaD...',
    },
  ],
};

export default definition;
