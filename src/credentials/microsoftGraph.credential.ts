import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'microsoftGraph',
  name: 'Microsoft Graph',
  description: 'Credentials for Microsoft Graph API (OneDrive, Outlook, Teams, etc.)',
  icon: 'Cloud',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'eyJ0...',
    },
    {
      name: 'tenantId',
      displayName: 'Tenant ID',
      type: 'string',
      required: false,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'clientId',
      displayName: 'Client ID (App ID)',
      type: 'string',
      required: false,
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      name: 'clientSecret',
      displayName: 'Client Secret',
      type: 'password',
      required: false,
      placeholder: 'xxx~...',
    },
  ],
};

export default definition;
