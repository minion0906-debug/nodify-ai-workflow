import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'discord',
  name: 'Discord',
  description: 'Discord Bot Token for sending messages and interacting with Discord API',
  icon: 'MessageCircle',
  testable: true,
  properties: [
    {
      name: 'botToken',
      displayName: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'Your Discord bot token',
    },
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL (Optional)',
      type: 'string',
      required: false,
      placeholder: 'https://discord.com/api/webhooks/...',
    },
  ],
};

export default definition;
