import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'redis',
  name: 'Redis',
  description: 'Credentials for Redis Database',
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
      placeholder: '6379',
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'password',
      required: false,
      placeholder: 'your-redis-password',
    },
    {
      name: 'database',
      displayName: 'Database Number',
      type: 'number',
      required: false,
      placeholder: '0',
    },
  ],
};

export default definition;
