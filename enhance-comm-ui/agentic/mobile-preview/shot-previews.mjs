import { pathToFileURL } from "node:url";
import { join } from "node:path";

const DIR = "C:/Projects/AdventureLand/userinterface/enhance-comm-ui/agentic/mobile-preview";

export default async function (page) {
  const shots = [
    ["nameplate-soft.html", "nameplate-soft"],
    ["phone-command-sheet.html", "phone-command-sheet"],
    ["phone-market-filters.html", "phone-market-filters"],
  ];
  const paths = [];
  for (const [html, name] of shots) {
    await page.goto(pathToFileURL(join(DIR, html)).href);
    await page.sleep(200);
    const file = await page.screenshot(name);
    paths.push(file);
  }
  return { paths };
}
