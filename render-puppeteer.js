// render-puppeteer.js - Final attempt with direct script execution
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Attempting to install browser for Puppeteer via direct script execution...');

  // Construct the path to the puppeteer CLI script within node_modules
  const puppeteerCliScript = path.join(
    __dirname,
    'node_modules',
    'puppeteer',
    'lib',
    'cjs',
    'puppeteer',
    'cli.js'
  );

  console.log(`Executing script at: ${puppeteerCliScript}`);

  // Execute the script directly with node, passing the necessary arguments
  execSync(`node ${puppeteerCliScript} browsers install chrome`, { stdio: 'inherit' });

  console.log('Browser installation script executed successfully.');

} catch (error) {
  console.error('Error during direct browser installation for Puppeteer:', error);
  process.exit(1);
}