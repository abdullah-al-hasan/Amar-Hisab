import { AppData } from '../types';

export interface DriveBackupMeta {
  exists: boolean;
  fileId?: string;
  name?: string;
  modifiedTime?: string;
  size?: number;
  userEmail?: string;
}

const BACKUP_FILENAME = 'amar_hisab_backup.json';

/**
 * Find existing backup file in Google Drive AppData folder
 */
export const findDriveBackup = async (accessToken: string): Promise<DriveBackupMeta> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}' and trashed=false&fields=files(id,name,modifiedTime,size,description,appProperties)&pageSize=1`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson.error?.message || '';
      if (res.status === 403 || errMsg.toLowerCase().includes('insufficient')) {
        throw new Error('গুগল ড্রাইভে অ্যাক্সেস অনুমতির ঘাটতি রয়েছে (Insufficient scopes)। অনুগ্রহ করে পুনরায় সাইন ইন করে ড্রাইভ অ্যাক্সেস অনুমোদন করুন।');
      }
      throw new Error(errMsg || 'গুগল ড্রাইভ তথ্য পড়তে ব্যর্থ হয়েছে');
    }

    const data = await res.json();
    const files = data.files || [];
    if (files.length > 0) {
      const file = files[0];
      const email = file.appProperties?.userEmail || (file.description ? file.description.replace('Backup for ', '') : undefined);
      return {
        exists: true,
        fileId: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: file.size ? Number(file.size) : undefined,
        userEmail: email,
      };
    }

    return { exists: false };
  } catch (err: any) {
    console.error('Error finding drive backup:', err);
    throw err;
  }
};

/**
 * Backup AppData to Google Drive (WhatsApp-style in AppData folder)
 */
export const uploadBackupToDrive = async (
  accessToken: string,
  appData: AppData,
  userEmail?: string,
  existingFileId?: string
): Promise<DriveBackupMeta> => {
  try {
    const backupPayload = {
      app: 'Amar-Hisab',
      version: appData.version || 3,
      backedUpAt: new Date().toISOString(),
      userEmail: userEmail || 'unknown',
      data: appData,
    };

    const fileContent = JSON.stringify(backupPayload, null, 2);
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    let targetFileId = existingFileId;
    if (!targetFileId) {
      // Check if file already exists in drive
      const existing = await findDriveBackup(accessToken);
      if (existing.exists && existing.fileId) {
        targetFileId = existing.fileId;
      }
    }

    if (targetFileId) {
      // Update existing file (PATCH)
      const updateMetadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
        description: userEmail ? `Backup for ${userEmail}` : undefined,
        appProperties: {
          userEmail: userEmail || '',
          backedUpAt: new Date().toISOString(),
        },
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(updateMetadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        fileContent +
        closeDelim;

      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=multipart&fields=id,name,modifiedTime,size,description,appProperties`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'গুগল ড্রাইভে ব্যাকআপ আপডেট করা সম্ভব হয়নি');
      }

      const updated = await res.json();
      return {
        exists: true,
        fileId: updated.id,
        name: updated.name,
        modifiedTime: updated.modifiedTime || new Date().toISOString(),
        size: updated.size ? Number(updated.size) : fileContent.length,
        userEmail: userEmail || updated.appProperties?.userEmail || undefined,
      };
    } else {
      // Create new backup file in appDataFolder (POST)
      const newMetadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
        parents: ['appDataFolder'],
        description: userEmail ? `Backup for ${userEmail}` : undefined,
        appProperties: {
          userEmail: userEmail || '',
          backedUpAt: new Date().toISOString(),
        },
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(newMetadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        fileContent +
        closeDelim;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,description,appProperties',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'গুগল ড্রাইভে ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ হয়েছে');
      }

      const created = await res.json();
      return {
        exists: true,
        fileId: created.id,
        name: created.name,
        modifiedTime: created.modifiedTime || new Date().toISOString(),
        size: created.size ? Number(created.size) : fileContent.length,
        userEmail: userEmail || created.appProperties?.userEmail || undefined,
      };
    }
  } catch (err: any) {
    console.error('Google Drive backup error:', err);
    throw err;
  }
};

/**
 * Download & Restore AppData from Google Drive
 */
export const restoreFromDrive = async (
  accessToken: string,
  fileId: string
): Promise<{ data: AppData; backedUpAt?: string; userEmail?: string }> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'গুগল ড্রাইভ থেকে ফাইল নামানো সম্ভব হয়নি');
    }

    const parsed = await res.json();
    const appData: AppData = parsed.data || parsed;

    if (!appData || !Array.isArray(appData.accounts) || !Array.isArray(appData.transactions)) {
      throw new Error('গুগল ড্রাইভের ব্যাকআপ ফাইলটি অকার্যকর বা ক্ষতিগ্রস্ত');
    }

    return {
      data: appData,
      backedUpAt: parsed.backedUpAt,
      userEmail: parsed.userEmail,
    };
  } catch (err: any) {
    console.error('Google Drive restore error:', err);
    throw err;
  }
};
