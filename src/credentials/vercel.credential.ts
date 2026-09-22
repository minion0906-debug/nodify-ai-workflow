import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'vercel',
  name: 'Vercel',
  description: 'Credentials for Vercel API',
  icon: 'Triangle',
  testable: true,
  properties: [
    {
      name: 'token',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'xxx...',
    },
    {
      name: 'teamId',
      displayName: 'Team ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'team_xxx...',
    },
  ],
};

export default definition;
