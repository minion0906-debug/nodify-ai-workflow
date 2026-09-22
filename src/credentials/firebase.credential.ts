import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'firebase',
  name: 'Firebase',
  description: 'Credentials for Firebase Admin SDK',
  icon: 'Flame',
  testable: true,
  properties: [
    {
      name: 'serviceAccountKey',
      displayName: 'Service Account Key (JSON)',
      type: 'json',
      required: true,
      placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}',
    },
  ],
};

export default definition;
