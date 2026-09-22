import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  description: 'Credentials for ElevenLabs Text-to-Speech API',
  icon: 'Mic',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'sk_...',
    },
  ],
};

export default definition;
