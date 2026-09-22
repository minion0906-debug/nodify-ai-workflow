import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'confluence',
  name: 'Confluence',
  description: 'Credentials for Atlassian Confluence API',
  icon: 'FileText',
  testable: true,
  properties: [
    {
      name: 'domain',
      displayName: 'Domain',
      type: 'string',
      required: true,
      placeholder: 'your-domain.atlassian.net',
    },
    {
      name: 'email',
      displayName: 'Email',
      type: 'string',
      required: true,
      placeholder: 'user@example.com',
    },
    {
      name: 'apiToken',
      displayName: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'ATATT...',
    },
  ],
};

export default definition;
