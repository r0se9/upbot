import fs from 'fs'
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
export function readFileAsync(a) {
  return new Promise((e, t) => {
    try {
      e(fs.readFileSync(a, "utf8"));
    } catch (e) {
      t(e);
    }
  });
}
export async function input(page, selector, key, delay = 0) {
  await page.waitForSelector(selector);
  await page.type(selector, key, { delay: delay });
}

export async function evaluate(e, t, a, n) {
  return n
    ? await e.evaluate(
        async (e, t, a) => {
          r = await fetch(e, {
            method: "POST",
            headers: t,
            credentials: "include",
            body: JSON.stringify(a),
          });
          return r.ok ? await r.json() : null;
        },
        t,
        a,
        n
      )
    : await e.evaluate(
        async (e, t) => {
          r = await fetch(e, { headers: t, credentials: "include" });
          return r.ok ? await r.json() : null;
        },
        t,
        a
      );
}
export async function evaluate_put(e, t, a, n) {
  return n
    ? await e.evaluate(
        async (e, t, a) => {
          r = await fetch(e, {
            method: "PUT",
            headers: t,
            credentials: "include",
            body: JSON.stringify(a),
          });
          return r.ok ? await r.json() : null;
        },
        t,
        a,
        n
      )
    : await e.evaluate(
        async (e, t) => {
          r = await fetch(e, { headers: t, credentials: "include" });
          return r.ok ? await r.json() : null;
        },
        t,
        a
      );
}