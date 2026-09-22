
import { Timestamp } from "firebase/firestore";

export type CredentialPropertyType = 'string' | 'number' | 'boolean' | 'options' | 'password';

export type CredentialProperty = {
  name: string;
  displayName: string;
  type: CredentialPropertyType;
  default?: any;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type CredentialDefinition = {
  id: string;
  name: string;
  description: string;
  icon?: string; // Lucide icon name
  properties: CredentialProperty[];
  testable?: boolean; // Whether this credential can be tested
  testEndpoint?: string; // Optional test endpoint URL
};

export type Credential = {
  id: string;
  name: string;
  type: string; // Corresponds to CredentialDefinition name
  createdAt: Timestamp | string;
  data: Record<string, any>;
};
