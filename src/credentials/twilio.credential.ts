import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'twilio',
  name: 'Twilio',
  description: 'Twilio credentials for SMS, voice calls, and messaging',
  icon: 'Phone',
  testable: true,
  properties: [
    {
      name: 'accountSid',
      displayName: 'Account SID',
      type: 'string',
      required: true,
      placeholder: 'AC...',
    },
    {
      name: 'authToken',
      displayName: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'Your Twilio auth token',
    },
    {
      name: 'phoneNumber',
      displayName: 'Phone Number (Optional)',
      type: 'string',
      required: false,
      placeholder: '+1234567890',
    },
  ],
};

export default definition;
