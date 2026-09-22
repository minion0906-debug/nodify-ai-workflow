import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'azure',
  name: 'Microsoft Azure',
  description: 'Credentials for Microsoft Azure services',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'subscriptionId',
      displayName: 'Subscription ID',
      type: 'string',
      required: true,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'tenantId',
      displayName: 'Tenant ID',
      type: 'string',
      required: true,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'clientId',
      displayName: 'Client ID (Application ID)',
      type: 'string',
      required: true,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'xxx~...',
    },
  ],
};

export default definition;
