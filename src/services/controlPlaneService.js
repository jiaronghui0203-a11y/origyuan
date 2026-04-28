import { buildResponse } from "../utils/response.js";
import { fetchJsonWithTimeout, joinUrl, toErrorMessage } from "../utils/http.js";

export function createControlPlaneService(config, logger) {
  const lastSuccessTimestamps = new Map();

  const providerDefinitions = [
    {
      key: "newApi",
      label: "new-api",
      role: "northbound",
      baseUrl: config.northbound.newApi.baseUrl,
      apiKey: config.northbound.newApi.apiKey,
      apiKeyConfigured: config.northbound.newApi.apiKeyConfigured,
      timeoutMs: config.northbound.newApi.timeoutMs,
      probePaths: ["models", "v1/models", "health", ""],
      modelPaths: ["models", "v1/models"]
    },
    {
      key: "sub2api",
      label: "sub2api",
      role: "southbound",
      baseUrl: config.southbound.sub2api.baseUrl,
      apiKey: config.southbound.sub2api.apiKey,
      apiKeyConfigured: config.southbound.sub2api.apiKeyConfigured,
      timeoutMs: config.southbound.sub2api.timeoutMs,
      probePaths: ["health", "status", "v1/models", ""]
    },
    {
      key: "cliProxyApi",
      label: "CLIProxyAPI",
      role: "legacy",
      baseUrl: config.legacy.cliProxyApi.baseUrl,
      apiKey: config.legacy.cliProxyApi.apiKey,
      apiKeyConfigured: config.legacy.cliProxyApi.apiKeyConfigured,
      timeoutMs: config.northbound.newApi.timeoutMs,
      probePaths: ["models", "v1/models", "health", ""]
    },
    {
      key: "router9",
      label: "9Router",
      role: "lab",
      baseUrl: config.lab.router9.baseUrl,
      apiKey: "",
      apiKeyConfigured: false,
      timeoutMs: config.lab.router9.timeoutMs,
      probePaths: ["models", "v1/models", "health", ""]
    }
  ];

  async function probeProvider(definition) {
    if (config.taskMode === "mock") {
      return {
        key: definition.key,
        label: definition.label,
        role: definition.role,
        configured: Boolean(definition.baseUrl),
        ok: false,
        enabled: false,
        mode: config.taskMode,
        baseUrl: definition.baseUrl,
        apiKeyConfigured: definition.apiKeyConfigured,
        summary: "Control plane is running in mock mode.",
        latencyMs: null,
        lastSuccessAt: lastSuccessTimestamps.get(definition.key) || null,
        checkedUrl: null,
        statusCode: null,
        error: null
      };
    }

    if (!definition.baseUrl) {
      return {
        key: definition.key,
        label: definition.label,
        role: definition.role,
        configured: false,
        ok: false,
        enabled: false,
        mode: config.taskMode,
        baseUrl: "",
        apiKeyConfigured: definition.apiKeyConfigured,
        summary: "Provider base URL is not configured.",
        latencyMs: null,
        lastSuccessAt: lastSuccessTimestamps.get(definition.key) || null,
        checkedUrl: null,
        statusCode: null,
        error: "Missing base URL."
      };
    }

    const headers = buildHeaders(definition.apiKey);

    for (const probePath of definition.probePaths) {
      const checkedUrl = joinUrl(definition.baseUrl, probePath);
      const startedAt = performance.now();

      try {
        const { response, body } = await fetchJsonWithTimeout(checkedUrl, {
          headers,
          timeoutMs: definition.timeoutMs
        });
        const latencyMs = Number((performance.now() - startedAt).toFixed(1));

        if (!response.ok) {
          continue;
        }

        const models = normalizeModelList(body);
        const lastSuccessAt = new Date().toISOString();
        lastSuccessTimestamps.set(definition.key, lastSuccessAt);

        return {
          key: definition.key,
          label: definition.label,
          role: definition.role,
          configured: true,
          ok: true,
          enabled: true,
          mode: config.taskMode,
          baseUrl: definition.baseUrl,
          apiKeyConfigured: definition.apiKeyConfigured,
          summary: models.length
            ? `Healthy via ${checkedUrl}; discovered ${models.length} models.`
            : `Healthy via ${checkedUrl}.`,
          latencyMs,
          lastSuccessAt,
          checkedUrl,
          statusCode: response.status,
          error: null
        };
      } catch (error) {
        logger.info("provider_probe_failed", {
          provider: definition.key,
          checkedUrl,
          error: toErrorMessage(error)
        });
      }
    }

    return {
      key: definition.key,
      label: definition.label,
      role: definition.role,
      configured: true,
      ok: false,
      enabled: true,
      mode: config.taskMode,
      baseUrl: definition.baseUrl,
      apiKeyConfigured: definition.apiKeyConfigured,
      summary: "Provider is configured but probe failed for all known endpoints.",
      latencyMs: null,
      lastSuccessAt: lastSuccessTimestamps.get(definition.key) || null,
      checkedUrl: null,
      statusCode: null,
      error: "Probe failed."
    };
  }

  async function probeOpenClaw() {
    if (config.taskMode === "mock") {
      return {
        ok: false,
        configured: Boolean(config.openclaw.baseUrl),
        summary: "OpenClaw status is mocked in TASK_MODE=mock.",
        checkedUrl: null,
        latencyMs: null
      };
    }

    if (!config.openclaw.baseUrl) {
      return {
        ok: false,
        configured: false,
        summary: "OpenClaw base URL is not configured.",
        checkedUrl: null,
        latencyMs: null
      };
    }

    const probePaths = ["health", "status", ""];

    for (const probePath of probePaths) {
      const checkedUrl = joinUrl(config.openclaw.baseUrl, probePath);
      const startedAt = performance.now();

      try {
        const { response } = await fetchJsonWithTimeout(checkedUrl, {
          timeoutMs: config.northbound.newApi.timeoutMs
        });

        if (!response.ok) {
          continue;
        }

        return {
          ok: true,
          configured: true,
          summary: `OpenClaw reachable via ${checkedUrl}.`,
          checkedUrl,
          latencyMs: Number((performance.now() - startedAt).toFixed(1))
        };
      } catch (error) {
        logger.info("openclaw_probe_failed", {
          checkedUrl,
          error: toErrorMessage(error)
        });
      }
    }

    return {
      ok: false,
      configured: true,
      summary: "OpenClaw is configured but probe failed for all known endpoints.",
      checkedUrl: null,
      latencyMs: null
    };
  }

  async function getTopologyStatus() {
    const providers = await getProviderStatusesData();

    return buildResponse({
      source: "control-plane",
      message: "Current control-plane topology.",
      data: {
        mode: config.taskMode,
        chain: [
          "cc-switch",
          "new-api",
          "sub2api",
          "22 authenticated account pools"
        ],
        nodes: {
          ccSwitch: {
            role: "client-side profile switcher",
            owner: "local",
            enabled: true
          },
          newApi: {
            role: "public northbound API",
            hostname: config.cloudflare.apiHostname || null,
            ...providers.newApi
          },
          sub2api: {
            role: "internal account pool router",
            pools: config.southbound.sub2api.pools,
            ...providers.sub2api
          },
          cliProxyApi: {
            role: "legacy rollback bridge",
            hostname: config.cloudflare.legacyHostname || null,
            ...providers.cliProxyApi
          },
          router9: {
            role: "local lab dashboard",
            ...providers.router9
          }
        },
        cloudflare: {
          enabled: Boolean(config.cloudflare.zoneName || config.cloudflare.apiHostname),
          zoneName: config.cloudflare.zoneName || null,
          apiHostname: config.cloudflare.apiHostname || null,
          legacyHostname: config.cloudflare.legacyHostname || null,
          accessAudienceConfigured: Boolean(config.cloudflare.accessAudience)
        }
      }
    });
  }

  async function getProvidersStatus() {
    const providers = await getProviderStatusesData();
    const degraded = Object.values(providers).some((provider) => provider.configured && !provider.ok);

    return buildResponse({
      source: "control-plane",
      message: degraded
        ? "Provider status collected with one or more degraded upstreams."
        : "Provider status collected.",
      data: {
        mode: config.taskMode,
        providers
      }
    });
  }

  async function getApprovedModels() {
    const provider = providerDefinitions.find((definition) => definition.key === "newApi");
    const approvedModels = config.northbound.newApi.approvedModels;

    if (config.taskMode === "mock") {
      return buildResponse({
        source: "control-plane",
        message: "Approved northbound models in mock mode.",
        data: {
          provider: provider.label,
          upstreamAvailable: false,
          checkedUrl: null,
          models: approvedModels.map((id) => ({ id, approved: true, available: false }))
        }
      });
    }

    if (!provider.baseUrl) {
      return buildResponse({
        source: "control-plane",
        message: "Northbound provider is not configured.",
        data: {
          provider: provider.label,
          upstreamAvailable: false,
          checkedUrl: null,
          models: approvedModels.map((id) => ({ id, approved: true, available: false })),
          error: "Missing NEW_API_BASE_URL."
        }
      });
    }

    const headers = buildHeaders(provider.apiKey);

    for (const modelPath of provider.modelPaths) {
      const checkedUrl = joinUrl(provider.baseUrl, modelPath);

      try {
        const { response, body } = await fetchJsonWithTimeout(checkedUrl, {
          headers,
          timeoutMs: provider.timeoutMs
        });

        if (!response.ok) {
          continue;
        }

        const upstreamModels = normalizeModelList(body);
        const normalizedSet = new Set(upstreamModels);

        return buildResponse({
          source: "control-plane",
          message: "Approved northbound models.",
          data: {
            provider: provider.label,
            upstreamAvailable: true,
            checkedUrl,
            upstreamModelCount: upstreamModels.length,
            models: approvedModels.map((id) => ({
              id,
              approved: true,
              available: normalizedSet.has(id)
            }))
          }
        });
      } catch (error) {
        logger.info("provider_models_failed", {
          provider: provider.key,
          checkedUrl,
          error: toErrorMessage(error)
        });
      }
    }

    return buildResponse({
      source: "control-plane",
      message: "Failed to load approved northbound models from the upstream provider.",
      data: {
        provider: provider.label,
        upstreamAvailable: false,
        checkedUrl: null,
        models: approvedModels.map((id) => ({ id, approved: true, available: false })),
        error: "Model list probe failed."
      }
    });
  }

  async function getOpenClawStatus() {
    if (config.taskMode === "mock") {
      return buildResponse({
        source: "openclaw",
        message: "OpenClaw adapter is running in mock mode.",
        data: {
          mode: config.taskMode,
          connected: false,
          endpoint: config.openclaw.baseUrl,
          apiKeyConfigured: config.openclaw.apiKeyConfigured,
          northboundProvider: config.openclaw.northProvider,
          modelSlots: config.openclaw.modelSlots
        }
      });
    }

    const [openclawProbe, providers, approvedModelsResponse] = await Promise.all([
      probeOpenClaw(),
      getProviderStatusesData(),
      getApprovedModels()
    ]);
    const approvedModels = approvedModelsResponse.data.models;
    const checks = [
      {
        key: "openclaw",
        ok: openclawProbe.ok,
        summary: openclawProbe.summary
      },
      {
        key: "newApi",
        ok: providers.newApi.ok,
        summary: providers.newApi.summary
      },
      {
        key: "sub2api",
        ok: providers.sub2api.ok,
        summary: providers.sub2api.summary
      },
      {
        key: "approvedModels",
        ok: approvedModels.every((model) => model.available),
        summary: `${approvedModels.filter((model) => model.available).length}/${approvedModels.length} approved aliases are available.`
      }
    ];
    const connected = checks.every((check) => check.ok);

    return buildResponse({
      source: "openclaw",
      message: connected
        ? "OpenClaw northbound chain is reachable."
        : "OpenClaw northbound chain is degraded.",
      data: {
        mode: config.taskMode,
        connected,
        endpoint: config.openclaw.baseUrl,
        apiKeyConfigured: config.openclaw.apiKeyConfigured,
        northboundProvider: config.openclaw.northProvider,
        modelSlots: config.openclaw.modelSlots,
        checks,
        providers: {
          newApi: providers.newApi,
          sub2api: providers.sub2api
        },
        models: approvedModels
      }
    });
  }

  async function getProviderStatusesData() {
    const results = await Promise.all(providerDefinitions.map((definition) => probeProvider(definition)));

    return Object.fromEntries(results.map((provider) => [provider.key, provider]));
  }

  return {
    getTopologyStatus,
    getProvidersStatus,
    getApprovedModels,
    getOpenClawStatus
  };
}

function buildHeaders(apiKey) {
  if (!apiKey) {
    return {};
  }

  return {
    authorization: `Bearer ${apiKey}`
  };
}

function normalizeModelList(body) {
  const rawModels = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.models)
      ? body.models
      : Array.isArray(body)
        ? body
        : [];

  return rawModels
    .map((model) => {
      if (typeof model === "string") {
        return model;
      }

      return model?.id || model?.name || null;
    })
    .filter(Boolean);
}
