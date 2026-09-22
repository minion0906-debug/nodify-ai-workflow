import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'instagram',
  name: 'Instagram Graph API',
  description: 'Credentials for Instagram Graph API',
  icon: 'Instagram',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'IGQVJx...',
    },
    {
      name: 'userId',
      displayName: 'Instagram User ID',
      type: 'string',
      required: false,
      placeholder: '17841400000000000',
    },
  ],
};

export default definition;
