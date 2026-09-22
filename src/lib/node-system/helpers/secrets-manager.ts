/**
 * Secrets and Environment Variables Manager
 * Handles secure credential storage and environment variable access
 */

export interface SecretValue {
  key: string;
  value: string;
  encrypted?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface EnvironmentConfig {
  variables: Record<string, string>;
  secrets: Record<string, SecretValue>;
}

export class SecretsManager {
  private static secrets: Map<string, SecretValue> = new Map();
  private static envVars: Map<string, string> = new Map();
  private static encryptionKey: string | null = null;

  /**
   * Initialize with encryption key (optional)
   */
  static initialize(encryptionKey?: string): void {
    if (encryptionKey) {
      SecretsManager.encryptionKey = encryptionKey;
    }

    // Load from environment variables (process.env in Node, or injected in browser)
    if (typeof process !== 'undefined' && process.env) {
      Object.entries(process.env).forEach(([key, value]) => {
        if (value !== undefined) {
          SecretsManager.envVars.set(key, value);
        }
      });
    }

    console.log('[SecretsManager] Initialized with', SecretsManager.envVars.size, 'environment variables');
  }

  /**
   * Set a secret value
   */
  static setSecret(key: string, value: string, encrypt: boolean = false): void {
    const secret: SecretValue = {
      key,
      value: encrypt ? SecretsManager.encrypt(value) : value,
      encrypted: encrypt,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    SecretsManager.secrets.set(key, secret);
    console.log(`[SecretsManager] Secret "${key}" set (encrypted: ${encrypt})`);
  }

  /**
   * Get a secret value
   */
  static getSecret(key: string): string | null {
    const secret = SecretsManager.secrets.get(key);

    if (!secret) {
      console.warn(`[SecretsManager] Secret "${key}" not found`);
      return null;
    }

    return secret.encrypted ? SecretsManager.decrypt(secret.value) : secret.value;
  }

  /**
   * Check if secret exists
   */
  static hasSecret(key: string): boolean {
    return SecretsManager.secrets.has(key);
  }

  /**
   * Delete a secret
   */
  static deleteSecret(key: string): boolean {
    const deleted = SecretsManager.secrets.delete(key);
    if (deleted) {
      console.log(`[SecretsManager] Secret "${key}" deleted`);
    }
    return deleted;
  }

  /**
   * Set environment variable
   */
  static setEnv(key: string, value: string): void {
    SecretsManager.envVars.set(key, value);
    console.log(`[SecretsManager] Environment variable "${key}" set`);
  }

  /**
   * Get environment variable
   */
  static getEnv(key: string, defaultValue?: string): string | undefined {
    return SecretsManager.envVars.get(key) || defaultValue;
  }

  /**
   * Check if environment variable exists
   */
  static hasEnv(key: string): boolean {
    return SecretsManager.envVars.has(key);
  }

  /**
   * Get all environment variables (excluding secrets)
   */
  static getAllEnv(): Record<string, string> {
    return Object.fromEntries(SecretsManager.envVars.entries());
  }

  /**
   * Resolve value from secrets or environment variables
   * Supports syntax: ${SECRET_NAME} or ${env:VAR_NAME}
   */
  static resolve(template: string): string {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
      // Environment variable syntax: ${env:VAR_NAME}
      if (key.startsWith('env:')) {
        const envKey = key.substring(4);
        const envValue = SecretsManager.getEnv(envKey);
        if (envValue === undefined) {
          console.warn(`[SecretsManager] Environment variable "${envKey}" not found`);
          return match; // Return original if not found
        }
        return envValue;
      }

      // Secret syntax: ${SECRET_NAME}
      const secretValue = SecretsManager.getSecret(key);
      if (secretValue === null) {
        console.warn(`[SecretsManager] Secret "${key}" not found`);
        return match; // Return original if not found
      }
      return secretValue;
    });
  }

