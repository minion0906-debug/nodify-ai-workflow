import type { CredentialDefinition } from "@/lib/credentials-types";

const definition: CredentialDefinition = {
  id: 'slack',
  name: 'Slack',
  description: 'Slack Bot Token for sending messages and interacting with Slack API',
  icon: 'MessageSquare',
  testable: true,
  properties: [
    {
      name: 'botToken',
      displayName: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'xoxb-...',
    },
    {
      name: 'webhookUrl',
      displayName: 'Webhook URL (Optional)',
      type: 'string',
      required: false,
      placeholder: 'https://hooks.slack.com/services/...',
    },
  ],
};

export default definition;
