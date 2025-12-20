import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  OPENROUTER_API_KEY: string;
  model: string;
  locale: string;
  maxLength: number;
}

const defaults: Config = {
  OPENROUTER_API_KEY: '',
  model: 'anthropic/claude-3.5-sonnet',
  locale: 'en',
  maxLength: 72,
};

const config = new Conf<Config>({
  projectName: 'aicommitlint',
  defaults,
  cwd: join(homedir(), '.aicommitlint'),
});

export function getConfig(): Config {
  return {
    OPENROUTER_API_KEY: config.get('OPENROUTER_API_KEY'),
    model: config.get('model'),
    locale: config.get('locale'),
    maxLength: config.get('maxLength'),
  };
}

export function setConfig<K extends keyof Config>(key: K, value: Config[K]): void {
  config.set(key, value);
}

export function isConfigured(): boolean {
  const apiKey = config.get('OPENROUTER_API_KEY');
  return Boolean(apiKey && apiKey.length > 0);
}

export function getConfigPath(): string {
  return config.path;
}

