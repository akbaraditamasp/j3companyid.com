import { afterCreate, afterDestroy, afterUpdate, beforeCreate, beforeUpdate } from "@njinlabs/njin";
import mailAccount from "../models/mail-account";
import { createAccount, destroyAccount, updateAccount } from "../services/stalwart";

const STALWART_DOMAIN = process.env.STALWART_DOMAIN!;

// The only place a full email is ever constructed — always username + the
// hardcoded domain, regardless of any `email` sent in the request body.
const deriveEmail = (username: string) => `${username.toLowerCase()}@${STALWART_DOMAIN}`;

beforeCreate(mailAccount, (data) => {
  if (!data.username) return;
  return { ...data, email: deriveEmail(data.username) };
});

beforeUpdate(mailAccount, (data) => {
  const patch: Record<string, unknown> = {};
  if (data.username) patch.email = deriveEmail(data.username);
  if (data.password) patch.passwordDirty = true;
  if (Object.keys(patch).length === 0) return;
  return { ...data, ...patch };
});

// Guards against the mailAccount.update() calls below re-entering this same
// afterUpdate handler (they only patch stalwartId/passwordDirty/lastSyncedAt,
// never anything that needs to be pushed again).
const syncing = new Set<string>();

const pushToStalwart = async (record: Awaited<ReturnType<typeof mailAccount.create>>) => {
  const id = record.id.id as string;
  if (syncing.has(id)) return;
  if (!record.email) return;

  syncing.add(id);
  try {
    if (!record.stalwartId) {
      const created = await createAccount({
        email: record.email,
        name: record.name,
        password: record.password,
        quota: record.quota,
      });

      await mailAccount.update(id, {
        stalwartId: created.stalwartId,
        passwordDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
    } else {
      await updateAccount(record.stalwartId, {
        name: record.name,
        quota: record.quota,
        password: record.passwordDirty ? record.password : undefined,
      });

      await mailAccount.update(id, {
        passwordDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Don't fail the create/update request just because Stalwart is unreachable —
    // POST /api/stalwart/sync will retry (records without a fresh lastSyncedAt/
    // stalwartId get picked up again on the next run).
    console.error(`[stalwart] failed to sync mailAccount "${record.email}":`, err);
  } finally {
    syncing.delete(id);
  }
};

afterCreate(mailAccount, pushToStalwart);
afterUpdate(mailAccount, pushToStalwart);

afterDestroy(mailAccount, async (record) => {
  if (!record.stalwartId) return;

  try {
    await destroyAccount(record.stalwartId);
  } catch (err) {
    console.error(`[stalwart] failed to delete mailAccount "${record.email}" (${record.stalwartId}) from Stalwart:`, err);
  }
});
