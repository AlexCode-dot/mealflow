import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
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
// A recipe can span several photos (ingredients on one, steps on another). Keep this in
// sync with the backend `app.extraction.max-image-count`.
const MAX_IMAGES = 5;

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
  startFromText: (transcript: string) => Promise<void>;
  startFromSearch: (query: string) => Promise<void>;
  reset: () => void;
};

function isTerminal(status: ExtractionStatus): boolean {
  return status === 'READY' || status === 'FAILED' || status === 'ACCEPTED';
}

export function useRecipeExtraction(): {
  state: RecipeExtractionState;
  actions: RecipeExtractionActions;
} {
  const { showError } = useGlobalToast();
  const { t, i18n } = useTranslation();
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
            setError(next.errorMessage || t('recipes.extractionFailedTryDifferent'));
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
      setError(t('recipes.extractionTakingTooLong'));
      setPhase('failed');
    }
  }, [t]);

  const startUpload = useCallback(
    async (formData: FormData) => {
      setError(null);
      setPhase('uploading');
      cancelledRef.current = false;
      try {
        // Send the user's active app language (auto-detected or manually overridden in Settings)
        // so the extracted recipe is translated to the same language as the rest of the UI.
        const created = await extractionApi.start(formData, i18n.language);
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
    [beginPolling, showError, i18n],
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

  const buildImagesFormData = useCallback(
    (images: { uri: string; name: string; type: string }[]): FormData => {
      const formData = new FormData();
      images.forEach((img) => {
        formData.append('file', {
          uri: img.uri,
          name: img.name,
          type: img.type,
        } as unknown as Blob);
      });
      return formData;
    },
    [],
  );

  const pickWebFiles = useCallback((accept: string, multiple: boolean): Promise<File[]> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
      input.click();
    });
  }, []);

  const startFromWeb = useCallback(
    async (kind: 'image' | 'video') => {
      const accept = kind === 'image' ? 'image/*' : 'video/*';
      const picked = await pickWebFiles(accept, kind === 'image');
      if (!picked.length) return;
      const files = kind === 'image' ? picked.slice(0, MAX_IMAGES) : picked.slice(0, 1);

      const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (files.some((f) => f.size > max)) {
        showError({
          kind: 'unknown',
          message: kind === 'image' ? t('recipes.imageTooLarge') : t('recipes.videoTooLarge'),
        });
        return;
      }
      const formData = new FormData();
      files.forEach((f, idx) => {
        formData.append('file', f, f.name || `recipe-${idx}.${kind === 'image' ? 'jpg' : 'mp4'}`);
      });
      await startUpload(formData);
    },
    [pickWebFiles, showError, startUpload, t],
  );

  const startFromImage = useCallback(async () => {
    if (Platform.OS === 'web') {
      await startFromWeb('image');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError({ kind: 'unknown', message: t('recipes.photoAccessNotGranted') });
      return;
    }

    const mediaTypes =
      (ImagePicker as { MediaType?: { Images?: string } }).MediaType?.Images ??
      ImagePicker.MediaTypeOptions?.Images ??
      undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
    });
    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets.slice(0, MAX_IMAGES);
    if (assets.some((a) => a.fileSize && a.fileSize > MAX_IMAGE_BYTES)) {
      showError({ kind: 'unknown', message: t('recipes.imageTooLarge') });
      return;
    }
    const images = assets.map((a, idx) => ({
      uri: a.uri,
      name: a.fileName ?? `recipe-${Date.now()}-${idx}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    }));
    const formData = buildImagesFormData(images);
    await startUpload(formData);
  }, [buildImagesFormData, showError, startFromWeb, startUpload, t]);

  const startFromVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      await startFromWeb('video');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError({ kind: 'unknown', message: t('recipes.photoAccessNotGranted') });
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
      showError({ kind: 'unknown', message: t('recipes.videoTooLarge') });
      return;
    }
    const fileName = asset.fileName ?? `recipe-${Date.now()}.mp4`;
    const mime = asset.mimeType ?? 'video/mp4';
    setVideoUri(asset.uri);
    setVideoDurationMs(typeof asset.duration === 'number' ? asset.duration : null);
    const formData = buildFormData(asset.uri, fileName, mime);
    await startUpload(formData);
  }, [buildFormData, showError, startFromWeb, startUpload, t]);

  const startFromText = useCallback(
    async (transcript: string) => {
      setError(null);
      // No upload phase — the transcript is tiny, so go straight to processing.
      setPhase('processing');
      cancelledRef.current = false;
      try {
        const created = await extractionApi.startText(transcript, i18n.language);
        if (cancelledRef.current) return;
        setJob(created);
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
    [beginPolling, i18n, showError],
  );

  const startFromSearch = useCallback(
    async (query: string) => {
      setError(null);
      setPhase('processing');
      cancelledRef.current = false;
      try {
        const created = await extractionApi.startSearch(query, i18n.language);
        if (cancelledRef.current) return;
        setJob(created);
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
    [beginPolling, i18n, showError],
  );

  const state = useMemo<RecipeExtractionState>(
    () => ({ phase, job, error, videoUri, videoDurationMs }),
    [phase, job, error, videoUri, videoDurationMs],
  );

  const actions = useMemo<RecipeExtractionActions>(
    () => ({
      startFromImage,
      startFromVideo,
      startFromText,
      startFromSearch,
      reset,
    }),
    [reset, startFromImage, startFromVideo, startFromText, startFromSearch],
  );

  return { state, actions };
}
