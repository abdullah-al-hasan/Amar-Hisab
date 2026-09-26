export type AutoBackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: AutoBackupFrequency;
  lastAutoBackup?: string;
}

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  frequency: 'daily',
};

export const getAutoBackupConfig = (): AutoBackupConfig => {
  try {
    const raw = localStorage.getItem('hishab_auto_backup_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== false,
        frequency: ['daily', 'weekly', 'monthly'].includes(parsed.frequency)
          ? parsed.frequency
          : 'daily',
        lastAutoBackup: parsed.lastAutoBackup,
      };
    }
  } catch (e) {
    console.error('Failed to load auto backup config:', e);
  }
  return DEFAULT_AUTO_BACKUP_CONFIG;
};

export const saveAutoBackupConfig = (config: AutoBackupConfig): void => {
  try {
    localStorage.setItem('hishab_auto_backup_config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save auto backup config:', e);
  }
};

export const shouldPerformAutoBackup = (
  config: AutoBackupConfig,
  lastBackupTime?: string
): boolean => {
  if (!config.enabled) return false;
  const compareTime = config.lastAutoBackup || lastBackupTime;
  if (!compareTime) return true; // No backup yet, trigger auto backup

  const lastDate = new Date(compareTime).getTime();
  const now = Date.now();
  const diffHours = (now - lastDate) / (1000 * 60 * 60);

  if (config.frequency === 'daily') {
    return diffHours >= 24;
  }
  if (config.frequency === 'weekly') {
    return diffHours >= 24 * 7;
  }
  if (config.frequency === 'monthly') {
    return diffHours >= 24 * 30;
  }
  return false;
};
