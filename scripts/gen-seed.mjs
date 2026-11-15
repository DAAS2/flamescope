import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("src/data/investigations.ts", "utf8");
const arr = src.slice(src.indexOf("export const investigations"));
const body = arr.slice(arr.indexOf("["), arr.lastIndexOf("];") + 1);
const data = eval(body);
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const rows = data.map((d) => `(${q(d.id)},${q(d.acronym)},${q(d.name)},${q(d.project)},${q(d.fuelType)},${d.o2[0]},${d.o2[1]},${d.pressure[0]},${d.pressure[1]},${d.flow[0]},${d.flow[1]},ARRAY[${d.categories.map(q).join(",")}]::text[],${d.directness},${q(JSON.stringify(d))}::jsonb)`);
writeFileSync("supabase-seed.sql", `insert into public.investigations (id,acronym,name,project,fuel_type,o2_min,o2_max,pressure_min_kpa,pressure_max_kpa,flow_min_cms,flow_max_cms,categories,directness,data) values\n${rows.join(",\n")}\non conflict (id) do update set data=excluded.data, directness=excluded.directness, updated_at=now();\n`);
console.log(data.length, "rows");
