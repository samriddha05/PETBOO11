const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Load environment variables if .env exists at root
require('dotenv').config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function createDriver() {
  const options = new chrome.Options();
  
  // Check if we want to run in headless mode
  if (process.env.HEADLESS === 'true') {
    options.addArguments('--headless=new');
  }
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1280,800');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Set implicit wait timeout to 10 seconds
  await driver.manage().setTimeouts({ implicit: 10000 });

  return driver;
}

module.exports = {
  createDriver,
  BASE_URL,
};
