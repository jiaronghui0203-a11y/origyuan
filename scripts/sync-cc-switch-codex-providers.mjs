import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const home = os.homedir();
const ccSwitchDir = path.join(home, ".cc-switch");
const oauthPath = path.join(ccSwitchDir, "codex_oauth_auth.json");
const dbPath = path.join(ccSwitchDir, "cc-switch.db");
const backupDir = path.join(ccSwitchDir, "backups");
const teamDir = path.join(home, "Desktop", "yuanTeam");

function parseArgs(argv) {
  return {
    prune: argv.includes("--prune"),
    teamCompare: !argv.includes("--skip-team-compare"),
  };
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
}

function backupFile(filePath) {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupDir, `${path.basename(filePath)}.${stamp}.bak`);
  fs.copyFileSync(filePath, target);
  return target;
}

function loadOauthStore() {
  ensureFile(oauthPath);
  const store = JSON.parse(fs.readFileSync(oauthPath, "utf8"));
  return { store };
}

function listOauthEntries(store) {
  return Object.values(store.accounts || {})
    .filter((entry) => entry?.account_id && entry?.refresh_token)
    .sort((a, b) => (b.authenticated_at || 0) - (a.authenticated_at || 0));
}

function loadTeamAccounts() {
  if (!fs.existsSync(teamDir)) {
    return { count: 0, map: new Map() };
  }

  const files = fs
    .readdirSync(teamDir)
    .filter((name) => /^codex-.*\.json$/i.test(name));
  const map = new Map();
  for (const file of files) {
    const payload = JSON.parse(
      fs.readFileSync(path.join(teamDir, file), "utf8"),
    );
    if (payload?.account_id) {
      map.set(payload.account_id, {
        account_id: payload.account_id,
        email: payload.email || null,
        source: file,
        payload,
      });
    }
  }
  return { count: map.size, map };
}

function providerIdFor(accountId) {
  return `codex-oauth-${accountId}`;
}

function buildProviderConfigToml() {
  return 'base_url = "https://api.openai.com/v1"\n';
}

function buildSettingsConfig(account) {
  return JSON.stringify({
    auth: {
      auth_mode: "chatgpt",
      OPENAI_API_KEY: null,
      tokens: {
        id_token: account.id_token || null,
        access_token: account.access_token || null,
        refresh_token: account.refresh_token,
        account_id: account.account_id,
      },
      last_refresh: account.last_refresh || "1970-01-01T00:00:00.000Z",
    },
    config: buildProviderConfigToml(),
  });
}

function buildMeta(account) {
  return JSON.stringify({
    authBinding: {
      source: "managed_account",
      authProvider: "codex_oauth",
      accountId: account.account_id,
    },
    providerType: "codex_oauth",
    commonConfigEnabled: true,
    endpointAutoSelect: true,
  });
}

function nameFor(account) {
  return `ChatGPT (${account.email || account.account_id})`;
}

function noteFor(account) {
  return `Codex OAuth account ${account.email || account.account_id}`;
}

function mergeAuthStoreWithTeam({ store, team }) {
  if (!team.map.size) {
    return { updated: 0, backup: null };
  }

  let updated = 0;
  let backup = null;
  for (const entry of team.map.values()) {
    const current = store.accounts?.[entry.account_id];
    if (!current) {
      continue;
    }

    const merged = { ...current };
    for (const [key, value] of Object.entries(entry.payload || {})) {
      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      }
    }

    const before = JSON.stringify(current);
    const after = JSON.stringify(merged);
    if (before !== after) {
      if (!backup) {
        backup = backupFile(oauthPath);
      }
      store.accounts[entry.account_id] = merged;
      updated += 1;
    }
  }

  if (updated > 0) {
    fs.writeFileSync(oauthPath, JSON.stringify(store, null, 2));
  }

  return { updated, backup };
}

