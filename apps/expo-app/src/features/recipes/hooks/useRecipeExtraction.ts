import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractionApi } from '@/src/features/recipes/api/extractionApi';
import type { ExtractionJob, ExtractionStatus } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useGlobalToast } from '@/src/shared/ui';

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90 * 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

type Phase = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';

export type RecipeExtractionState = {
  phase: Phase;
  job: ExtractionJob | null;
  error: string | null;
  /**
   * Local URI of the video the user picked. Stays around so the review screen can let the user
   * pick a custom thumbnail from the video on-device. Null for image extractions.
   */
  videoUri: string | null;
  videoDurationMs: number | null;
};

export type RecipeExtractionActions = {
  startFromImage: () => Promise<void>;
  startFromVideo: () => Promise<void>;
  reset: () => void;
};

function detectLocale(): string {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tag = Intl.DateTimeFormat().resolvedOptions().locale;
      if (tag) return tag;
    }
  } catch {
    // ignore
  }
  return 'en-US';
}

function isTerminal(status: ExtractionStatus): boolean {
  return status === 'READY' || status === 'FAILED' || status === 'ACCEPTED';
}

export function useRecipeExtraction(): {
  state: RecipeExtractionState;
  actions: RecipeExtractionActions;
} {
  const { showError } = useGlobalToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setPhase('idle');
    setJob(null);
    setError(null);
    setVideoUri(null);
    setVideoDurationMs(null);
  }, []);

  const beginPolling = useCallback(async (jobId: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    cancelledRef.current = false;
    while (!cancelledRef.current && Date.now() < deadline) {
      try {
        const next = await extractionApi.get(jobId);
        if (cancelledRef.current) return;
        setJob(next);
        if (isTerminal(next.status)) {
          setPhase(next.status === 'READY' ? 'ready' : 'failed');
          if (next.status === 'FAILED') {
            setError(next.errorMessage || 'Extraction failed. Try a different file.');
          }
          return;
        }
      } catch (err) {
        if (cancelledRef.current) return;
        const apiErr = toApiError(err);
        const uiErr = mapCommonError(apiErr);
        setError(uiErr.message);
        setPhase('failed');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    if (!cancelledRef.current) {
      setError('Extraction is taking too long. Please try again.');
      setPhase('failed');
    }
  }, []);

  const startUpload = useCallback(
    async (formData: FormData) => {
      setError(null);
      setPhase('uploading');
      cancelledRef.current = false;
      try {
        const created = await extractionApi.start(formData, detectLocale());
        if (cancelledRef.current) return;
        setJob(created);
        setPhase('processing');
        await beginPolling(created.jobId);
      } catch (err) {
        if (cancelledRef.current) return;
        const apiErr = toApiError(err);
        const uiErr = mapCommonError(apiErr);
        const message = apiErr.kind === 'http' && apiErr.detail ? apiErr.detail : uiErr.message;
        setError(message);
        setPhase('failed');
        showError({ kind: uiErr.kind, message });
      }
    },
    [beginPolling, showError],
  );

  const buildFormData = useCallback((uri: string, fileName: string, mimeType: string): FormData => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      // Caller passes a File-backed URI on web; let the caller handle web differently.
      // This branch is unused on web.
    }
    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    return formData;
  }, []);

  const pickWebFile = useCallback((accept: string): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }, []);

  const startFromWeb = useCallback(
    async (kind: 'image' | 'video') => {
      const accept = kind === 'image' ? 'image/*' : 'video/*';
      const file = await pickWebFile(accept);
      if (!file) return;

      const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > max) {
        const message =
          kind === 'image'
            ? 'Image is too large. Please choose a smaller photo.'
            : 'Video is too large (max 100 MB).';
        showError({ kind: 'unknown', message });
        return;
      }
      const formData = new FormData();
      formData.append('file', file, file.name || `recipe.${kind === 'image' ? 'jpg' : 'mp4'}`);
      await startUpload(formData);
    },
    [pickWebFile, showError, startUpload],
  );

  const startFromImage = useCallback(async () => {
    if (Platform.OS === 'web') {
      await startFromWeb('image');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError({ kind: 'unknown', message: 'Photo access not granted.' });
      return;
    }

    const mediaTypes =
      (ImagePicker as { MediaType?: { Images?: string } }).MediaType?.Images ??
      ImagePicker.MediaTypeOptions?.Images ??
      undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      showError({
        kind: 'unknown',
        message: 'Image is too large. Please choose a smaller photo.',
      });
      return;
    }
    const fileName = asset.fileName ?? `recipe-${Date.now()}.jpg`;
    const mime = asset.mimeType ?? 'image/jpeg';
    const formData = buildFormData(asset.uri, fileName, mime);
    await startUpload(formData);
  }, [buildFormData, showError, startFromWeb, startUpload]);

  const startFromVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      await startFromWeb('video');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError({ kind: 'unknown', message: 'Photo access not granted.' });
      return;
    }

    const mediaTypes =
      (ImagePicker as { MediaType?: { Videos?: string } }).MediaType?.Videos ??
      ImagePicker.MediaTypeOptions?.Videos ??
      undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      videoMaxDuration: 300,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
      showError({ kind: 'unknown', message: 'Video is too large (max 100 MB).' });
      return;
    }
    const fileName = asset.fileName ?? `recipe-${Date.now()}.mp4`;
    const mime = asset.mimeType ?? 'video/mp4';
    setVideoUri(asset.uri);
    setVideoDurationMs(typeof asset.duration === 'number' ? asset.duration : null);
    const formData = buildFormData(asset.uri, fileName, mime);
    await startUpload(formData);
  }, [buildFormData, showError, startFromWeb, startUpload]);

  const state = useMemo<RecipeExtractionState>(
    () => ({ phase, job, error, videoUri, videoDurationMs }),
    [phase, job, error, videoUri, videoDurationMs],
  );

  const actions = useMemo<RecipeExtractionActions>(
    () => ({
      startFromImage,
      startFromVideo,
      reset,
    }),
    [reset, startFromImage, startFromVideo],
  );

  return { state, actions };
}
