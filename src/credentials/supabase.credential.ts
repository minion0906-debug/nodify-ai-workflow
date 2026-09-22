import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'supabase',
  name: 'Supabase',
  description: 'Credentials for Supabase API',
  icon: 'Database',
  testable: true,
  properties: [
    {
      name: 'url',
      displayName: 'Project URL',
      type: 'string',
      required: true,
      placeholder: 'https://xxxxxxxxxxxxx.supabase.co',
    },
    {
      name: 'anonKey',
      displayName: 'Anon Public Key',
      type: 'password',
      required: true,
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    {
      name: 'serviceRoleKey',
      displayName: 'Service Role Key (Optional)',
      type: 'password',
      required: false,
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  ],
};

export default definition;
