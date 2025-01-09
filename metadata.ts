
type FrameEmbed = {
  version: 'next';
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: 'launch_frame';
      name: string;
      url: string;
      splashImageUrl: string;
      splashBackgroundColor: string;
    };
  };
};

async function writeMetadata(data: FrameEmbed) {
  try {
    const jsonString = JSON.stringify(data)
      .replace(/"/g, "&quot;");
    console.log(jsonString)
  } catch (error) {
    console.error('Error writing metadata:', error);
  }
}

const frameData: FrameEmbed = {
  version: 'next',
  imageUrl: 'https://iss.orbiter.website/og.png',
  button: {
    title: 'Launch',
    action: {
      type: 'launch_frame',
      name: 'Launch',
      url: 'https://iss.orbiter.website',
      splashImageUrl: 'https://orbiter.host/icon.png',
      splashBackgroundColor: '#ffffff'
    }
  }
};

writeMetadata(frameData)
