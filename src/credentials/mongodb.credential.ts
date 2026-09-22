import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'mongodb',
  name: 'MongoDB Atlas',
  description: 'Credentials for MongoDB Atlas',
  icon: 'Database',
  testable: true,
  properties: [
    {
      name: 'connectionString',
      displayName: 'Connection String',
      type: 'password',
      required: true,
      placeholder: 'mongodb+srv://username:password@cluster.mongodb.net/database',
    },
    {
      name: 'database',
      displayName: 'Database Name',
      type: 'string',
      required: false,
      placeholder: 'myDatabase',
    },
  ],
};

export default definition;
