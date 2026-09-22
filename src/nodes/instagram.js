export default `
try {
  helpers.log('Starting Instagram node execution');

  const accessToken = node.properties.credential.value;
  const accountId = node.properties.accountId.value;
  const operation = node.properties.operation.value;

  helpers.log('Operation:', operation);
  helpers.log('Account ID:', accountId);

  if (!accessToken) {
    helpers.error('Access token is missing');
    throw new Error('Instagram Graph API access token is required');
  }

  if (!accountId) {
    helpers.error('Account ID is missing');
    throw new Error('Instagram Business Account ID is required');
  }

  let endpoint = '';
  let method = 'POST';
  let body = null;

  if (operation === 'createPost') {
    const mediaType = node.properties.mediaType.value;
    const caption = node.properties.caption.value;
    const location = node.properties.location.value;

    helpers.log('Creating post - Media type:', mediaType);

    // Step 1: Create media container
    let containerEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media\`;
    let containerBody = {
      caption: caption || ''
    };

    if (mediaType === 'IMAGE') {
      const imageUrl = node.properties.imageUrl.value;
      if (!imageUrl) {
        helpers.error('Image URL is missing');
        throw new Error('Image URL is required for image posts');
      }
      containerBody.image_url = imageUrl;
      helpers.log('Image URL:', imageUrl);
    } else if (mediaType === 'VIDEO') {
      const videoUrl = node.properties.videoUrl.value;
      if (!videoUrl) {
        helpers.error('Video URL is missing');
        throw new Error('Video URL is required for video posts');
      }
      containerBody.video_url = videoUrl;
      containerBody.media_type = 'VIDEO';
      helpers.log('Video URL:', videoUrl);
    }

    if (location) {
      containerBody.location_id = location;
    }

    helpers.log('Creating media container');
    const containerResponse = await fetch(\`\${containerEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody)
    });

    const containerResult = await containerResponse.json();

    if (!containerResponse.ok) {
      helpers.error('Instagram API error creating container:', containerResult.error?.message || containerResult);
      throw new Error(\`Instagram API error: \${containerResult.error?.message || 'Unknown error'}\`);
    }

    const creationId = containerResult.id;
    helpers.log('Container created with ID:', creationId);

    // Step 2: Publish media container
    helpers.log('Publishing media container');
    const publishEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media_publish\`;
    const publishResponse = await fetch(\`\${publishEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId })
    });

    const publishResult = await publishResponse.json();

    if (!publishResponse.ok) {
      helpers.error('Instagram API error publishing:', publishResult.error?.message || publishResult);
      throw new Error(\`Instagram API error: \${publishResult.error?.message || 'Unknown error'}\`);
    }

    helpers.log('Post published successfully. Media ID:', publishResult.id);

    return {
      ...data,
      instagram: publishResult
    };

  } else if (operation === 'createStory') {
    const imageUrl = node.properties.imageUrl.value;
    if (!imageUrl) {
      helpers.error('Image URL is missing');
      throw new Error('Image URL is required for stories');
    }

    helpers.log('Creating story with image:', imageUrl);

    const storyEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media\`;
    const storyResponse = await fetch(\`\${storyEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES'
      })
    });

    const storyContainer = await storyResponse.json();

    if (!storyResponse.ok) {
      helpers.error('Instagram API error creating story container:', storyContainer.error?.message || storyContainer);
      throw new Error(\`Instagram API error: \${storyContainer.error?.message || 'Unknown error'}\`);
    }

    // Publish story
    const publishEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media_publish\`;
    const publishResponse = await fetch(\`\${publishEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: storyContainer.id })
    });

    const publishResult = await publishResponse.json();

    if (!publishResponse.ok) {
      helpers.error('Instagram API error publishing story:', publishResult.error?.message || publishResult);
      throw new Error(\`Instagram API error: \${publishResult.error?.message || 'Unknown error'}\`);
    }

    helpers.log('Story published successfully. Media ID:', publishResult.id);

    return {
      ...data,
      instagram: publishResult
    };

  } else if (operation === 'createReel') {
    const videoUrl = node.properties.videoUrl.value;
    const caption = node.properties.caption.value;

    if (!videoUrl) {
      helpers.error('Video URL is missing');
      throw new Error('Video URL is required for reels');
    }

    helpers.log('Creating reel with video:', videoUrl);

    const reelEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media\`;
    const reelResponse = await fetch(\`\${reelEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        media_type: 'REELS',
        caption: caption || ''
      })
    });

    const reelContainer = await reelResponse.json();

    if (!reelResponse.ok) {
      helpers.error('Instagram API error creating reel container:', reelContainer.error?.message || reelContainer);
      throw new Error(\`Instagram API error: \${reelContainer.error?.message || 'Unknown error'}\`);
    }

    // Publish reel
    const publishEndpoint = \`https://graph.facebook.com/v18.0/\${accountId}/media_publish\`;
    const publishResponse = await fetch(\`\${publishEndpoint}?access_token=\${accessToken}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: reelContainer.id })
    });

    const publishResult = await publishResponse.json();

    if (!publishResponse.ok) {
      helpers.error('Instagram API error publishing reel:', publishResult.error?.message || publishResult);
      throw new Error(\`Instagram API error: \${publishResult.error?.message || 'Unknown error'}\`);
    }

    helpers.log('Reel published successfully. Media ID:', publishResult.id);

    return {
      ...data,
      instagram: publishResult
    };

  } else if (operation === 'getMediaInsights') {
    const mediaId = node.properties.mediaId.value;
    const metrics = node.properties.metrics.value || 'engagement,impressions,reach';

    if (!mediaId) {
      helpers.error('Media ID is missing');
      throw new Error('Media ID is required for insights');
    }

    helpers.log('Getting insights for media ID:', mediaId);
    helpers.log('Metrics:', metrics);

    endpoint = \`https://graph.facebook.com/v18.0/\${mediaId}/insights?metric=\${metrics}&access_token=\${accessToken}\`;
    method = 'GET';

    const response = await fetch(endpoint);
    const result = await response.json();

    if (!response.ok) {
      helpers.error('Instagram API error getting insights:', result.error?.message || result);
      throw new Error(\`Instagram API error: \${result.error?.message || 'Unknown error'}\`);
    }

    helpers.log('Insights retrieved successfully');

    return {
      ...data,
      instagram: result
    };

  } else if (operation === 'getAccountInsights') {
    const metrics = node.properties.metrics.value || 'impressions,reach,profile_views';

    helpers.log('Getting account insights');
    helpers.log('Metrics:', metrics);

    endpoint = \`https://graph.facebook.com/v18.0/\${accountId}/insights?metric=\${metrics}&period=day&access_token=\${accessToken}\`;
    method = 'GET';

    const response = await fetch(endpoint);
    const result = await response.json();

    if (!response.ok) {
      helpers.error('Instagram API error getting account insights:', result.error?.message || result);
      throw new Error(\`Instagram API error: \${result.error?.message || 'Unknown error'}\`);
    }

    helpers.log('Account insights retrieved successfully');

    return {
      ...data,
      instagram: result
    };
  }

} catch (error) {
  helpers.error('Instagram node execution failed:', error.message);
  throw error;
}
`;
