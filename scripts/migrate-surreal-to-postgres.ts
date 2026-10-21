// One-off: copy every table from the old SurrealDB into the Postgres configured in config.ts.
// Ids are preserved, and it is safe to re-run (rows are upserted by id).
//
//   SURREAL_URL=http://127.0.0.1:8020/rpc SURREAL_USER=root SURREAL_PASSWORD=... \
//   SURREAL_NAMESPACE=j3companyid SURREAL_DATABASE=general \
//   DATABASE_URL=postgres://user:pass@localhost:5432/j3companyid \
//   bun scripts/migrate-surreal-to-postgres.ts
//
// SKIP_TABLES=pageview,token (comma-separated) leaves those tables out.
//
// File rows are copied as-is; the uploaded files themselves live in S3 and are not touched.

const need = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
};

const sourceConfig = {
  path: need("SURREAL_URL"),
  namespace: need("SURREAL_NAMESPACE"),
  database: need("SURREAL_DATABASE"),
  auth: { username: need("SURREAL_USER"), password: need("SURREAL_PASSWORD") },
};
need("DATABASE_URL");
// config.ts reads this with `!`; nothing is uploaded or fetched during a migration.
process.env.S3_BUCKET ??= "migration-placeholder";

const root = "../node_modules/@njinlabs/njin/src";
// Importing the module list boots config + every module's init(), which connects the
// target (Postgres) adapter from config.ts.
await import(`${root}/config/module`);
const { getConfig } = await import(`${root}/core/config`);
const { internalTables } = await import(`${root}/core/db/internal`);
const { default: surrealAdapter } = await import(`${root}/core/adapters/surreal`);
const { default: userModel } = await import(`${root}/models/user`);
const { default: fileModel } = await import(`${root}/models/file`);

const tables = new Map<string, any>();
for (const table of internalTables) tables.set(table.name, table);
const models: { def: any }[] = [userModel, fileModel];
for (const factory of getConfig().models) models.push((await factory()).default);
for (const model of models) tables.set(model.def.name, model.def);

const target = getConfig().adapters.db;
const source = surrealAdapter(sourceConfig);
await source.connect();
await target.sync([...tables.values()]);

console.log(`Source: ${source.describe()}\nTarget: ${target.describe()}\n`);

const PAGE = 200;
let failed = false;

// Sessions issued by old njin versions stored the raw hash bytes, which can contain a NUL
// that Postgres refuses to store. njin still honours them, but they can't be carried over:
// the affected admin sessions simply have to log in again.
const isUnstorableLegacyToken = (table: string, error: unknown) =>
  table === "token" && error instanceof Error && /0x00/.test(error.message);

const skip = new Set((process.env.SKIP_TABLES ?? "").split(",").map((t) => t.trim()).filter(Boolean));

for (const table of tables.values()) {
  if (skip.has(table.name)) {
    console.log(`-- ${table.name.padEnd(28)} skipped`);
    continue;
  }
  console.log(`>> ${table.name} (${await source.count(table)} rows)`);
  let copied = 0;
  let skipped = 0;
  // Keyset pagination (id > last seen): offset paging skipped a row on a large table.
  let last: string | undefined;
  while (true) {
    const { rows } = await source.list(table, {
      page: 1,
      limit: PAGE,
      populate: [],
      sort: { field: "id", order: "asc" },
      where: last === undefined ? [] : [{ field: "id", op: "$gt", value: last }],
    });
    if (!rows.length) break;
    for (const { id, ...data } of rows) {
      try {
        await target.upsert(table, id, data);
        copied += 1;
      } catch (error) {
        if (isUnstorableLegacyToken(table.name, error)) {
          skipped += 1;
          continue;
        }
        failed = true;
        console.error(`  ! ${table.name}:${id} — ${error instanceof Error ? error.message : error}`);
      }
    }
    last = rows[rows.length - 1]!.id;
    process.stdout.write(`   ${copied} copied`);
  }
  const [from, to] = [await source.count(table), await target.count(table)];
  const ok = from === to + skipped;
  if (!ok) failed = true;
  const note = skipped ? ` (skipped ${skipped} legacy-format)` : "";
  console.log(`${ok ? "ok " : "MISMATCH"} ${table.name.padEnd(28)} surreal=${from} postgres=${to}${note}`);
}

await source.close();
await target.close();
console.log(failed ? "\nFinished WITH problems." : "\nDone — all tables match.");
process.exit(failed ? 1 : 0);
