import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'gemini',
  name: 'Google Gemini',
  description: 'Credentials for Google Gemini AI API',
  icon: 'Sparkles',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'AIza...',
    },
  ],
};

export default definition;
