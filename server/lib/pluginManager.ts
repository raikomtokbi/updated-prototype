import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { Express } from "express";

export interface PluginManifest {
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: string;
  pluginType: string;
  entryFile: string;
  settings?: PluginSettingField[];
  hooks?: string[];
  routes?: string[];
  permissions?: string[];
}

export interface PluginSettingField {
  key: string;
  label: string;
  type: "string" | "password" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  placeholder?: string;
  description?: string;
}

export interface PluginContext {
  app: Express;
  hooks: HookSystem;
  pluginSlug: string;
  pluginDir: string;
  getConfig: () => Record<string, unknown>;
}

type HookHandler = (...args: unknown[]) => unknown | Promise<unknown>;

class HookSystem {
  private handlers: Map<string, HookHandler[]> = new Map();

  on(event: string, handler: HookHandler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off(event: string, handler: HookHandler) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((h) => h !== handler));
  }

  async emit(event: string, ...args: unknown[]) {
    const list = this.handlers.get(event) ?? [];
    const results: unknown[] = [];
    for (const handler of list) {
      try {
        results.push(await handler(...args));
      } catch (err) {
        console.error(`[PluginManager] Hook '${event}' handler error:`, err);
      }
    }
    return results;
  }

  listEvents() {
    return Array.from(this.handlers.keys());
  }
}

export const hooks = new HookSystem();

const PLUGINS_BASE = path.resolve(process.cwd(), "plugins/installed");
const VALID_PLUGIN_TYPES = [
  "payment", "validation", "sms", "email", "analytics", "webhook",
  "automation", "ui_extension", "security", "integration", "custom",
];

const loadedPlugins: Map<string, { manifest: PluginManifest; handlers: HookHandler[] }> = new Map();

export function getInstalledPluginDir(slug: string) {
  return path.join(PLUGINS_BASE, slug);
}

export function readPluginManifest(pluginDir: string): PluginManifest | null {
  const manifestPath = path.join(pluginDir, "plugin.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(raw) as PluginManifest;
  } catch {
    return null;
  }
}

export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["plugin.json is not a valid JSON object"] };
  }
  const m = manifest as Record<string, unknown>;
  if (!m.name || typeof m.name !== "string") errors.push("Missing required field: name");
  if (!m.slug || typeof m.slug !== "string") errors.push("Missing required field: slug");
  if (!m.version || typeof m.version !== "string") errors.push("Missing required field: version");
  if (!m.pluginType || typeof m.pluginType !== "string") errors.push("Missing required field: pluginType");
  if (!m.entryFile || typeof m.entryFile !== "string") errors.push("Missing required field: entryFile");
  if (m.slug && !/^[a-z0-9-_]+$/.test(m.slug as string)) {
    errors.push("slug must contain only lowercase letters, numbers, hyphens, or underscores");
  }
  return { valid: errors.length === 0, errors };
}

export function validatePluginFiles(pluginDir: string, manifest: PluginManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const manifestPath = path.join(pluginDir, "plugin.json");
  if (!fs.existsSync(manifestPath)) errors.push("plugin.json not found");
  const entryPath = path.join(pluginDir, manifest.entryFile);
  if (!fs.existsSync(entryPath)) errors.push(`Entry file '${manifest.entryFile}' not found`);
  return { valid: errors.length === 0, errors };
}

function isSafePluginPath(pluginDir: string, filePath: string): boolean {
  const resolved = path.resolve(pluginDir, filePath);
  return resolved.startsWith(path.resolve(pluginDir));
}

export async function activatePlugin(
  app: Express,
  slug: string,
  pluginDir: string,
  getConfig: () => Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const manifest = readPluginManifest(pluginDir);
    if (!manifest) return { success: false, error: "plugin.json not found or invalid" };

    if (!isSafePluginPath(pluginDir, manifest.entryFile)) {
      return { success: false, error: "Entry file path is unsafe" };
    }

    const entryPath = path.join(pluginDir, manifest.entryFile);
    if (!fs.existsSync(entryPath)) {
      return { success: false, error: `Entry file '${manifest.entryFile}' not found` };
    }

    const entryUrl = pathToFileURL(entryPath).href;
    const mod = await import(entryUrl + `?t=${Date.now()}`);

    if (typeof mod.register !== "function" && typeof mod.default?.register !== "function") {
      return { success: false, error: "Plugin entry file must export a 'register' function" };
    }

    const registerFn = mod.register ?? mod.default?.register;
    const context: PluginContext = {
      app,
      hooks,
      pluginSlug: slug,
      pluginDir,
      getConfig,
    };

    await registerFn(context);
    loadedPlugins.set(slug, { manifest, handlers: [] });
    console.log(`[PluginManager] ✓ Plugin activated: ${slug} (${manifest.name} v${manifest.version})`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[PluginManager] Failed to activate plugin '${slug}':`, message);
    return { success: false, error: message };
  }
}

export function deactivatePlugin(slug: string): void {
  if (loadedPlugins.has(slug)) {
    loadedPlugins.delete(slug);
    console.log(`[PluginManager] Plugin deactivated: ${slug}`);
  }
}

export function isPluginLoaded(slug: string): boolean {
  return loadedPlugins.has(slug);
}

export function getLoadedPlugins(): string[] {
  return Array.from(loadedPlugins.keys());
}

export async function loadAllActivePlugins(
  app: Express,
  activePlugins: Array<{ slug: string; installPath?: string | null; config?: string | null }>
): Promise<void> {
  for (const plugin of activePlugins) {
    const dir = plugin.installPath ?? getInstalledPluginDir(plugin.slug);
    const getConfig = () => {
      try {
        return plugin.config ? JSON.parse(plugin.config) : {};
      } catch {
        return {};
      }
    };
    const result = await activatePlugin(app, plugin.slug, dir, getConfig);
    if (!result.success) {
      console.warn(`[PluginManager] Could not activate plugin '${plugin.slug}': ${result.error}`);
    }
  }
}

export { VALID_PLUGIN_TYPES, PLUGINS_BASE };
