import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'postmark',
  name: 'Postmark',
  description: 'Credentials for Postmark Email API',
  icon: 'Send',
  testable: true,
  properties: [
    {
      name: 'serverToken',
      displayName: 'Server API Token',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'accountToken',
      displayName: 'Account API Token (Optional)',
      type: 'password',
      required: false,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
  ],
};

export default definition;
