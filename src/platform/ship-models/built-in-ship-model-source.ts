import type {
  ShipModelManifest,
  ShipModelPackage,
} from "../../core/domain/ship-model";

export type BuiltInShipModelRegistryEntry = {
  id: string;
  name: string;
  description?: string;
  path: string;
};

export type BuiltInShipModelRegistry = {
  schemaVersion: string;
  models: BuiltInShipModelRegistryEntry[];
};

const builtInShipModelsBaseUrl = `${import.meta.env.BASE_URL}built-in-ship-models/`;

let registryCache: BuiltInShipModelRegistry | null = null;

export async function loadBuiltInShipModelRegistry(): Promise<BuiltInShipModelRegistry> {
  if (registryCache) {
    return registryCache;
  }

  const response = await fetch(`${builtInShipModelsBaseUrl}registry.json`);

  if (!response.ok) {
    throw new Error("Could not load built-in ship model registry.");
  }

  const registry = (await response.json()) as BuiltInShipModelRegistry;

  validateBuiltInShipModelRegistry(registry);


  registryCache = registry;

  return registry;
}

export async function loadBuiltInShipModel(
  modelId: string
): Promise<ShipModelPackage> {
  const registry = await loadBuiltInShipModelRegistry();

  const entry = registry.models.find((model) => model.id === modelId);

  if (!entry) {
    throw new Error(`Built-in ship model not found: ${modelId}`);
  }

  const manifestUrl = entry.path.startsWith('/') ? entry.path : `${builtInShipModelsBaseUrl}${entry.path}`;
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(`Could not load ship model manifest: ${entry.path}`);
  }

  const manifest = (await response.json()) as ShipModelManifest;

  const baseUrl = manifestUrl.slice(0, manifestUrl.lastIndexOf("/") + 1);

  return {
    manifest,
    baseUrl,
  };
}

function validateBuiltInShipModelRegistry(
  registry: BuiltInShipModelRegistry
): void {
  if (!registry.schemaVersion) {
    throw new Error("Built-in ship model registry is missing schemaVersion.");
  }

  if (!Array.isArray(registry.models)) {
    throw new Error("Built-in ship model registry must contain a models array.");
  }

  for (const model of registry.models) {
    if (!model.id) {
      throw new Error("A built-in ship model registry entry is missing id.");
    }

    if (!model.name) {
      throw new Error(
        `Built-in ship model registry entry "${model.id}" is missing name.`
      );
    }

    if (!model.path) {
      throw new Error(
        `Built-in ship model registry entry "${model.id}" is missing path.`
      );
    }
  }
}
