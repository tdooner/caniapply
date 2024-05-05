import path from "path";
import YAML from "yaml";
import fs from 'fs';

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
  const parsed = YAML.parse(fs.readFileSync(SYSTEMS_YAML_PATH).toString()) as YamlItem[]
  parsed.forEach(item => {
    console.log(item, toSlug(item))
    /* TODO: Draw the rest of the owl.
     *
     * Add "slug" as a database field
     * Find or create these systems by slug in the database
     * Think about a workflow to rename these by supporting "previous_slugs" in the YAML as well
     */
  })
}


// TODO: Is there a better way to run this than:
//   npx ts-node -O '{"module":"commonjs"}' scraper/index.ts
importSystemsYaml()
