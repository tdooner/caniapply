import { PrismaClient } from '@prisma/client'
import PQueue from 'p-queue'
import format from 'date-format';
import { Builder, Browser, WebDriver } from 'selenium-webdriver'
import * as firefox from 'selenium-webdriver/firefox'

const DATABASE_DATE_FORMAT = "yyyy-MM-dd hh:mm:ss.SSS";

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
  const queue = new PQueue({ concurrency: 1 })
  const driver = await initializeBrowser()

  systems.forEach(async system => {
    try {
      const response = await queue.add(() => scrape(driver, system.uri))
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
    }
  })
}

scrapeAll()
