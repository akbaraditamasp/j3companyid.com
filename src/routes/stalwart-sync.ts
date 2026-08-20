import { route } from "@njinlabs/njin";
import mailAccount from "../models/mail-account";
import { createAccount, isAllowedDomain, listAccounts, updateAccount, type StalwartAccount } from "../services/stalwart";

const loadAllMailAccounts = async () => {
  const records: Awaited<ReturnType<typeof mailAccount.read>>["data"] = [];
  let page = 1;

  while (true) {
    const result = await mailAccount.read({ page, limit: 100, populate: "none" });
    records.push(...result.data);
    if (page >= result.meta.pageCount) break;
    page++;
  }

  return records;
};

export default route().post("/api/stalwart/sync", async () => {
  const errors: { email: string; error: string }[] = [];
  let pulled = 0;
  let pushed = 0;
  let updated = 0;

  const [stalwartAccounts, njinAccounts] = await Promise.all([listAccounts(), loadAllMailAccounts()]);

  const stalwartByEmail = new Map<string, StalwartAccount>(stalwartAccounts.map((a) => [a.email, a]));
  const njinByEmail = new Map(njinAccounts.map((a) => [a.email, a]));

  // Only in Stalwart → pull into njin. listAccounts() already filters to
  // STALWART_DOMAIN, but re-check here too so an account outside the allowed
  // domain never gets pulled in even if that upstream filter ever changes.
  for (const stalwartAccount of stalwartAccounts) {
    if (!isAllowedDomain(stalwartAccount.email) || njinByEmail.has(stalwartAccount.email)) continue;

    try {
      await mailAccount.create({
        username: stalwartAccount.email.split("@")[0],
        email: stalwartAccount.email,
        name: stalwartAccount.name ?? undefined,
        quota: stalwartAccount.quota ?? undefined,
        status: stalwartAccount.hasCredentials ? "ACTIVE" : "DISABLED",
        stalwartId: stalwartAccount.stalwartId,
        passwordDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
      pulled++;
    } catch (err) {
      errors.push({ email: stalwartAccount.email, error: (err as Error).message });
    }
  }

  // Only in njin (no stalwartId yet) → push create to Stalwart
  for (const njinAccount of njinAccounts) {
    if (njinAccount.stalwartId || !njinAccount.email) continue;

    try {
      const created = await createAccount({
        email: njinAccount.email,
        name: njinAccount.name,
        password: njinAccount.password,
        quota: njinAccount.quota,
      });

      await mailAccount.update(njinAccount.id.id as string, {
        stalwartId: created.stalwartId,
        passwordDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
      pushed++;
    } catch (err) {
      errors.push({ email: njinAccount.email, error: (err as Error).message });
    }
  }

  // In both → reconcile
  for (const njinAccount of njinAccounts) {
    if (!njinAccount.stalwartId || !njinAccount.email) continue;

    const stalwartAccount = stalwartByEmail.get(njinAccount.email);
    if (!stalwartAccount) continue;

    try {
      // A locally-set password always wins and is pushed first — Stalwart can't tell us
      // what the password should be (it only ever stores a hash).
      if (njinAccount.passwordDirty && njinAccount.password) {
        await updateAccount(njinAccount.stalwartId, { password: njinAccount.password });
      }

      // Stalwart wins for every other field.
      await mailAccount.update(njinAccount.id.id as string, {
        name: stalwartAccount.name ?? undefined,
        quota: stalwartAccount.quota ?? undefined,
        status: stalwartAccount.hasCredentials ? "ACTIVE" : "DISABLED",
        passwordDirty: false,
        lastSyncedAt: new Date().toISOString(),
      });
      updated++;
    } catch (err) {
      errors.push({ email: njinAccount.email, error: (err as Error).message });
    }
  }

  return { pulled, pushed, updated, errors };
});
