// render-puppeteer.js
const { execSync } = require('child_process');

// This script runs during the build process on Render to install the browser
try {
  console.log('Installing browser for Puppeteer...');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  console.log('Browser installation complete.');
} catch (error) {
  console.error('Error installing browser for Puppeteer:', error);
  process.exit(1);
}