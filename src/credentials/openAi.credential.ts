import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'openAi',
  name: 'OpenAI',
  description: 'Credentials for OpenAI API (GPT, DALL-E, Whisper, etc.)',
  icon: 'Sparkles',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'sk-...',
    },
    {
      name: 'organization',
      displayName: 'Organization ID (Optional)',
      type: 'string',
      required: false,
      placeholder: 'org-...',
    },
  ],
};

export default definition;
