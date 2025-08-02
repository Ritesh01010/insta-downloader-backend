// server.js - Final version with anti-bot detection measures
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
        // Launch the browser using the pre-packaged chromium
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // --- Anti-Bot Detection Measures ---
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        // Set language to appear more human
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
        // Increase the timeout to 60 seconds (60000 milliseconds)
        page.setDefaultNavigationTimeout(60000);
        
        // Go to the Instagram URL
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Scrape the page for the video source
        const videoSrc = await page.evaluate(() => {
            const videoElement = document.querySelector('video');
            return videoElement ? videoElement.src : null;
        });

        const thumbnailSrc = await page.evaluate(() => {
            const imgElement = document.querySelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');
            return imgElement ? imgElement.src : null;
        });

        if (videoSrc) {
            console.log('Successfully found video URL.');
            return res.json({
                success: true,
                video_url: videoSrc,
                thumbnail_url: thumbnailSrc || ''
            });
        } else {
            console.error("Could not find a <video> element on the page.");
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