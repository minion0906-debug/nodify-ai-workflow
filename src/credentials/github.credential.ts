import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'github',
  name: 'GitHub',
  description: 'GitHub Personal Access Token for API access',
  icon: 'Github',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'ghp_...',
    },
  ],
};

export default definition;
