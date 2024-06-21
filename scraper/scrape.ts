import os from 'os'
import { PrismaClient } from '@prisma/client'
import genericPool from 'generic-pool'
import moment from 'moment'
import { Builder, Browser, WebDriver, logging } from 'selenium-webdriver'
import * as chrome from 'selenium-webdriver/chrome'

const DATABASE_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS";
const ONE_MEGABYTE = 1024 * 1024
const BROWSER_MEM_USAGE_BYTES = 512 * ONE_MEGABYTE
const FREE_MEMORY_BYTES = os.freemem()
const NUM_BROWSERS = process.env.NUM_BROWSERS ?
  Number.parseInt(process.env.NUM_BROWSERS) :
  Math.min(8, Math.ceil(FREE_MEMORY_BYTES / BROWSER_MEM_USAGE_BYTES))
const HTTPStatus = {
  UNKNOWN: 0,
  TLS_CERT_COMMON_NAME_INVALID: 700,
  OTHER_ERROR: 990,
  EXCEPTION: 999,
}

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
type ParsedEntry = {
  message: {
    method: string
    params: {
      timestamp: number
      requestId: number | string
      errorText: string
      response: {
        status: number
      }
    }
  }
}
const diffTimestamps = function(entry1 : ParsedEntry | undefined, entry2 : ParsedEntry | undefined) : number | undefined{
  if (!entry1 || !entry2) {
    return
  }

  return entry2.message.params.timestamp - entry1.message.params.timestamp
}

const extractLoadResult = function(entries : logging.Entry[]) : PageLoadResult {
  let loadTimeSeconds, httpStatus
  const parsedEntries = entries.map(entry => JSON.parse(entry.message)) as ParsedEntry[]

  const startedLoadingEvent = parsedEntries.find(entry => entry.message.method === "Network.requestWillBeSent")
  const finishedLoadingEvent = parsedEntries.find(entry => entry.message.method === "Page.loadEventFired")
  const failedLoadingEvent = parsedEntries.find(entry => entry.message.method === "Network.loadingFailed" &&
                                                entry.message.params.requestId === startedLoadingEvent?.message.params.requestId)
  const responseEvent = parsedEntries.filter(entry => entry.message.method === "Network.responseReceived" &&
                                             entry.message.params.requestId === startedLoadingEvent?.message.params.requestId)

  if (failedLoadingEvent) {
    loadTimeSeconds = diffTimestamps(startedLoadingEvent, failedLoadingEvent)
    const errorText = failedLoadingEvent.message.params.errorText
    console.error("Failed to load: ", errorText)
    if (errorText === "net::ERR_CERT_COMMON_NAME_INVALID") {
      httpStatus = HTTPStatus.TLS_CERT_COMMON_NAME_INVALID
    } else {
      httpStatus = HTTPStatus.OTHER_ERROR
    }
  } else if (responseEvent.length > 1) {
    console.error("More than one responseEvent!", responseEvent)
  } else if (responseEvent.length === 0) {
    console.error("No responseEvent!")
  } else if (startedLoadingEvent && finishedLoadingEvent) {
    loadTimeSeconds = diffTimestamps(startedLoadingEvent, finishedLoadingEvent)
    httpStatus = responseEvent[0].message.params.response.status
  } else {
    console.error("No started & finished loading events!", startedLoadingEvent, finishedLoadingEvent)
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
            http_status: loadResult.httpStatus || HTTPStatus.UNKNOWN,
            body_length: response.length,
            created_at: moment(new Date()).format(DATABASE_DATE_FORMAT)
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
          http_status: HTTPStatus.EXCEPTION,
          body_length: 0,
          created_at: moment(new Date()).format(DATABASE_DATE_FORMAT)
        }
      })
    }
  }))
}

scrapeAll()
