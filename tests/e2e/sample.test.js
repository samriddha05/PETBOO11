const assert = require('assert');
const { createDriver, BASE_URL } = require('./setup');

describe('PetSphere Landing Page', function () {
  // Set a generous timeout for E2E browser startup and navigation
  this.timeout(30000);
  let driver;

  before(async function () {
    driver = await createDriver();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should load the page and verify the title', async function () {
    await driver.get(BASE_URL);
    const title = await driver.getTitle();
    assert.strictEqual(title, 'PetSphere — Pet Health OS');
  });

  it('should have the root mount element', async function () {
    await driver.get(BASE_URL);
    const rootElement = await driver.findElement({ id: 'root' });
    assert.ok(rootElement, 'Root element should exist');
  });
});