  /**
   * Resolve object properties recursively
   */
  static resolveObject<T extends Record<string, any>>(obj: T): T {
    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = SecretsManager.resolve(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = SecretsManager.resolveObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Simple encryption (base64 + XOR with key)
   * Note: This is NOT cryptographically secure, just basic obfuscation
   * For production, use proper encryption libraries
   */
  private static encrypt(text: string): string {
    if (!SecretsManager.encryptionKey) {
      return btoa(text); // Just base64 if no key
    }

    const key = SecretsManager.encryptionKey;
    let encrypted = '';

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }

    return btoa(encrypted);
  }

  /**
   * Simple decryption
   */
  private static decrypt(encrypted: string): string {
    const decoded = atob(encrypted);

    if (!SecretsManager.encryptionKey) {
      return decoded;
    }

    const key = SecretsManager.encryptionKey;
    let decrypted = '';

    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }

    return decrypted;
  }

  /**
   * Export secrets (encrypted)
   */
  static exportSecrets(): Record<string, SecretValue> {
    return Object.fromEntries(SecretsManager.secrets.entries());
  }

  /**
   * Import secrets
   */
  static importSecrets(secrets: Record<string, SecretValue>): void {
    for (const [key, secret] of Object.entries(secrets)) {
      SecretsManager.secrets.set(key, secret);
    }
    console.log(`[SecretsManager] Imported ${Object.keys(secrets).length} secrets`);
  }

  /**
   * Clear all secrets (use with caution)
   */
  static clearSecrets(): void {
    SecretsManager.secrets.clear();
    console.log('[SecretsManager] All secrets cleared');
  }

  /**
   * Clear all environment variables (use with caution)
   */
  static clearEnv(): void {
    SecretsManager.envVars.clear();
    console.log('[SecretsManager] All environment variables cleared');
  }

  /**
   * Mask secret value for display (show only first and last 2 chars)
   */
  static maskSecret(value: string): string {
    if (!value || value.length <= 4) {
      return '***';
    }

    return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
  }

  /**
   * Validate secret key format
   */
  static isValidKey(key: string): boolean {
    // Keys should be uppercase with underscores
    return /^[A-Z][A-Z0-9_]*$/.test(key);
  }

  /**
   * Get secret metadata (without value)
   */
  static getSecretMetadata(key: string): Omit<SecretValue, 'value'> | null {
    const secret = SecretsManager.secrets.get(key);

    if (!secret) {
      return null;
    }

    return {
      key: secret.key,
      encrypted: secret.encrypted,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt
    };
  }

  /**
   * List all secret keys (without values)
   */
  static listSecretKeys(): string[] {
    return Array.from(SecretsManager.secrets.keys());
  }

  /**
   * List all environment variable keys
   */
  static listEnvKeys(): string[] {
    return Array.from(SecretsManager.envVars.keys());
  }

  /**
   * Bulk set secrets from object
   */
  static setSecrets(secrets: Record<string, string>, encrypt: boolean = false): void {
    for (const [key, value] of Object.entries(secrets)) {
      SecretsManager.setSecret(key, value, encrypt);
    }
  }

  /**
   * Bulk set environment variables from object
   */
  static setEnvs(envs: Record<string, string>): void {
    for (const [key, value] of Object.entries(envs)) {
      SecretsManager.setEnv(key, value);
    }
  }

  /**
   * Get configuration object with resolved secrets
   */
  static getResolvedConfig<T extends Record<string, any>>(config: T): T {
    return SecretsManager.resolveObject(config);
  }

  /**
   * Check if string contains secret references
   */
  static hasSecretReferences(text: string): boolean {
    return typeof text === 'string' && /\$\{[^}]+\}/.test(text);
  }

  /**
   * Extract secret references from string
   */
  static extractSecretReferences(text: string): string[] {
    if (typeof text !== 'string') {
      return [];
    }

    const matches = text.matchAll(/\$\{([^}]+)\}/g);
    return Array.from(matches, m => m[1]);
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Browser environment - don't auto-initialize
  console.log('[SecretsManager] Browser environment detected');
} else {
  // Node.js environment - auto-initialize with process.env
  SecretsManager.initialize();
}
