import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'huggingface',
  name: 'Hugging Face',
  description: 'Credentials for Hugging Face API',
  icon: 'Brain',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'hf_...',
    },
  ],
};

export default definition;
