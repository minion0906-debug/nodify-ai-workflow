import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'shopify',
  name: 'Shopify',
  description: 'Credentials for Shopify Admin API',
  icon: 'ShoppingBag',
  testable: true,
  properties: [
    {
      name: 'shopName',
      displayName: 'Shop Name',
      type: 'string',
      required: true,
      placeholder: 'mystore',
      description: 'Your shop name (e.g., mystore from mystore.myshopify.com)',
    },
    {
      name: 'accessToken',
      displayName: 'Admin API Access Token',
      type: 'password',
      required: true,
      placeholder: 'shpat_...',
    },
    {
      name: 'apiVersion',
      displayName: 'API Version',
      type: 'string',
      required: false,
      placeholder: '2024-01',
    },
  ],
};

export default definition;
