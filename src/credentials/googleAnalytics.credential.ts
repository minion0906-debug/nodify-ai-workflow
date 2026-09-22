import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'googleAnalytics',
  name: 'Google Analytics',
  description: 'Credentials for Google Analytics Reporting API',
  icon: 'BarChart3',
  testable: true,
  properties: [
    {
      name: 'accessToken',
      displayName: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'ya29...',
    },
    {
      name: 'viewId',
      displayName: 'View ID (Optional)',
      type: 'string',
      required: false,
      placeholder: '123456789',
    },
    {
      name: 'propertyId',
      displayName: 'Property ID (GA4)',
      type: 'string',
      required: false,
      placeholder: '123456789',
    },
  ],
};

export default definition;
