import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'netlify',
  name: 'Netlify',
  description: 'Credentials for Netlify API',
  icon: 'Globe',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'xxx...',
    },
  ],
};

export default definition;
