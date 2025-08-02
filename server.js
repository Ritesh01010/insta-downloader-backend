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
        // Step 1: Fetch the HTML of the Instagram page
        // We add a specific user-agent to mimic a browser request
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = response.data;

        // Step 2: Find the video URL within the HTML
        // The video URL is often found inside a <script> tag containing JSON data.
        // This is a simplified regex; it might need adjustment if Instagram changes its structure.
        const videoUrlMatch = html.match(/"video_url":"([^"]+)"/);

        if (videoUrlMatch && videoUrlMatch[1]) {
            let videoUrl = JSON.parse(`"${videoUrlMatch[1]}"`); // Properly unescape the URL

            // Step 3: Find the thumbnail URL (optional but good for UI)
            const thumbnailUrlMatch = html.match(/"display_url":"([^"]+)"/);
            const thumbnailUrl = thumbnailUrlMatch ? JSON.parse(`"${thumbnailUrlMatch[1]}"`) : '';

            console.log('Successfully found video URL.');
            
            // Step 4: Send the data back to the frontend
            return res.json({
                success: true,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl
            });
        } else {
            console.error("Could not find video URL in the page's HTML.");
            return res.status(500).json({ success: false, error: 'Could not find the video URL. The post might be private, or Instagram\'s structure may have changed.' });
        }

    } catch (error) {
        console.error('Error fetching the Instagram page:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch the Instagram page. The URL might be incorrect or the post private.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
