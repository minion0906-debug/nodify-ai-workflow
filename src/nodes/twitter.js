export default `
try {
  helpers.log('Starting Twitter/X node execution');

  const bearerToken = node.properties.credential.value;
  const operation = node.properties.operation.value;

  helpers.log('Operation:', operation);

  if (!bearerToken) {
    helpers.error('Bearer token is missing');
    throw new Error('Twitter API bearer token is required');
  }

  let endpoint = '';
  let method = 'GET';
  let body = null;

  if (operation === 'tweet') {
    const tweetText = node.properties.tweetText.value;
    endpoint = 'https://api.twitter.com/2/tweets';
    method = 'POST';
    body = {
      text: tweetText
    };
    helpers.log('Posting tweet:', tweetText.substring(0, 50) + '...');

  } else if (operation === 'retweet') {
    const tweetId = node.properties.tweetId.value;
    if (!tweetId) {
      helpers.error('Tweet ID is missing');
      throw new Error('Tweet ID is required for retweet operation');
    }
    endpoint = 'https://api.twitter.com/2/users/me/retweets';
    method = 'POST';
    body = {
      tweet_id: tweetId
    };
    helpers.log('Retweeting tweet ID:', tweetId);

  } else if (operation === 'like') {
    const tweetId = node.properties.tweetId.value;
    if (!tweetId) {
      helpers.error('Tweet ID is missing');
      throw new Error('Tweet ID is required for like operation');
    }
    endpoint = 'https://api.twitter.com/2/users/me/likes';
    method = 'POST';
    body = {
      tweet_id: tweetId
    };
    helpers.log('Liking tweet ID:', tweetId);

  } else if (operation === 'reply') {
    const tweetId = node.properties.tweetId.value;
    const tweetText = node.properties.tweetText.value;
    if (!tweetId) {
      helpers.error('Tweet ID is missing');
      throw new Error('Tweet ID is required for reply operation');
    }
    endpoint = 'https://api.twitter.com/2/tweets';
    method = 'POST';
    body = {
      text: tweetText,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    };
    helpers.log('Replying to tweet ID:', tweetId);
    helpers.log('Reply text:', tweetText.substring(0, 50) + '...');

  } else if (operation === 'search') {
    const searchQuery = node.properties.searchQuery.value;
    const maxResults = node.properties.maxResults.value || 10;
    if (!searchQuery) {
      helpers.error('Search query is missing');
      throw new Error('Search query is required for search operation');
    }
    const query = encodeURIComponent(searchQuery);
    endpoint = \`https://api.twitter.com/2/tweets/search/recent?query=\${query}&max_results=\${maxResults}\`;
    helpers.log('Searching tweets with query:', searchQuery);
    helpers.log('Max results:', maxResults);

  } else if (operation === 'getUserTweets') {
    const userId = node.properties.userId.value;
    const maxResults = node.properties.maxResults.value || 10;
    if (!userId) {
      helpers.error('User ID is missing');
      throw new Error('User ID is required for getUserTweets operation');
    }
    endpoint = \`https://api.twitter.com/2/users/\${userId}/tweets?max_results=\${maxResults}\`;
    helpers.log('Getting tweets for user ID:', userId);
    helpers.log('Max results:', maxResults);
  }

  helpers.log('Making request to Twitter API');
  helpers.log('Method:', method);
  helpers.log('Endpoint:', endpoint);

  const options = {
    method: method,
    headers: {
      'Authorization': \`Bearer \${bearerToken}\`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);
  const result = await response.json();

  if (!response.ok) {
    helpers.error('Twitter API error:', result.detail || result.title || result);
    throw new Error(\`Twitter API error: \${result.detail || result.title || 'Unknown error'}\`);
  }

  helpers.log('Twitter operation completed successfully');

  return {
    ...data,
    twitter: result
  };

} catch (error) {
  helpers.error('Twitter node execution failed:', error.message);
  throw error;
}
`;
