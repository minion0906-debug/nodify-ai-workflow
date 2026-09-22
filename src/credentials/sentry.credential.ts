import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'sentry',
  name: 'Sentry',
  description: 'Credentials for Sentry Error Tracking API',
  icon: 'AlertTriangle',
  testable: true,
  properties: [
    {
      name: 'authToken',
      displayName: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'sntrys_...',
    },
    {
      name: 'organization',
      displayName: 'Organization Slug',
      type: 'string',
      required: false,
      placeholder: 'my-org',
    },
    {
      name: 'project',
      displayName: 'Project Slug',
      type: 'string',
      required: false,
      placeholder: 'my-project',
    },
  ],
};

export default definition;
