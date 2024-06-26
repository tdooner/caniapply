import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { ReactNode } from "react";
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fromEnv } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient({ log: [{ emit: 'stdout', level: 'query' }] });
const s3 = new S3Client({ region: "us-west-2", credentials: fromEnv() })
const TWENTY_FOUR_HOURS_IN_MS = 1000*60*60*24; 
const DATABASE_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS";
const statusCodeToText = (status : number) : UptimeStatusText => {
  if (status < 300) {
    return "up"
  } else if (status < 900) {
    return "down"
  } else {
    return "exception"
  }
}
const statusTextToColor = (statusText : UptimeStatusText) : string => {
  if (statusText === "down") {
    return "#f00"
  } else if (statusText === "up") {
    return "#0f0"
  } else {
    return "#ff0"
  }
}

type UptimeStatusText = "down" | "up" | "exception"
type UptimeInterval = {
  status: UptimeStatusText,
  beginTime: string,
  endTime: string | null,
  http_status: number,
}
type LastDayUptime = {
  [key: number]: {
    intervals: UptimeInterval[],
  }
}
const getLastDayUptimeByHour = async function(systemIds: number[]) : Promise<LastDayUptime> {
  const uptimeBySystem : LastDayUptime = {};
  const twentyFourHoursAgo = moment(new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MS)).format(DATABASE_DATE_FORMAT);
  const pings = await prisma.pings.findMany({
    where: {
      system_id: {
        in: systemIds
      },
      created_at: {
        gt: twentyFourHoursAgo
      }
    },
    orderBy: {
      created_at: "asc"
    }
  });
  systemIds.forEach(systemId => {
    const systemPings = pings.filter(ping => ping.system_id === systemId)
    const intervals = [] as UptimeInterval[];

    systemPings.forEach((ping) => {
      const lastInterval = intervals[intervals.length - 1]
      const lastStatus = lastInterval ? lastInterval.status : null
      const currentStatus = statusCodeToText(ping.http_status)

      if (lastInterval) {
        lastInterval.endTime = ping.created_at
      }
      if (lastStatus !== currentStatus) {
        intervals.push({
          beginTime: ping.created_at,
          endTime: null,
          status: currentStatus,
          http_status: ping.http_status,
        })
      }
    })

    // Assume that the system system is still in the status from after the last ping
    // TODO: Test this.
    if (intervals.length > 0) {
      intervals[intervals.length - 1].endTime = moment.utc(new Date()).format(DATABASE_DATE_FORMAT)
    }

    uptimeBySystem[systemId] = {
      intervals,
    };
  });

  return uptimeBySystem;
}

type SystemScreenshot = {
  created_at: Date
  success: boolean
  url: string
}
type LastDayScreenshots = {
  [key: number]: SystemScreenshot[]
}
const getLastDayScreenshots = async function(systemIds: number[]) : Promise<LastDayScreenshots> {
  const screenshotsBySystem = {} as LastDayScreenshots
  const screenshots = await prisma.screenshots.findMany({
    where: {
      system_id: {
        in: systemIds
      },
      created_at: {
        gt: moment().subtract(24, 'hours').toDate()
      }
    }
  })
  await Promise.all(screenshots.map(async screenshot => {
    screenshotsBySystem[screenshot.system_id] ||= []
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: screenshot.s3_path }), { expiresIn: 3600 })
    screenshotsBySystem[screenshot.system_id].push({
      created_at: screenshot.created_at,
      success: screenshot.success,
      url: url,
    })
  }))

  return screenshotsBySystem
}

const renderIntervals = function(intervals : UptimeInterval[], screenshots : SystemScreenshot[]) : ReactNode {
  if (intervals.length === 0) {
    return <div>No data</div>
  }

  const intervalsStartTime = intervals[0].beginTime
  const totalDuration = moment(intervals[intervals.length - 1].endTime).diff(intervalsStartTime)

  return (
    <div className="system__interval">
      {intervals.map(interval => {
        const intervalDuration = moment(interval.endTime).diff(interval.beginTime)
        const intervalDurationPercentage = 100 * intervalDuration / totalDuration
        const style = {
          backgroundColor: statusTextToColor(interval.status),
          display: "inline-block",
          width: `${intervalDurationPercentage}%`,
          height: `40px`,
        }

        return (
          <div key={interval.beginTime} style={style} title={`${interval.http_status}`}></div>
        )
      })}
      {screenshots.map(screenshot => {
        const offsetPercentage = 100 * moment(screenshot.created_at).diff(moment.utc(intervalsStartTime)) / totalDuration
        const style = {
          backgroundColor: screenshot.success ? "#00b92f" : "#bf0000",
          left: `${offsetPercentage}%`,
        }

        return (
          <a
            key={`screenshot-${screenshot.created_at}`}
            className={"system__screenshot"}
            style={style}
            href={screenshot.url}
            target="_blank"
          >
          </a>
        )
      })}
    </div>
  )
}

export default async function Home() {
  const systems = await prisma.systems.findMany()
  const uptimeBySystem = await getLastDayUptimeByHour(systems.map(system => system.id))
  const screenshotsBySystem = await getLastDayScreenshots(systems.map(system => system.id))

  return (
    <main>
      {systems.map(system => {
        const intervals = uptimeBySystem[system.id].intervals
        const screenshots = screenshotsBySystem[system.id] || []

        return <div key={system.id}>
          <div>{system.jurisdiction} {system.name}</div>
          <div>{renderIntervals(intervals, screenshots)}</div>
        </div>
      })}
    </main>
  );
}

// TODO: Get prerendering working again by conditionally accessing the database.
export const dynamic = 'force-dynamic'
