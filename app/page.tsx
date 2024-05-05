import { PrismaClient } from "@prisma/client";
import format from "date-format";

const prisma = new PrismaClient();

type LastDayUptime = {
  [key: number]: {
    successfulCount: number,
    unsuccessfulCount: number
  }
}
const getLastDayUptimeByHour = async function(systemIds: number[]) : Promise<LastDayUptime> {
  const uptimeBySystem : LastDayUptime = {};
  const twentyFourHoursAgo = format("yyyy-MM-dd hh:mm:ss.SSS", new Date(new Date().getTime() - 1000*60*60*24));
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
    const systemPings = pings.filter(ping => ping.system_id === systemId);
    uptimeBySystem[systemId] = {
      successfulCount: systemPings.reduce((count, ping) => ping.http_status < 300 ? count + 1 : count, 0),
      unsuccessfulCount: systemPings.reduce((count, ping) => ping.http_status > 300 ? count + 1 : count, 0),
    };
  });

  return uptimeBySystem;
}

export default async function Home() {
  const systems = await prisma.systems.findMany();
  const uptimeBySystem = await getLastDayUptimeByHour(systems.map(system => system.id));

  return (
    <main>
      {systems.map(system => {
        return <>
          <div>{system.name}</div>
          <div>{JSON.stringify(uptimeBySystem[system.id])}</div>
        </>
      })}
    </main>
  );
}
