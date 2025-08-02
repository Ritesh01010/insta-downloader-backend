// server.js - Final version that prioritizes finding the direct MP4 link
const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
    res.send('Instagram Downloader Backend (Sparticuz Chromium) is running!');
});

app.get('/api/download', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.includes('instagram.com')) {
        return res.status(400).json({ success: false, error: 'A valid Instagram URL is required.' });
    }

    console.log(`Processing URL with @sparticuz/chromium: ${url}`);
    
    let browser = null;
    try {
        // Launch the browser
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // Set a realistic user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        page.setDefaultNavigationTimeout(60000); // 60-second timeout
        
        // Go to the Instagram URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // --- NEW LOGIC: Prioritize finding the direct MP4 link ---
        const videoData = await page.evaluate(() => {
            // Priority 1: Look for the direct video URL in the JSON data
            try {
                const scriptTag = document.querySelector('script[type="application/json"]');
                const jsonData = JSON.parse(scriptTag.textContent);
                const videoUrl = jsonData.entry_data.PostPage[0].graphql.shortcode_media.video_url;
                if (videoUrl) {
                    return {
                        video_url: videoUrl,
                        thumbnail_url: jsonData.entry_data.PostPage[0].graphql.shortcode_media.display_url
                    };
                }
            } catch (e) {
                // JSON parsing failed, proceed to fallback
            }

            // Priority 2 (Fallback): Get the src from the <video> tag (might be a blob)
            const videoElement = document.querySelector('video');
            const thumbnailElement = document.querySelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');
            
            return {
                video_url: videoElement ? videoElement.src : null,
                thumbnail_url: thumbnailElement ? thumbnailElement.src : null
            };
        });

        if (videoData && videoData.video_url) {
            console.log('Successfully found a video source.');
            // Check if the URL is a blob, which is not ideal but better than nothing
            if (videoData.video_url.startsWith('blob:')) {
                console.warn('Warning: Found a blob URL. Direct download may not work on all browsers.');
            }
            return res.json({
                success: true,
                video_url: videoData.video_url,
                thumbnail_url: videoData.thumbnail_url || ''
            });
        } else {
            console.error("Could not find any video source on the page.");
            return res.status(500).json({ success: false, error: "Could not find video URL. The post might be private, or it might not be a video." });
        }

    } catch (error) {
        console.error('Error during Puppeteer process:', error.message);
        return res.status(500).json({ success: false, error: "An error occurred while processing the page. The URL might be invalid." });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});