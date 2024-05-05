import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function Home() {
  const results = await prisma.pings.findMany({ take: 100 });

  return (
    <main>
      {JSON.stringify(results)}
    </main>
  );
}
