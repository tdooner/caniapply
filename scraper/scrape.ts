import os from 'os'
import { PrismaClient } from '@prisma/client'
import format from 'date-format'
import genericPool from 'generic-pool'
import { Builder, Browser, WebDriver, logging } from 'selenium-webdriver'
import * as chrome from 'selenium-webdriver/chrome'

const DATABASE_DATE_FORMAT = "yyyy-MM-dd hh:mm:ss.SSS";
const ONE_MEGABYTE = 1024 * 1024
const BROWSER_MEM_USAGE_BYTES = 512 * ONE_MEGABYTE
const FREE_MEMORY_BYTES = os.freemem()
const NUM_BROWSERS = process.env.NUM_BROWSERS ?
  Number.parseInt(process.env.NUM_BROWSERS) :
  Math.min(8, Math.ceil(FREE_MEMORY_BYTES / BROWSER_MEM_USAGE_BYTES))

const initializeBrowser = async function(): Promise<WebDriver> {
  console.log("Starting browser...")
  const driverOptions = new chrome.Options()
  driverOptions.addArguments("--headless")
  driverOptions.addArguments("--no-sandbox")
  driverOptions.addArguments("--disable-gpu")
  driverOptions.addArguments("--disable-dev-shm-usage")

  const logPrefs = new logging.Preferences()
  logPrefs.setLevel(logging.Type.PERFORMANCE, logging.Level.ALL)
  driverOptions.setLoggingPrefs(logPrefs)

  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(driverOptions)
    .build()

  // Some sites are located behind WAF's that block traffic from Headless Chrome - how rude :(.
  // So, we need to spoof the user agent. This option seems to work better than passing
  // --user-agent on the command-line, as it will clear out the client hints headers.
  await (driver as any).sendDevToolsCommand("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  })

  return driver
}

type PageLoadResult = {
  loadTimeSeconds: number | undefined,
  httpStatus: number | undefined
}
const extractLoadResult = function(entries : logging.Entry[]) : PageLoadResult {
  let loadTimeSeconds, httpStatus
  const parsedEntries = entries.map(entry => JSON.parse(entry.message))
  const startedLoadingEvent = parsedEntries.find(entry => entry["message"]["method"] === "Network.requestWillBeSent")
  const finishedLoadingEvent = parsedEntries.find(entry => entry["message"]["method"] === "Page.loadEventFired")
  const responseEvent = parsedEntries.filter(entry => entry["message"]["params"]["requestId"] === startedLoadingEvent["message"]["params"]["requestId"] &&
                                               entry["message"]["method"] === "Network.responseReceived")
  
  if (responseEvent.length > 1) {
    console.warn("More than one responseEvent!", responseEvent)
  } else {
    httpStatus = responseEvent[0]["message"]["params"]["response"]["status"]
  }

  if (startedLoadingEvent && finishedLoadingEvent) {
     loadTimeSeconds = finishedLoadingEvent["message"]["params"]["timestamp"] - startedLoadingEvent["message"]["params"]["timestamp"]
  }

  return { httpStatus, loadTimeSeconds }
}

export const scrape = async function(driver: WebDriver, url: string | null) {
  if (!url) {
    return
  }

  console.log("Navigating to", url)
  await driver.get(url)
  return await driver.getPageSource()
}

export const scrapeAll = async function() {
  const prisma = new PrismaClient()
  const systems = await prisma.systems.findMany()
  console.log("Starting up to ", NUM_BROWSERS, " browsers (NUM_BROWSERS=", process.env.NUM_BROWSERS, ", ", Math.round(FREE_MEMORY_BYTES / ONE_MEGABYTE), "MB free)")
  const pool = genericPool.createPool({
    create: initializeBrowser,
    destroy: browser => browser.close(),
  }, { max: NUM_BROWSERS, min: 1 })
  pool.on("factoryCreateError", (ex) => console.error("Error starting browser:", ex))

  await Promise.all(systems.map(async system => {
    const driver = await pool.acquire()

    try {
      const response = await scrape(driver, system.uri)
      if (response) {
        const performanceLogs = await driver.manage().logs().get(logging.Type.PERFORMANCE)
        const loadResult = extractLoadResult(performanceLogs)

        console.error("Response Length: ", response.length, "Load result: ", loadResult)

        await prisma.pings.create({
          data: {
            system_id: system.id,
            latency: loadResult.loadTimeSeconds,
            http_status: loadResult.httpStatus || 0,
            body_length: response.length,
            created_at: format(DATABASE_DATE_FORMAT, new Date())
          }
        })
      }
      pool.release(driver)
    } catch (ex) {
      console.error("Got exception: ", ex)
      pool.destroy(driver)
      await prisma.pings.create({
        data: {
          system_id: system.id,
          latency: 0,
          http_status: 999,
          body_length: 0,
          created_at: format(DATABASE_DATE_FORMAT, new Date())
        }
      })
    }
  }))
}

scrapeAll()
