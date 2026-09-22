import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'mysql',
  name: 'MySQL',
  description: 'Credentials for MySQL Database',
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
      placeholder: '3306',
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
      placeholder: 'root',
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'password',
      required: true,
      placeholder: 'your-password',
    },
  ],
};

export default definition;
