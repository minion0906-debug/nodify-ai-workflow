import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'httpAuth',
  name: 'HTTP Basic Auth',
  description: 'Username and password authentication for HTTP requests',
  icon: 'Lock',
  properties: [
    {
      name: 'username',
      displayName: 'Username',
      type: 'string',
      required: true,
      placeholder: 'Enter username',
    },
    {
      name: 'password',
      displayName: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Enter password',
    },
  ],
};

export default definition;
