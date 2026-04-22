/**
 * api/submissions.ts
 * ──────────────────
 * Dedicated API module for the work submission system.
 * Keeps submission logic isolated from projects.ts (single responsibility).
 */

import { api } from './auth';
import { supabase } from '../lib/supabaseClient';
import type { TaskSubmission } from '../types';

export interface SubmissionCreatePayload {
  content?: string;
  links?: string[];
  file_paths?: string[];
}

export interface SubmissionCreateResponse extends TaskSubmission {}

export const submissionsApi = {
  /**
   * Submit work for a task.
   * Backend: POST /api/v1/submissions/{taskId}/submit
   */
  async submit(taskId: string, payload: SubmissionCreatePayload): Promise<TaskSubmission> {
    const response = await api.post<TaskSubmission>(
      `/submissions/${taskId}/submit`,
      payload,
    );
    return response.data;
  },

  /**
   * Get all submissions for a task (newest first).
   * Backend: GET /api/v1/submissions/{taskId}/
   */
  async getForTask(taskId: string): Promise<TaskSubmission[]> {
    const response = await api.get<TaskSubmission[]>(`/submissions/${taskId}/`);
    return response.data;
  },

  /**
   * Upload a single image file to Supabase Storage.
   * Returns the public URL of the uploaded file.
   * Uses XHR for per-file upload progress tracking.
   */
  async uploadImage(
    file: File,
    taskId: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${taskId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const userToken = localStorage.getItem('token');

    if (onProgress) {
      // XHR path: real upload progress
      return await _uploadWithXHR(file, path, onProgress);
    }

    // Simple SDK path: add the Authorization header manually in the options
    const { error } = await supabase.storage
      .from('task-submissions')
      .upload(path, file, { 
        upsert: false,
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('task-submissions').getPublicUrl(path);
    return data.publicUrl;
  },
};

// ── Internal XHR helper ───────────────────────────────────────────────────────

async function _uploadWithXHR(
  file: File,
  path: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  const sb = supabase as any;
  const supabaseUrl: string = sb.supabaseUrl;
  const supabaseKey: string = sb.supabaseKey; // This is the anon key
  const userToken = localStorage.getItem('token'); // This is our app's JWT
  const uploadUrl = `${supabaseUrl}/storage/v1/object/task-submissions/${path}`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    
    // Auth: Use user token if available, otherwise fallback to anon key
    const authHeader = userToken ? `Bearer ${userToken}` : `Bearer ${supabaseKey}`;
    xhr.setRequestHeader('Authorization', authHeader);
    
    // Identified: We must also pass the apikey (anon key) for Supabase routing/identification
    xhr.setRequestHeader('apikey', supabaseKey);
    
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data } = supabase.storage.from('task-submissions').getPublicUrl(path);
        resolve(data.publicUrl);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 120_000;
    xhr.send(file);
  });
}

export default submissionsApi;
