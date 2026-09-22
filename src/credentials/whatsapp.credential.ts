import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'whatsapp',
  name: 'WhatsApp Cloud API (Meta)',
  description: 'Credentials matching Meta (Facebook) Developers for WhatsApp Cloud API',
  icon: 'MessageCircle',
  testable: true,
  properties: [
    // Core Meta app identifiers
    {
      name: 'appId',
      displayName: 'App ID',
      type: 'string',
      required: false,
      placeholder: '123456789012345',
    },
    {
      name: 'appSecret',
      displayName: 'App Secret',
      type: 'password',
      required: false,
      placeholder: 'abcdef0123456789abcdef0123456789',
    },

    // API access
    {
      name: 'accessToken',
      displayName: 'Access Token (Permanent)',
      type: 'password',
      required: true,
      placeholder: 'EAAx...',
    },
    {
      name: 'apiVersion',
      displayName: 'Graph API Version',
      type: 'string',
      required: false,
      placeholder: 'v20.0',
      default: 'v20.0'
    },

    // WhatsApp entities
    {
      name: 'wabaId',
      displayName: 'WhatsApp Business Account ID (WABA ID)',
      type: 'string',
      required: false,
      placeholder: '1234567890',
    },
    {
      name: 'phoneNumberId',
      displayName: 'Phone Number ID',
      type: 'string',
      required: true,
      placeholder: '1234567890',
    },
  ],
};

export default definition;