function syncProviders({ prune, teamCompare }) {
  const { store } = loadOauthStore();
  let entries = listOauthEntries(store);
  if (!entries.length) {
    throw new Error("No Codex OAuth accounts found in codex_oauth_auth.json");
  }

  const team = teamCompare ? loadTeamAccounts() : { count: 0, map: new Map() };
  const authMerge = teamCompare
    ? mergeAuthStoreWithTeam({ store, team })
    : { updated: 0, backup: null };
  entries = listOauthEntries(store);
  const oauthIds = new Set(entries.map((entry) => entry.account_id));
  const compare = teamCompare
    ? {
        extraInOauth: entries
          .filter((entry) => !team.map.has(entry.account_id))
          .map((entry) => ({
            account_id: entry.account_id,
            email: entry.email || null,
          })),
        missingInOauth: [...team.map.values()]
          .filter((entry) => !oauthIds.has(entry.account_id))
          .map((entry) => ({
            account_id: entry.account_id,
            email: entry.email,
            source: entry.source,
          })),
      }
    : null;

  const db = new DatabaseSync(dbPath);
  const currentRow = db
    .prepare(
      "SELECT id FROM providers WHERE app_type = 'codex' AND is_current = 1 LIMIT 1",
    )
    .get();
  const currentId = currentRow?.id || null;
  const backup = backupFile(dbPath);
  const now = Date.now();

  const existingRows = db
    .prepare("SELECT id, created_at, sort_index FROM providers WHERE app_type = 'codex'")
    .all();
  const existingMap = new Map(existingRows.map((row) => [row.id, row]));

  const desiredIds = new Set(entries.map((entry) => providerIdFor(entry.account_id)));

  const upsert = db.prepare(`
    INSERT INTO providers (
      id, app_type, name, settings_config, website_url, category,
      created_at, sort_index, notes, icon, icon_color, meta,
      is_current, in_failover_queue, cost_multiplier
    ) VALUES (
      ?, 'codex', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0'
    )
    ON CONFLICT(id, app_type) DO UPDATE SET
      name = excluded.name,
      settings_config = excluded.settings_config,
      website_url = excluded.website_url,
      category = excluded.category,
      sort_index = excluded.sort_index,
      notes = excluded.notes,
      icon = excluded.icon,
      icon_color = excluded.icon_color,
      meta = excluded.meta,
      is_current = excluded.is_current,
      in_failover_queue = excluded.in_failover_queue
  `);

  const clearCurrent = db.prepare(
    "UPDATE providers SET is_current = 0 WHERE app_type = 'codex'",
  );
  const setCurrent = db.prepare(
    "UPDATE providers SET is_current = 1 WHERE app_type = 'codex' AND id = ?",
  );
  const removeOne = db.prepare(
    "DELETE FROM providers WHERE app_type = 'codex' AND id = ?",
  );

  let insertedOrUpdated = 0;
  let removed = 0;

  db.exec("BEGIN");
  try {
    clearCurrent.run();

    for (const [index, account] of entries.entries()) {
      const providerId = providerIdFor(account.account_id);
      const existing = existingMap.get(providerId);
      const isCurrent = currentId
        ? currentId === providerId
        : store.default_account_id === account.account_id;

      upsert.run(
        providerId,
        nameFor(account),
        buildSettingsConfig(account),
        "https://chatgpt.com/codex",
        "custom",
        existing?.created_at ?? now,
        index + 1,
        noteFor(account),
        "openai",
        "#00A67E",
        buildMeta(account),
        isCurrent ? 1 : 0,
        1,
      );
      insertedOrUpdated += 1;
    }

    if (prune) {
      for (const row of existingRows) {
        if (!desiredIds.has(row.id)) {
          removeOne.run(row.id);
          removed += 1;
        }
      }
    }

    if (!currentId) {
      const fallbackId = providerIdFor(entries[0].account_id);
      setCurrent.run(fallbackId);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  return {
    oauthAccountCount: entries.length,
    providerCount: insertedOrUpdated,
    removed,
    backup,
    authStoreUpdated: authMerge.updated,
    authStoreBackup: authMerge.backup,
    currentProviderId: currentId,
    defaultAccountId: store.default_account_id || null,
    compare,
  };
}

try {
  ensureFile(dbPath);
  const args = parseArgs(process.argv.slice(2));
  const result = syncProviders(args);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
