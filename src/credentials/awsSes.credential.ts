import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'awsSes',
  name: 'AWS SES',
  description: 'Credentials for Amazon Simple Email Service',
  icon: 'Mail',
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
      displayName: 'AWS Region',
      type: 'string',
      required: true,
      placeholder: 'us-east-1',
    },
  ],
};

export default definition;
