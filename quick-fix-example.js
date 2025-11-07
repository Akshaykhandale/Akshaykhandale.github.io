// Quick fix for your original code
// Replace your original code with this enhanced version

try {
  // Wait for the dialog to be visible with enhanced options
  await page.waitForSelector('[role="dialog"], .modal, dialog', { 
    timeout: 10000,
    visible: true  // This ensures the element is actually visible, not just in DOM
  });
  console.log('Dialog is visible');

  // Wait a moment for any animations to complete
  await page.waitForTimeout(500);

  // Wait for the button to be clickable (replace 'your-button-selector' with actual selector)
  const buttonSelector = 'your-button-selector'; // Update this with your actual button selector
  
  // Ensure button exists and is visible
  await page.waitForSelector(buttonSelector, { 
    timeout: 5000,
    visible: true 
  });

  // Ensure button is actually clickable (not disabled or covered)
  await page.waitForFunction((selector) => {
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
  }, buttonSelector, { timeout: 5000 });

  // Scroll button into view
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

  // Click the button with retry mechanism
  let clicked = false;
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i === 0) {
        // Try normal click first
        await page.click(buttonSelector);
      } else if (i === 1) {
        // Try force click if normal click fails
        await page.click(buttonSelector, { force: true });
      } else {
        // Use JavaScript click as last resort
        await page.evaluate((selector) => {
          document.querySelector(selector)?.click();
        }, buttonSelector);
      }
      
      clicked = true;
      console.log('Button clicked successfully');
      break;
    } catch (error) {
      console.log(`Click attempt ${i + 1} failed:`, error.message);
      if (i < maxRetries - 1) {
        await page.waitForTimeout(1000); // Wait before retry
      }
    }
  }

  if (!clicked) {
    throw new Error('Failed to click button after all retry attempts');
  }

} catch (error) {
  console.error('Dialog interaction failed:', error.message);
  
  // Debug information
  const dialogExists = await page.$('[role="dialog"], .modal, dialog') !== null;
  const buttonExists = await page.$(buttonSelector) !== null;
  
  console.log('Debug info:', {
    dialogExists,
    buttonExists,
    currentUrl: page.url()
  });
  
  // Take screenshot for debugging
  try {
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('Debug screenshot saved');
  } catch (screenshotError) {
    console.log('Could not capture screenshot');
  }
  
  throw error;
}
