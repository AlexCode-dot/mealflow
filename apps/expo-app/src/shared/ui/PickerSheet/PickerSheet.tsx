import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button } from '@/src/shared/ui/Button/Button';
import { ModalSheet } from '@/src/shared/ui/ModalSheet/ModalSheet';
import { theme } from '@/src/shared/theme/theme';
import { isWeb, WEB } from '@/src/shared/ui/webStyles';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone?: () => void;
  children: ReactNode;
  doneLabel?: string;
};

type ContentProps = {
  title: string;
  onClose: () => void;
  onDone?: () => void;
  children: ReactNode;
  doneLabel?: string;
};

export function PickerSheetContent({
  title,
  onClose,
  onDone,
  children,
  doneLabel = 'Done',
}: ContentProps) {
  const handleDone = onDone ?? onClose;

  return (
    <View style={[styles.root, isWeb && styles.rootWeb]}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.pickerWrap, isWeb && styles.pickerWrapWeb]}>{children}</View>
      <Button
        title={doneLabel}
        onPress={handleDone}
        variant="primary"
        containerStyle={styles.button}
      />
    </View>
  );
}

export function PickerSheetOverlay({
  title,
  onClose,
  onDone,
  children,
  doneLabel = 'Done',
}: ContentProps) {
  const sheet = (
    <View style={[styles.overlaySheet, isWeb && styles.overlaySheetWeb]}>
      <View style={styles.handle} />
      <PickerSheetContent title={title} onClose={onClose} onDone={onDone} doneLabel={doneLabel}>
        {children}
      </PickerSheetContent>
    </View>
  );

  if (!isWeb) {
    return sheet;
  }

  return <View style={styles.overlaySheetWebWrap}>{sheet}</View>;
}

export function PickerSheet({
  visible,
  title,
  onClose,
  onDone,
  children,
  doneLabel = 'Done',
}: Props) {
  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <PickerSheetContent title={title} onClose={onClose} onDone={onDone} doneLabel={doneLabel}>
        {children}
      </PickerSheetContent>
    </ModalSheet>
  );
}

export type PickerOption = {
  label: string;
  value: string;
};

type PickerSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
};

export function PickerSelect({ value, onChange, options, placeholder }: PickerSelectProps) {
  if (!isWeb) {
    return (
      <Picker selectedValue={value} onValueChange={(next) => onChange(String(next))}>
        {placeholder ? <Picker.Item label={placeholder} value="" /> : null}
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    );
  }

  return (
    <View style={styles.webListWrap}>
      <ScrollView style={styles.webList} contentContainerStyle={styles.webListContent}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.webItem,
                selected && styles.webItemActive,
                pressed && styles.webItemPressed,
              ]}
            >
              <Text style={[styles.webItemText, selected && styles.webItemTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing.s2,
    paddingTop: theme.spacing.s2,
  },
  rootWeb: {
    paddingHorizontal: theme.spacing.s3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.s1,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  pickerWrapWeb: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: WEB.pickerListMaxWidth,
  },
  button: {
    borderRadius: theme.radius.pill,
    minHeight: 50,
  },
  overlaySheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  overlaySheetWeb: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: WEB.modalSheetMaxWidth,
    borderRadius: 24,
  },
  overlaySheetWebWrap: {
    width: '100%',
    alignItems: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.borderNeutral,
    marginTop: 0,
    marginBottom: theme.spacing.s3,
  },
  webList: {
    maxHeight: 280,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    width: '100%',
  },
  webListContent: {
    paddingVertical: theme.spacing.s2,
  },
  webItem: {
    paddingVertical: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s4,
  },
  webItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  webItemPressed: {
    opacity: 0.7,
  },
  webItemText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  webItemTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  webListWrap: {
    gap: theme.spacing.s2,
    alignItems: 'center',
    width: '100%',
  },
});
