// Stalwart Mail Server JMAP client — plain TS module, not a njin extension point.
// Imported by src/hooks/mail-account.ts (live push/pull on create/update/destroy)
// and src/routes/stalwart-sync.ts (POST /api/stalwart/sync reconciliation).
//
// STALWART_DOMAIN is mandatory here (unlike some reference setups where it's an
// optional filter): every mail account in this project lives on exactly one
// hardcoded domain, enforced at the model level (src/models/mail-account.ts only
// collects a local-part `username`), so there is no "sync every domain" mode.

const STALWART_URL = process.env.STALWART_URL ?? "http://localhost:8081";
const STALWART_API_KEY = process.env.STALWART_API_KEY;
const STALWART_DOMAIN = process.env.STALWART_DOMAIN!;

export const isAllowedDomain = (email: string): boolean => email.toLowerCase().endsWith(`@${STALWART_DOMAIN.toLowerCase()}`);

const USING = ["urn:ietf:params:jmap:core", "urn:stalwart:jmap", "urn:ietf:params:jmap:principals"];

type JmapMethodCall = [string, Record<string, unknown>, string];

const jmapRequest = async (methodCalls: JmapMethodCall[]) => {
  const res = await fetch(`${STALWART_URL}/jmap/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STALWART_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ using: USING, methodCalls }),
  });

  if (!res.ok) {
    throw new Error(`Stalwart JMAP request failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as { methodResponses: [string, Record<string, unknown>, string][] };

  return body.methodResponses.map(([name, args]) => {
    if (name === "error") {
      throw new Error(`Stalwart JMAP error: ${JSON.stringify(args)}`);
    }
    return args;
  });
};

export type StalwartAccount = {
  stalwartId: string;
  email: string;
  name: string | null;
  quota: number | null;
  hasCredentials: boolean;
};

type AccountRecord = {
  id: string;
  name: string;
  domainId: string;
  description: string | null;
  quotas?: { maxDiskQuota?: number };
  credentials?: Record<string, unknown>;
};

type DomainRecord = { id: string; name: string };

const domainNameCache = new Map<string, string>(); // domainId -> domain name
const domainIdCache = new Map<string, string>(); // domain name -> domainId

const loadDomains = async () => {
  if (domainNameCache.size > 0) return;

  const [{ ids }] = (await jmapRequest([["x:Domain/query", { accountId: "b" }, "0"]])) as [{ ids: string[] }];
  if (ids.length === 0) return;

  const [{ list }] = (await jmapRequest([["x:Domain/get", { accountId: "b", ids }, "0"]])) as [
    { list: DomainRecord[] },
  ];

  for (const domain of list) {
    domainNameCache.set(domain.id, domain.name);
    domainIdCache.set(domain.name, domain.id);
  }
};

const domainIdForEmail = async (email: string) => {
  const domainName = email.split("@")[1];
  if (!domainName) throw new Error(`Invalid email, no domain part: ${email}`);

  await loadDomains();

  const domainId = domainIdCache.get(domainName);
  if (!domainId) throw new Error(`Domain "${domainName}" is not registered in Stalwart`);

  return domainId;
};

const toStalwartAccount = (record: AccountRecord): StalwartAccount => ({
  stalwartId: record.id,
  email: `${record.name}@${domainNameCache.get(record.domainId) ?? record.domainId}`,
  name: record.description,
  quota: record.quotas?.maxDiskQuota ?? null,
  hasCredentials: Object.keys(record.credentials ?? {}).length > 0,
});

export const listAccounts = async (): Promise<StalwartAccount[]> => {
  await loadDomains();

  const [{ ids }] = (await jmapRequest([["x:Account/query", { accountId: "b" }, "0"]])) as [{ ids: string[] }];
  if (ids.length === 0) return [];

  const [{ list }] = (await jmapRequest([["x:Account/get", { accountId: "b", ids }, "0"]])) as [
    { list: AccountRecord[] },
  ];

  return list.map(toStalwartAccount).filter((a) => isAllowedDomain(a.email));
};

export const createAccount = async (data: {
  email: string;
  name?: string | null;
  password?: string | null;
  quota?: number | null;
}): Promise<StalwartAccount> => {
  if (!isAllowedDomain(data.email)) {
    throw new Error(`Domain of "${data.email}" is not the allowed Stalwart sync domain (${STALWART_DOMAIN})`);
  }

  const domainId = await domainIdForEmail(data.email);
  const localPart = data.email.split("@")[0];

  const [{ created, notCreated }] = (await jmapRequest([
    [
      "x:Account/set",
      {
        accountId: "b",
        create: {
          "new-0": {
            "@type": "User",
            name: localPart,
            domainId,
            description: data.name ?? null,
            credentials: data.password ? { "0": { "@type": "Password", secret: data.password } } : {},
            quotas: data.quota ? { maxDiskQuota: data.quota } : {},
            permissions: { "@type": "Inherit" },
            roles: { "@type": "User" },
            encryptionAtRest: { "@type": "Disabled" },
            locale: "en_US",
          },
        },
      },
      "0",
    ],
  ])) as [{ created?: Record<string, { id: string }>; notCreated?: Record<string, { type: string }> }];

  if (notCreated?.["new-0"]) {
    throw new Error(`Stalwart rejected account creation for "${data.email}": ${notCreated["new-0"].type}`);
  }
  if (!created?.["new-0"]) {
    throw new Error(`Stalwart account creation for "${data.email}" returned no result`);
  }

  // x:Account/set's create response only echoes server-assigned properties (id) back,
  // not the full object — build the result from what we sent instead of the response.
  return {
    stalwartId: created["new-0"].id,
    email: data.email,
    name: data.name ?? null,
    quota: data.quota ?? null,
    hasCredentials: !!data.password,
  };
};

export const updateAccount = async (
  stalwartId: string,
  data: { name?: string | null; quota?: number | null; password?: string | null },
): Promise<void> => {
  const update: Record<string, unknown> = {};

  if (data.name !== undefined) update.description = data.name;
  if (data.quota !== undefined) update.quotas = data.quota ? { maxDiskQuota: data.quota } : {};
  if (data.password) update.credentials = { "0": { "@type": "Password", secret: data.password } };

  if (Object.keys(update).length === 0) return;

  const [{ notUpdated }] = (await jmapRequest([
    ["x:Account/set", { accountId: "b", update: { [stalwartId]: update } }, "0"],
  ])) as [{ notUpdated?: Record<string, { type: string }> }];

  if (notUpdated?.[stalwartId]) {
    throw new Error(`Stalwart rejected account update for "${stalwartId}": ${notUpdated[stalwartId].type}`);
  }
};

export const destroyAccount = async (stalwartId: string): Promise<void> => {
  await jmapRequest([["x:Account/set", { accountId: "b", destroy: [stalwartId] }, "0"]]);
};
