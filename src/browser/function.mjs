export async function ForceCaptcha(page) {
  while (true) {
    try {
      await page.waitForSelector('input[name="radio-group-2"]', {
        timeout: 4000,
      });
      await click({
        component: page,
        selector: 'input[name="radio-group-2"]',
      });
      break;
    } catch (e) {
      try {
        await page.waitForSelector("div#challenge-stage", { timeout: 4000 });
        console.log("======= Captha Detected =======");
        const frameHandle = await page.waitForSelector("iframe");
        const frame = await frameHandle.contentFrame();

        await click({
          component: frame,
          selector: 'input[type="checkbox"]',
        });
      } catch (e) {}
    }
  }
}

export async function input(page, selector, key, delay = 0) {
  await page.waitForSelector(selector);
  await page.type(selector, key, { delay: delay });
}