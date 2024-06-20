import path from "path";
import YAML from "yaml";
import fs from 'fs';
import { PrismaClient } from "@prisma/client";

const SYSTEMS_YAML_PATH = path.resolve(__filename, '../../systems.yaml');

type YamlItem = {
  name: string,
  jurisdiction: string,
  url: string,
  programs: string
}
const toSlug = function(item : YamlItem) : string {
  const shishKebob = function(str : string) { return str.toLowerCase().replaceAll(new RegExp("[^a-z]+", "g"), "-") };

  return `${shishKebob(item.jurisdiction)}-${shishKebob(item.name)}`;
}

export const importSystemsYaml = async function() : Promise<void> {
  console.log("Parsing ", SYSTEMS_YAML_PATH)
  const prisma = new PrismaClient({ log: [{ emit: 'stdout', level: 'query' }] })
  const parsed = YAML.parse(fs.readFileSync(SYSTEMS_YAML_PATH).toString()) as YamlItem[]
  const upsertedIds = [] as number[]
  let allSucceeded = true

  await Promise.all(parsed.map(async item => {
    const slug = toSlug(item)
    try {
      const system = await prisma.systems.upsert({
        create: {
          slug,
          host: item.url,
          uri: item.url,
          jurisdiction: item.jurisdiction,
          programs: item.programs,
          name: item.name,
        },
        update: {
          host: item.url,
          uri: item.url,
          jurisdiction: item.jurisdiction,
          programs: item.programs,
          name: item.name,
        },
        where: { slug }
      })
      upsertedIds.push(system.id)
      console.log("saved: ", system.name, "(", system.slug, ")")
    } catch (ex) {
      allSucceeded = false
      console.error("could not save: ", item.name, "error:", ex)
    }
  }))

  if (allSucceeded) {
    const deletedSystems = await prisma.systems.deleteMany({
      where: {
        id: {
          notIn: upsertedIds
        }
      }
    })
    console.log("deleted", deletedSystems.count, "systems")
  }
}


// run via:
// npx tsx scraper/import.ts
importSystemsYaml()
