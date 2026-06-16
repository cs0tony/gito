import { existsSync } from 'node:fs';
import { file as bun_file, write } from 'bun';

/**
 * 配置接口定义
 */
export interface Config {
  defaultTarget: string;
  autoPush: boolean;
  autoConfirm: boolean;
  mergeNoFf: boolean;
}

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG: Config = {
  defaultTarget: 'test',
  autoPush: false,
  autoConfirm: false,
  mergeNoFf: false
};

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return `${homeDir}/.gito.json`;
}

/**
 * 加载配置文件
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const file = bun_file(configPath);
    const content = await file.text();
    const userConfig = JSON.parse(content);

    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (error) {
    console.error(`Error loading config: ${error}`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 保存配置文件
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();

  try {
    await write(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Error saving config: ${error}`);
    throw error;
  }
}

/**
 * 获取单个配置值
 */
export async function getConfigValue(key: keyof Config): Promise<string | boolean | undefined> {
  const config = await loadConfig();
  return config[key];
}

/**
 * 设置单个配置值
 */
export async function setConfigValue(key: keyof Config, value: string | boolean): Promise<Config> {
  const config = await loadConfig();

  if (key === 'autoPush' || key === 'autoConfirm' || key === 'mergeNoFf') {
    config[key] = value === 'true' || value === true;
  } else {
    config[key] = value as string & boolean;
  }

  await saveConfig(config);
  return config;
}

/**
 * 重置配置为默认值
 */
export async function resetConfig(): Promise<void> {
  await saveConfig({ ...DEFAULT_CONFIG });
}

/**
 * 列出所有配置
 */
export async function listConfig(): Promise<Config> {
  return await loadConfig();
}

/**
 * 验证配置键是否有效
 */
export function isValidConfigKey(key: string): key is keyof Config {
  return ['defaultTarget', 'autoPush', 'autoConfirm', 'mergeNoFf'].includes(key);
}
