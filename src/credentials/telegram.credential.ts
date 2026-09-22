import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'telegram',
  name: 'Telegram Bot',
  description: 'Telegram Bot Token for sending messages via Bot API',
  icon: 'Send',
  testable: true,
  properties: [
    {
      name: 'botToken',
      displayName: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: '123456:ABC-DEF...',
    },
  ],
};

export default definition;
