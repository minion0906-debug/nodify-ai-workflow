import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    if (!type || !data) {
      return NextResponse.json(
        { success: false, message: 'Missing credential type or data' },
        { status: 400 }
      );
    }

    // Test credential based on type
    let testResult = { success: false, message: 'Unknown credential type' };

    switch (type) {
      case 'openAi':
        testResult = await testOpenAI(data);
        break;
      case 'stripe':
        testResult = await testStripe(data);
        break;
      case 'slack':
        testResult = await testSlack(data);
        break;
      case 'discord':
        testResult = await testDiscord(data);
        break;
      case 'twilio':
        testResult = await testTwilio(data);
        break;
      case 'sendgrid':
        testResult = await testSendGrid(data);
        break;
      case 'github':
        testResult = await testGitHub(data);
        break;
      case 'telegram':
        testResult = await testTelegram(data);
        break;
      default:
        testResult = { success: false, message: 'This credential type is not testable yet' };
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing credential:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while testing credential' },
      { status: 500 }
    );
  }
}

// OpenAI test - simple models list call
async function testOpenAI(data: any) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${data.apiKey}`,
        ...(data.organization && { 'OpenAI-Organization': data.organization }),
      },
    });

    if (response.ok) {
      return { success: true, message: 'OpenAI credentials are valid' };
    } else {
      const errorData = await response.json();
      return { success: false, message: errorData.error?.message || 'Invalid OpenAI credentials' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to OpenAI API' };
  }
}

// Stripe test - retrieve account info
async function testStripe(data: any) {
  try {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${data.secretKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Stripe credentials are valid' };
    } else {
      return { success: false, message: 'Invalid Stripe credentials' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Stripe API' };
  }
}

// Slack test - auth.test endpoint
async function testSlack(data: any) {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${data.botToken}`,
      },
    });

    const result = await response.json();
    if (result.ok) {
      return { success: true, message: `Slack credentials are valid (Team: ${result.team})` };
    } else {
      return { success: false, message: result.error || 'Invalid Slack credentials' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Slack API' };
  }
}

// Discord test - get current user
async function testDiscord(data: any) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${data.botToken}`,
      },
    });

    if (response.ok) {
      const user = await response.json();
      return { success: true, message: `Discord credentials are valid (Bot: ${user.username})` };
    } else {
      return { success: false, message: 'Invalid Discord bot token' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Discord API' };
  }
}

// Twilio test - fetch account
async function testTwilio(data: any) {
  try {
    const auth = Buffer.from(`${data.accountSid}:${data.authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${data.accountSid}.json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Twilio credentials are valid' };
    } else {
      return { success: false, message: 'Invalid Twilio credentials' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Twilio API' };
  }
}

// SendGrid test - validate API key
async function testSendGrid(data: any) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      headers: {
        'Authorization': `Bearer ${data.apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'SendGrid credentials are valid' };
    } else {
      return { success: false, message: 'Invalid SendGrid API key' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to SendGrid API' };
  }
}

// GitHub test - get authenticated user
async function testGitHub(data: any) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const user = await response.json();
      return { success: true, message: `GitHub credentials are valid (User: ${user.login})` };
    } else {
      return { success: false, message: 'Invalid GitHub access token' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to GitHub API' };
  }
}

// Telegram test - getMe endpoint
async function testTelegram(data: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`);
    const result = await response.json();

    if (result.ok) {
      return { success: true, message: `Telegram credentials are valid (Bot: ${result.result.username})` };
    } else {
      return { success: false, message: result.description || 'Invalid Telegram bot token' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Telegram API' };
  }
}
