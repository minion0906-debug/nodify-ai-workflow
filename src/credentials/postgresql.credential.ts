import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'postgresql',
  name: 'PostgreSQL',
  description: 'Credentials for PostgreSQL Database',
  icon: 'Database',
  testable: true,
  properties: [
    {
      name: 'host',
      displayName: 'Host',
      type: 'string',
      required: true,
      placeholder: 'localhost',
    },
    {
      name: 'port',
      displayName: 'Port',
      type: 'number',
      required: true,
      placeholder: '5432',
    },
    {
      name: 'database',
      displayName: 'Database',
      type: 'string',
      required: true,
      placeholder: 'mydb',
    },
    {
      name: 'username',
      displayName: 'Username',
      type: 'string',
      required: true,
      placeholder: 'postgres',
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'password',
      required: true,
      placeholder: 'your-password',
    },
    {
      name: 'ssl',
      displayName: 'SSL Enabled',
      type: 'boolean',
      required: false,
    },
  ],
};

export default definition;
