const assert = require('assert');
const { By, until } = require('selenium-webdriver');
const { createDriver, BASE_URL } = require('./setup');

describe('Authentication Flow E2E Tests', function () {
  this.timeout(40000); // Allow ample time for driver setup and interactions
  let driver;

  beforeEach(async function () {
    driver = await createDriver();
  });

  afterEach(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should sign in using Demo Mode and then sign out', async function () {
    // 1. Navigate to the login page (should redirect from base URL if unauthenticated)
    await driver.get(BASE_URL);

    // 2. Wait for the Login page card to load
    await driver.wait(until.elementLocated(By.className('login-card')), 10000);

    // 3. Click the 'Enter Demo Mode' button
    const demoButton = await driver.findElement(By.className('login-card__demo'));
    await demoButton.click();

    // 4. Verify we successfully navigate to the dashboard (wait for the sidebar or dashboard element)
    await driver.wait(until.elementLocated(By.className('topnav__profile')), 10000);
    
    // Check that we are on the dashboard
    const currentUrl = await driver.getCurrentUrl();
    assert.ok(currentUrl.endsWith('/') || currentUrl.includes('/dashboard') || currentUrl.includes(BASE_URL), 'Should be logged in');

    // 5. Open the profile dropdown
    const avatarButton = await driver.findElement(By.className('topnav__avatar'));
    await avatarButton.click();

    // 6. Wait for and click the Sign Out button
    const signOutButton = await driver.wait(
      until.elementLocated(By.className('topnav__dropdown-item logout')),
      5000
    );
    await signOutButton.click();

    // 7. Verify we are redirected back to the login page
    await driver.wait(until.elementLocated(By.className('login-card')), 10000);
    const postLogoutUrl = await driver.getCurrentUrl();
    assert.ok(postLogoutUrl.includes('/login'), 'Should redirect back to login page');
  });

  it('should register a new user, sign out, and then login and sign out again', async function () {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'QA Tester';

    await driver.get(`${BASE_URL}/login`);
    await driver.wait(until.elementLocated(By.className('login-card')), 10000);

    // 1. Toggle to Sign Up form
    const toggleButton = await driver.findElement(By.css('.login-card__footer .login-card__toggle'));
    await toggleButton.click();

    // Wait for the name field to appear
    await driver.wait(until.elementLocated(By.id('login-name')), 5000);

    // 2. Fill registration details
    await driver.findElement(By.id('login-name')).sendKeys(testName);
    await driver.findElement(By.id('login-email')).sendKeys(testEmail);
    await driver.findElement(By.id('login-password')).sendKeys(testPassword);

    // 3. Submit registration form
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();

    // 4. Wait for dashboard layout and verify successful register & login
    await driver.wait(until.elementLocated(By.className('topnav__profile')), 10000);

    // 5. Sign Out
    let avatarButton = await driver.findElement(By.className('topnav__avatar'));
    await avatarButton.click();
    let signOutButton = await driver.wait(
      until.elementLocated(By.className('topnav__dropdown-item logout')),
      5000
    );
    await signOutButton.click();

    // 6. Verify we are back on login page
    await driver.wait(until.elementLocated(By.className('login-card')), 10000);

    // 7. Log in with the newly created credentials
    await driver.findElement(By.id('login-email')).sendKeys(testEmail);
    await driver.findElement(By.id('login-password')).sendKeys(testPassword);
    
    const loginSubmitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await loginSubmitBtn.click();

    // 8. Wait for dashboard and log out again
    await driver.wait(until.elementLocated(By.className('topnav__profile')), 10000);
    avatarButton = await driver.findElement(By.className('topnav__avatar'));
    await avatarButton.click();
    signOutButton = await driver.wait(
      until.elementLocated(By.className('topnav__dropdown-item logout')),
      5000
    );
    await signOutButton.click();

    // 9. Final verification
    await driver.wait(until.elementLocated(By.className('login-card')), 10000);
  });
});
