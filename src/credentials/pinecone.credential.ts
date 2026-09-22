import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'pinecone',
  name: 'Pinecone',
  description: 'Credentials for Pinecone Vector Database',
  icon: 'Database',
  testable: true,
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'pcsk_...',
    },
    {
      name: 'environment',
      displayName: 'Environment',
      type: 'string',
      required: false,
      placeholder: 'us-west1-gcp',
    },
    {
      name: 'indexName',
      displayName: 'Index Name',
      type: 'string',
      required: false,
      placeholder: 'my-index',
    },
  ],
};

export default definition;
