import { PrismaClient } from "@prisma/client";
import format from "date-format";
import { ReactNode } from "react";

const prisma = new PrismaClient();
const TWENTY_FOUR_HOURS_IN_MS = 1000*60*60*24; 
const DATABASE_DATE_FORMAT = "yyyy-MM-dd hh:mm:ss.SSS";

type UptimeInterval = {
  status: "down" | "up",
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
  const twentyFourHoursAgo = format(DATABASE_DATE_FORMAT, new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MS));
  const pings = await prisma.pings.findMany({
    where: {
      system_id: {
        in: systemIds
      },
      created_at: {
        gt: twentyFourHoursAgo
      }
    }
  });
  systemIds.forEach(systemId => {
    const systemPings = pings.filter(ping => ping.system_id === systemId).sort((p1, p2) => p1.created_at.localeCompare(p2.created_at));
    const intervals = [] as UptimeInterval[];

    systemPings.forEach((ping) => {
      const lastInterval = intervals[intervals.length - 1];
      const lastStatus = lastInterval ? lastInterval.status : null;
      const currentStatus = ping.http_status < 300 ? "up" : "down";

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

    uptimeBySystem[systemId] = {
      intervals,
    };
  });

  return uptimeBySystem;
}

const renderIntervals = function(intervals : UptimeInterval[]) : ReactNode {
  const totalDuration = format.parse(DATABASE_DATE_FORMAT, intervals[intervals.length - 1].endTime) -
    format.parse(DATABASE_DATE_FORMAT, intervals[0].beginTime);

  return (
    <div>
      {intervals.map(interval => {
        const intervalDuration = format.parse(DATABASE_DATE_FORMAT, interval.endTime) - format.parse(DATABASE_DATE_FORMAT, interval.beginTime);
        const intervalDurationPercentage = 100 * intervalDuration / totalDuration
        const style = {
          backgroundColor: interval.status === "down" ? "#f00" : "#0f0",
          display: "inline-block",
          width: `${intervalDurationPercentage}%`,
          height: `40px`,
        }

        return (
          <div key={interval.beginTime} style={style} title={interval.http_status}></div>
        )
      })}
    </div>
  )
}

export default async function Home() {
  const systems = await prisma.systems.findMany();
  const uptimeBySystem = await getLastDayUptimeByHour(systems.map(system => system.id));

  return (
    <main>
      {systems.map(system => {
        const intervals = uptimeBySystem[system.id].intervals;

        return <div key={system.id}>
          <div>{system.jurisdiction} {system.name}</div>
          <div>{renderIntervals(intervals)}</div>
        </div>
      })}
    </main>
  );
}
