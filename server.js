// server.js - Final version with resilient MP4 link finding
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

        // --- NEW, MOST RESILIENT LOGIC ---
        const videoData = await page.evaluate(() => {
            let videoUrl = null;
            let thumbnailUrl = null;

            // Priority 1: Search all script tags for JSON containing video_url
            try {
                const scripts = document.querySelectorAll('script[type="application/json"]');
                for (const script of scripts) {
                    const jsonData = JSON.parse(script.textContent);
                    // This is a more robust way to find the video URL without a fixed path
                    const jsonString = JSON.stringify(jsonData);
                    const videoUrlMatch = jsonString.match(/"video_url":"([^"]+)"/);
                    if (videoUrlMatch && videoUrlMatch[1]) {
                        videoUrl = JSON.parse(`"${videoUrlMatch[1]}"`); // Unescape URL
                        
                        // Try to find a corresponding display URL for the thumbnail
                        const thumbnailUrlMatch = jsonString.match(/"display_url":"([^"]+)"/);
                        if (thumbnailUrlMatch && thumbnailUrlMatch[1]) {
                           thumbnailUrl = JSON.parse(`"${thumbnailUrlMatch[1]}"`);
                        }
                        break; // Stop searching once we find a video
                    }
                }
            } catch (e) {
                console.error('Error parsing JSON from script tags:', e.message);
            }

            // Priority 2 (Fallback): If no direct URL was found, get the src from the <video> tag
            if (!videoUrl) {
                console.warn('Could not find direct MP4 link, falling back to video tag src.');
                const videoElement = document.querySelector('video');
                const thumbnailElement = document.querySelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');
                videoUrl = videoElement ? videoElement.src : null;
                thumbnailUrl = thumbnailElement ? thumbnailElement.src : null;
            }
            
            return { video_url: videoUrl, thumbnail_url: thumbnailUrl };
        });

        if (videoData && videoData.video_url) {
            console.log(`Successfully found video source: ${videoData.video_url.substring(0, 50)}...`);
            if (videoData.video_url.startsWith('blob:')) {
                console.error('Critical Warning: Fallback resulted in a blob URL. The direct link finder failed.');
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
