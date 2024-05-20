import os from 'os'
import { PrismaClient } from '@prisma/client'
import format from 'date-format'
import genericPool from 'generic-pool'
import { Builder, Browser, WebDriver } from 'selenium-webdriver'
import * as firefox from 'selenium-webdriver/firefox'

const DATABASE_DATE_FORMAT = "yyyy-MM-dd hh:mm:ss.SSS";
const ONE_MEGABYTE = 1024 * 1024
const BROWSER_MEM_USAGE_BYTES = 512 * ONE_MEGABYTE
const FREE_MEMORY_BYTES = os.freemem()
const NUM_BROWSERS = process.env.NUM_BROWSERS ?
  Number.parseInt(process.env.NUM_BROWSERS) :
  Math.min(8, Math.ceil(FREE_MEMORY_BYTES / BROWSER_MEM_USAGE_BYTES))

const initializeBrowser = async function(): Promise<WebDriver> {
  console.log("Starting browser...")
  const driverOptions = new firefox.Options()
  driverOptions.addArguments("--headless")

  const driver = await new Builder()
    .forBrowser(Browser.FIREFOX)
    .setFirefoxOptions(driverOptions)
    .build()

  return driver
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
    destroy: browser => browser.close()
  }, { max: NUM_BROWSERS, min: 1 })
  pool.on("factoryCreateError", (ex) => console.error("Error starting browser:", ex))

  await Promise.all(systems.map(async system => {
    const driver = await pool.acquire()

    try {
      const response = await scrape(driver, system.uri)
      if (response) {
        console.error("Response Length: ", response.length)
        await prisma.pings.create({
          data: {
            system_id: system.id,
            latency: 0, // TODO: Get this back again
            http_status: 0, // TODO: Get this back again
            body_length: response.length,
            created_at: format(DATABASE_DATE_FORMAT, new Date())
          }
        })
      }
    } catch (ex) {
      console.error("Got exception: ", ex)
      await prisma.pings.create({
        data: {
          system_id: system.id,
          latency: 0, // TODO: Get this back again
          http_status: 500, // TODO: Get this back again
          body_length: 0,
          created_at: format(DATABASE_DATE_FORMAT, new Date())
        }
      })
    }

    pool.release(driver)
  }))
}

scrapeAll()
