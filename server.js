// This is your final server.js file.
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // We will use axios to fetch the HTML

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port in production

// In production, you should restrict this to your frontend's domain
app.use(cors()); 

app.get('/', (req, res) => {
    res.send('Instagram Downloader Backend is running!');
});

app.get('/api/download', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.includes('instagram.com')) {
        return res.status(400).json({ success: false, error: 'A valid Instagram URL is required.' });
    }

    console.log(`Processing URL: ${url}`);

    try {
        // Step 1: Fetch the HTML of the Instagram page with a browser-like User-Agent
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
            }
        });
        const html = response.data;

        // --- NEW, MORE ROBUST SCRAPING LOGIC ---

        // Step 2: Find the <script> tag containing the page data.
        // Instagram embeds a lot of data in a JSON object inside a script tag.
        const scriptRegex = /<script type="application\/json" data-sentry-source-id="[^"]+">(.+?)<\/script>/;
        const scriptMatch = html.match(scriptRegex);

        if (!scriptMatch || !scriptMatch[1]) {
            console.error("Could not find the JSON data script tag. Instagram's structure may have changed.");
            return res.status(500).json({ success: false, error: "Could not find video URL. The post might be private, or Instagram's structure may have changed." });
        }
        
        // Step 3: Parse the JSON data from the script tag.
        const jsonData = JSON.parse(scriptMatch[1]);

        // Step 4: Navigate through the complex JSON object to find the video URL.
        // The exact path to the video can change, so we check a few common locations.
        const postData = jsonData.entry_data.PostPage[0].graphql.shortcode_media;

        let videoUrl = null;
        let thumbnailUrl = null;

        if (postData.video_url) {
            videoUrl = postData.video_url;
            thumbnailUrl = postData.display_url;
        }
        // This part below is a fallback for posts that might have multiple videos/images (carousels)
        else if (postData.edge_sidecar_to_children) {
            const firstItem = postData.edge_sidecar_to_children.edges[0].node;
            if (firstItem.is_video) {
                videoUrl = firstItem.video_url;
                thumbnailUrl = firstItem.display_url;
            }
        }
        
        if (videoUrl) {
            console.log('Successfully found video URL.');
            return res.json({
                success: true,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl
            });
        } else {
            console.error("Found the post data, but no video_url was present.");
            return res.status(500).json({ success: false, error: "This post does not appear to contain a video." });
        }

    } catch (error) {
        console.error('Error during scraping process:', error.message);
        return res.status(500).json({ success: false, error: "Could not find the video URL. The post might be private, or Instagram's structure may have changed." });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
