import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useGlobalToast } from '@/src/shared/ui';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

type Options = {
  setImageUrl: (next: string) => void;
  setImageFileId?: (next: string) => void;
  recipeId?: string;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const TARGET_WIDTH = 1600;
const TARGET_QUALITY = 0.75;

export function useRecipeImagePicker({ setImageUrl, setImageFileId, recipeId }: Options) {
  const { showError } = useGlobalToast();
  const [isUploading, setIsUploading] = useState(false);

  const pickWebFile = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }, []);

  const pickImage = useCallback(async () => {
    try {
      if (isUploading) return;

      if (Platform.OS === 'web') {
        const file = await pickWebFile();
        if (!file) {
          return;
        }

        setIsUploading(true);
        if (file.size > MAX_UPLOAD_BYTES) {
          showError({
            kind: 'unknown',
            message: 'Image is too large. Please choose a smaller photo.',
          });
          return;
        }

        const formData = new FormData();
        const fileName = file.name || `recipe-${Date.now()}.jpg`;
        formData.append('file', file, fileName);
        const response = await recipesApi.uploadImage(formData, recipeId);
        setImageUrl(response.imageUrl);
        if (setImageFileId) {
          setImageFileId(response.imageFileId);
        }
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError({ kind: 'unknown', message: 'Photo access not granted.' });
        return;
      }

      let result: ImagePicker.ImagePickerResult;
      try {
        const mediaTypes =
          (ImagePicker as { MediaType?: { Images?: string } }).MediaType?.Images ??
          ImagePicker.MediaTypeOptions?.Images ??
          undefined;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes,
          allowsEditing: true,
          quality: 1,
        });
      } catch (_pickerErr) {
        showError({ kind: 'unknown', message: 'Could not open photo library.' });
        return;
      }

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setIsUploading(true);

      const asset = result.assets[0];
      let uploadUri = asset.uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: TARGET_WIDTH } }],
        { compress: TARGET_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );
      uploadUri = manipulated.uri;

      const formData = new FormData();
      const fileName = `recipe-${Date.now()}.jpg`;
      const info = await FileSystem.getInfoAsync(uploadUri);
      if (info.exists && typeof info.size === 'number' && info.size > MAX_UPLOAD_BYTES) {
        showError({
          kind: 'unknown',
          message: 'Image is too large after compression. Please choose a smaller photo.',
        });
        return;
      }
      formData.append('file', {
        uri: uploadUri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const response = await recipesApi.uploadImage(formData, recipeId);
      setImageUrl(response.imageUrl);
      if (setImageFileId) {
        setImageFileId(response.imageFileId);
      }
    } catch (err) {
      const apiErr = toApiError(err);
      const uiErr = mapCommonError(apiErr);
      const debugMessage =
        apiErr.kind === 'http'
          ? `Upload failed (${apiErr.status ?? 'unknown'}): ${apiErr.detail || apiErr.title || uiErr.message}`
          : uiErr.message;
      showError({ kind: uiErr.kind, message: debugMessage });
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, pickWebFile, recipeId, setImageFileId, setImageUrl, showError]);

  return { pickImage, isUploading };
}
