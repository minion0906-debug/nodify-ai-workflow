import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'mailchimp',
  name: 'Mailchimp',
  description: 'Credentials for Mailchimp Marketing API',
  icon: 'Mail',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1',
    },
    {
      name: 'server',
      displayName: 'Server Prefix',
      type: 'string',
      required: false,
      placeholder: 'us1',
      description: 'The server prefix from your API key (e.g., us1, us2)',
    },
  ],
};

export default definition;
