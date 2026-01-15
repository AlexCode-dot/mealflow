import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { X, ChevronDown, XCircle } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';
import { Button } from '@/src/shared/ui/Button';
import { PickerSheet } from '@/src/shared/ui/PickerSheet';
import { Chip } from '@/src/shared/ui/Chip';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { TextField } from '@/src/shared/ui/TextField';

export type FilterOption = {
  key: string;
  label: string;
};

export type FilterSection = {
  key: string;
  title: string;
  type: 'chips' | 'picker' | 'tags' | 'pickerRow';
  options?: FilterOption[];
  selectionMode?: 'single' | 'multi';
  placeholder?: string;
  layout?: 'row' | 'stack';
  items?: {
    key: string;
    title: string;
    placeholder?: string;
    options: FilterOption[];
    icon?: ReactNode;
  }[];
};

type PickerState = {
  key: string;
  title: string;
  placeholder?: string;
  options: FilterOption[];
};

type Props = {
  visible: boolean;
  title?: string;
  sections: FilterSection[];
  selection: Record<string, string[]>;
  onUpdateSelection: (sectionKey: string, next: string[]) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
};

export function FilterSheet({
  visible,
  title = 'Filters',
  sections,
  selection,
  onUpdateSelection,
  onClear,
  onApply,
  onClose,
}: Props) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [activePicker, setActivePicker] = useState<PickerState | null>(null);

  const selectedMap = useMemo(() => {
    return sections.reduce<Record<string, Set<string>>>((acc, section) => {
      acc[section.key] = new Set(selection[section.key] ?? []);
      return acc;
    }, {});
  }, [sections, selection]);

  const handleToggle = (section: FilterSection, optionKey: string) => {
    const selected = selectedMap[section.key] ?? new Set<string>();
    const next = new Set(selected);

    if (section.selectionMode === 'single') {
      if (selected.has(optionKey)) {
        next.clear();
      } else {
        next.clear();
        next.add(optionKey);
      }
    } else if (selected.has(optionKey)) {
      next.delete(optionKey);
    } else {
      next.add(optionKey);
    }

    onUpdateSelection(section.key, Array.from(next));
  };

  const handleAddTag = (section: FilterSection, rawInput?: string) => {
    const raw = (rawInput ?? tagInputs[section.key] ?? '').trim();
    if (!raw) return;

    const tags = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const selected = new Set(selection[section.key] ?? []);
    tags.forEach((t) => selected.add(t));

    onUpdateSelection(section.key, Array.from(selected));
    setTagInputs((prev) => ({ ...prev, [section.key]: '' }));
  };

  const handleTagChange = (section: FilterSection, text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',').map((part) => part.trim());
      const tail = parts.pop() ?? '';
      const nextTags = parts.filter(Boolean);

      if (nextTags.length) {
        const selected = new Set(selection[section.key] ?? []);
        nextTags.forEach((tag) => selected.add(tag));
        onUpdateSelection(section.key, Array.from(selected));
      }

      setTagInputs((prev) => ({ ...prev, [section.key]: tail }));
      return;
    }

    setTagInputs((prev) => ({ ...prev, [section.key]: text }));
  };

  const handleRemoveTag = (section: FilterSection, tag: string) => {
    const selected = new Set(selection[section.key] ?? []);
    selected.delete(tag);
    onUpdateSelection(section.key, Array.from(selected));
  };

  const resolvePickerLabel = (key: string, options: FilterOption[], placeholder?: string) => {
    const selected = selection[key]?.[0] ?? '';
    if (!selected) return placeholder ?? 'Any';
    return options.find((opt) => opt.key === selected)?.label ?? placeholder ?? 'Any';
  };

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.title}>{title}</Text>
        <Pressable style={styles.clearButton} onPress={onClear}>
          <XCircle color={theme.colors.primaryDark} size={20} strokeWidth={2.6} />
          <Text style={styles.clearLabel}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sections}>
        {sections.map((section) => {
          const selected = selectedMap[section.key] ?? new Set<string>();

          return (
            <View
              key={section.key}
              style={[
                styles.section,
                section.type === 'picker' && section.layout === 'row' ? styles.sectionInline : null,
              ]}
            >
              {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
              {section.type === 'chips' ? (
                <View style={[styles.options, section.layout === 'row' ? styles.optionsRow : null]}>
                  {(section.options ?? []).map((opt) =>
                    section.layout === 'row' ? (
                      <View key={opt.key} style={styles.optionCell}>
                        <Chip
                          label={opt.label}
                          variant="recipes"
                          size="compact"
                          style={styles.rowChip}
                          selected={selected.has(opt.key)}
                          onPress={() => handleToggle(section, opt.key)}
                        />
                      </View>
                    ) : (
                      <Chip
                        key={opt.key}
                        label={opt.label}
                        variant="recipes"
                        size="default"
                        selected={selected.has(opt.key)}
                        onPress={() => handleToggle(section, opt.key)}
                      />
                    ),
                  )}
                </View>
              ) : null}

              {section.type === 'picker' ? (
                <View
                  style={[styles.pickerWrap, section.layout === 'row' ? styles.pickerHalf : null]}
                >
                  <Pressable
                    style={styles.pickerButton}
                    onPress={() =>
                      setActivePicker({
                        key: section.key,
                        title: section.title,
                        placeholder: section.placeholder ?? 'Any',
                        options: section.options ?? [],
                      })
                    }
                  >
                    <Text style={styles.pickerValue}>
                      {resolvePickerLabel(section.key, section.options ?? [], section.placeholder)}
                    </Text>
                  </Pressable>
                  <ChevronDown
                    color={theme.colors.textMuted}
                    size={18}
                    strokeWidth={2.5}
                    style={styles.pickerChevron}
                  />
                </View>
              ) : null}

              {section.type === 'pickerRow' ? (
                <View style={styles.pickerRow}>
                  {(section.items ?? []).map((item) => (
                    <View key={item.key} style={styles.pickerItem}>
                      <View style={styles.pickerLabelRow}>
                        {item.icon ? <View style={styles.pickerIcon}>{item.icon}</View> : null}
                        <Text style={styles.pickerLabel}>{item.title}</Text>
                      </View>
                      <Pressable
                        style={styles.pickerWrap}
                        onPress={() =>
                          setActivePicker({
                            key: item.key,
                            title: item.title,
                            placeholder: item.placeholder ?? 'Any',
                            options: item.options,
                          })
                        }
                      >
                        <View style={styles.pickerButton}>
                          <Text style={styles.pickerValue}>
                            {resolvePickerLabel(item.key, item.options, item.placeholder)}
                          </Text>
                        </View>
                        <ChevronDown
                          color={theme.colors.textMuted}
                          size={18}
                          strokeWidth={2.5}
                          style={styles.pickerChevron}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {section.type === 'tags' ? (
                <View style={styles.tagsWrap}>
                  <View style={styles.tagInputRow}>
                    <TextField
                      value={tagInputs[section.key] ?? ''}
                      onChangeText={(text) => handleTagChange(section, text)}
                      placeholder={section.placeholder ?? 'Add ingredient'}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={() => handleAddTag(section)}
                      containerStyle={styles.tagInputField}
                    />
                  </View>
                  <View style={styles.tags}>
                    {(selection[section.key] ?? []).map((tag) => (
                      <Pressable
                        key={tag}
                        style={styles.tag}
                        onPress={() => handleRemoveTag(section, tag)}
                      >
                        <Text style={styles.tagLabel}>{tag}</Text>
                        <X color={theme.colors.primaryDark} size={14} strokeWidth={2.5} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Apply" variant="primary" onPress={onApply} />
      </View>

      <PickerSheet
        visible={!!activePicker}
        title={activePicker?.title ?? ''}
        onClose={() => setActivePicker(null)}
      >
        {activePicker ? (
          <Picker
            selectedValue={selection[activePicker.key]?.[0] ?? ''}
            onValueChange={(value) =>
              onUpdateSelection(activePicker.key, value ? [String(value)] : [])
            }
          >
            <Picker.Item label={activePicker.placeholder ?? 'Any'} value="" />
            {activePicker.options.map((opt) => (
              <Picker.Item key={opt.key} label={opt.label} value={opt.key} />
            ))}
          </Picker>
        ) : null}
      </PickerSheet>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s2,
  },
  headerSide: {
    width: 48,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  clearButton: {
    minWidth: 48,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: theme.radius.sm,
    gap: 2,
  },
  clearLabel: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  sections: {
    gap: theme.spacing.s4,
    paddingBottom: theme.spacing.s3,
    paddingTop: theme.spacing.s4,
  },
  section: {
    gap: theme.spacing.s2,
  },
  sectionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s3,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  optionsRow: {
    flexWrap: 'nowrap',
    width: '100%',
    justifyContent: 'space-between',
    gap: 6,
  },
  optionCell: {
    flex: 1,
    alignItems: 'center',
  },
  rowChip: {
    alignSelf: 'stretch',
    width: '100%',
    justifyContent: 'center',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  pickerButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingLeft: theme.spacing.s3,
    paddingRight: theme.spacing.s6,
  },
  pickerValue: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerHalf: {
    flex: 1,
  },
  pickerChevron: {
    position: 'absolute',
    right: theme.spacing.s2,
    top: '50%',
    marginTop: -9,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
  },
  pickerItem: {
    flex: 1,
    gap: theme.spacing.s1,
  },
  pickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  pickerIcon: {
    width: 20,
    alignItems: 'center',
  },
  pickerLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  picker: {
    height: 180,
  },
  tagsWrap: {
    gap: theme.spacing.s2,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  tagInputField: {
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  tagLabel: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    paddingTop: theme.spacing.s3,
    paddingBottom: theme.spacing.s4,
  },
});
