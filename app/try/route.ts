import m from "moment";
import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Browser, Page } from "puppeteer-core";

const isDev = process.env.NODE_ENV === "development";
const localExecutablePath = process.platform === "win32" ?
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" :
  process.platform === "linux" ?
    "/usr/bin/google-chrome" :
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const remoteExecutablePath =
  "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const urlStr = url.searchParams.get("url");
  if (!urlStr) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      ignoreDefaultArgs: ["--enable-automation"],
      args: isDev
        ? [
          "--disable-blink-features=AutomationControlled",
          "--disable-features=site-per-process",
          "-disable-site-isolation-trials",
        ]
        : [...chromium.args, "--disable-blink-features=AutomationControlled"],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: isDev
        ? localExecutablePath
        : await chromium.executablePath(remoteExecutablePath),
      headless: isDev ? false : true,
      debuggingPort: isDev ? 9222 : undefined,
    });

    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('load page');
    await page.goto(urlStr, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("page title", await page.title());
    return NextResponse.json({ data: await getData(page) }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await browser?.close();
  }
}

async function getData(page: Page) {
  await page.setViewport({ width: 1920, height: 1080 })

  console.log('click show description');
  await page.locator('#description.ytd-watch-metadata').click();

  console.log('click show transcript');
  await page.locator('button[aria-label="Show transcript"]').click();

  console.log('intercept transcript response');
  const resJson = await new Promise(resolve => {
    page.on('response', async response => {
      if (!response.url().includes('/get_transcript')) return;
      resolve(await response.json());
    })
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  console.log('parse transcript response');
  const result = (resJson as any).actions[0]
    .updateEngagementPanelAction.content
    .transcriptRenderer.content
    .transcriptSearchPanelRenderer.body
    .transcriptSegmentListRenderer.initialSegments
    .map((x: any) => x.transcriptSegmentRenderer)
    .map((x: any) => {
      try {
        return ({
          start: m.utc(m.duration(x.startMs).asMilliseconds()).format("mm:ss"),
          end: m.utc(m.duration(x.endMs).asMilliseconds()).format("mm:ss"),
          text: x.snippet.runs[0].text.replace(/\n/g, ' ')
        })
      } catch {
        return null;
      }
    })
    .filter((x: any) => Boolean(x))
    .map((x: any) => `[${x.start}-${x.end}] ${x.text}`)
    .join('\n');
  if (!result) throw new Error('result falsy');
  /* eslint-enable @typescript-eslint/no-explicit-any */

  console.log('result received');
  return result;
}
