// Enhanced dialog waiting and button clicking solution
// This addresses the issue where buttons are not visible for clicking

async function waitForDialogAndClick(page, buttonSelector, options = {}) {
  const {
    dialogTimeout = 10000,
    buttonTimeout = 5000,
    retryAttempts = 3,
    scrollIntoView = true
  } = options;

  try {
    // Step 1: Wait for dialog to be visible with multiple selectors
    console.log('Waiting for dialog to appear...');
    await page.waitForSelector('[role="dialog"], .modal, dialog, .dialog, .popup', { 
      timeout: dialogTimeout,
      visible: true // Ensure it's actually visible, not just in DOM
    });
    console.log('Dialog is visible');

    // Step 2: Wait a bit for any animations to complete
    await page.waitForTimeout(500);

    // Step 3: Wait for the specific button to be available
    console.log(`Waiting for button: ${buttonSelector}`);
    await page.waitForSelector(buttonSelector, { 
      timeout: buttonTimeout,
      visible: true
    });

    // Step 4: Ensure button is clickable (not disabled or covered)
    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return (
          element.offsetParent !== null && // Element is visible
          !element.disabled && // Not disabled
          style.visibility !== 'hidden' && // Not hidden
          style.display !== 'none' && // Not display none
          rect.width > 0 && rect.height > 0 && // Has dimensions
          style.pointerEvents !== 'none' // Can receive clicks
        );
      },
      buttonSelector,
      { timeout: buttonTimeout }
    );

    // Step 5: Scroll button into view if needed
    if (scrollIntoView) {
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center', 
            inline: 'center' 
          });
        }
      }, buttonSelector);
      
      // Wait for scroll to complete
      await page.waitForTimeout(300);
    }

    // Step 6: Try clicking with retry mechanism
    let clickSuccess = false;
    let lastError = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`Click attempt ${attempt}/${retryAttempts}`);
        
        // Try different click methods
        if (attempt === 1) {
          // Standard click
          await page.click(buttonSelector);
        } else if (attempt === 2) {
          // Force click (ignores actionability checks)
          await page.click(buttonSelector, { force: true });
        } else {
          // JavaScript click as last resort
          await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            if (element) {
              element.click();
            }
          }, buttonSelector);
        }
        
        clickSuccess = true;
        console.log('Button clicked successfully');
        break;
        
      } catch (error) {
        lastError = error;
        console.log(`Click attempt ${attempt} failed:`, error.message);
        
        if (attempt < retryAttempts) {
          await page.waitForTimeout(1000); // Wait before retry
        }
      }
    }

    if (!clickSuccess) {
      throw new Error(`Failed to click button after ${retryAttempts} attempts. Last error: ${lastError?.message}`);
    }

    return true;

  } catch (error) {
    console.error('Dialog interaction failed:', error.message);
    
    // Debug information
    const dialogExists = await page.$('[role="dialog"], .modal, dialog, .dialog, .popup') !== null;
    const buttonExists = await page.$(buttonSelector) !== null;
    
    console.log('Debug info:', {
      dialogExists,
      buttonExists,
      currentUrl: page.url()
    });
    
    throw error;
  }
}

// Alternative approach using more robust waiting strategies
async function waitForDialogAndClickAlternative(page, buttonSelector) {
  try {
    // Wait for any dialog-like element to appear
    const dialogSelectors = [
      '[role="dialog"]',
      '.modal',
      'dialog',
      '.dialog',
      '.popup',
      '.overlay',
      '[data-testid*="dialog"]',
      '[data-testid*="modal"]'
    ];

    console.log('Waiting for dialog with multiple strategies...');
    
    // Try each selector until one works
    let dialogFound = false;
    for (const selector of dialogSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000, visible: true });
        console.log(`Dialog found with selector: ${selector}`);
        dialogFound = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!dialogFound) {
      throw new Error('No dialog found with any of the expected selectors');
    }

    // Wait for dialog to be fully loaded (check for loading indicators)
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading, .spinner, [data-loading="true"]');
      return loadingElements.length === 0;
    }, { timeout: 5000 });

    // Enhanced button waiting and clicking
    console.log(`Looking for button: ${buttonSelector}`);
    
    // Wait for button to exist and be visible
    await page.waitForSelector(buttonSelector, { visible: true, timeout: 10000 });
    
    // Wait for button to be enabled and clickable
    await page.waitForFunction((selector) => {
      const btn = document.querySelector(selector);
      return btn && !btn.disabled && btn.offsetParent !== null;
    }, buttonSelector, { timeout: 5000 });

    // Ensure button is in viewport
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'center' });
      }
    }, buttonSelector);

    // Small delay for any scroll animations
    await page.waitForTimeout(500);

    // Click the button
    await page.click(buttonSelector);
    console.log('Button clicked successfully');

    return true;

  } catch (error) {
    console.error('Enhanced dialog interaction failed:', error);
    
    // Capture screenshot for debugging
    try {
      await page.screenshot({ path: 'dialog-error-debug.png', fullPage: true });
      console.log('Debug screenshot saved as dialog-error-debug.png');
    } catch (screenshotError) {
      console.log('Could not capture debug screenshot');
    }
    
    throw error;
  }
}

// Usage examples:
/*
// Basic usage
await waitForDialogAndClick(page, '#confirm-button');

// With custom options
await waitForDialogAndClick(page, '.submit-btn', {
  dialogTimeout: 15000,
  buttonTimeout: 8000,
  retryAttempts: 5,
  scrollIntoView: true
});

// Alternative approach
await waitForDialogAndClickAlternative(page, '[data-testid="save-button"]');
*/

module.exports = {
  waitForDialogAndClick,
  waitForDialogAndClickAlternative
};
