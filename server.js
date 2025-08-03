// server.js - Final version with automated login
const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cors =require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
    res.send('Instagram Downloader Backend (Login-Enabled) is running!');
});

app.get('/api/download', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.includes('instagram.com')) {
        return res.status(400).json({ success: false, error: 'A valid Instagram URL is required.' });
    }

    // Check for login credentials in environment variables
    if (!process.env.INSTA_USER || !process.env.INSTA_PASS) {
        console.error('Instagram username or password not set in environment variables.');
        return res.status(500).json({ success: false, error: 'Server is not configured for login.' });
    }

    console.log(`Processing URL with login: ${url}`);
    
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        page.setDefaultNavigationTimeout(90000); // 90-second timeout for login and navigation

        // --- LOGIN LOGIC ---
        console.log('Navigating to login page...');
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
        
        // Wait for input fields to be visible
        await page.waitForSelector('input[name="username"]');
        await page.waitForSelector('input[name="password"]');

        console.log('Typing credentials...');
        await page.type('input[name="username"]', process.env.INSTA_USER, { delay: 50 });
        await page.type('input[name="password"]', process.env.INSTA_PASS, { delay: 50 });

        console.log('Submitting login form...');
        await page.click('button[type="submit"]');
        
        // Wait for navigation after login, which indicates success
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Login successful.');
        
        // --- SCRAPING LOGIC ---
        console.log('Navigating to target URL...');
        await page.goto(url, { waitUntil: 'networkidle2' });

        const videoData = await page.evaluate(() => {
            const videoElement = document.querySelector('video');
            const thumbnailElement = document.querySelector('img.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3');
            return {
                video_url: videoElement ? videoElement.src : null,
                thumbnail_url: thumbnailElement ? thumbnailElement.src : null
            };
        });

        if (videoData && videoData.video_url) {
            console.log('Successfully found video source after login.');
            return res.json({
                success: true,
                video_url: videoData.video_url,
                thumbnail_url: videoData.thumbnail_url || ''
            });
        } else {
            return res.status(500).json({ success: false, error: "Could not find video URL. The post might be private, or it might not be a video." });
        }

    } catch (error) {
        console.error('Error during Puppeteer login/scrape process:', error.message);
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