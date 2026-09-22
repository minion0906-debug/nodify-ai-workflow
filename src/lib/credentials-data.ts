import type { Credential } from "./credentials-types";

export const credentials: Credential[] = [
  {
    id: 'cred-1',
    name: 'My Main API Key',
    type: 'API Key',
    createdAt: '2 weeks ago',
    data: {
      apiKey: 'sec_123456****************',
    }
  },
  {
    id: 'cred-2',
    name: 'Staging Service Account',
    type: 'API Key',
    createdAt: '1 month ago',
    data: {
        apiKey: 'sec_789012****************',
    }
  }
];
