import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PickerSelect, PickerSheet } from '@/src/shared/ui/PickerSheet/PickerSheet';
import { Check, ChevronDown, X, XCircle } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { BottomActionBar, resolveBottomActionBarColor } from '@/src/shared/ui/BottomActionBar';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { Chip } from '@/src/shared/ui/Chip';
import { useKeyboardInset } from '@/src/shared/hooks/useKeyboardInset';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { useScrollToFocusedInput } from '@/src/shared/hooks/useScrollToFocusedInput';
import { InlineAddField } from '@/src/shared/ui/InlineAddField';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { SegmentedTabs } from '@/src/shared/ui/SegmentedTabs';

export type FilterOption = {
  key: string;
  label: string;
};

export type FilterSection = {
  key: string;
  title: string;
  type: 'chips' | 'picker' | 'tags' | 'pickerRow' | 'segmented';
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
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [activePicker, setActivePicker] = useState<PickerState | null>(null);
  const isKeyboardOpen = useKeyboardOpen();
  const keyboardInset = useKeyboardInset();
  const [focusedTagSectionKey, setFocusedTagSectionKey] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const tagInputRefs = useRef<Record<string, TextInput | null>>({});
  const actionColor = resolveBottomActionBarColor(theme);
  const scrollToFocusedInput = useScrollToFocusedInput(scrollRef, 12);
  useEffect(() => {
    if (!isKeyboardOpen) {
      setFocusedTagSectionKey(null);
    }
  }, [isKeyboardOpen]);

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
  const focusedTagIndex = focusedTagSectionKey
    ? sections.findIndex((candidate) => candidate.key === focusedTagSectionKey)
    : -1;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      dismissKeyboardOnBackdropTap
      onBackdropPress={activePicker ? () => setActivePicker(null) : undefined}
      avoidKeyboard={false}
      sheetStyle={styles.sheet}
      sheetInnerStyle={styles.sheetInner}
    >
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.sections,
          { paddingBottom: theme.spacing.s3 + (keyboardInset > 0 ? keyboardInset : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section, index) => {
          const selected = selectedMap[section.key] ?? new Set<string>();
          const segmentedDefault = section.options?.[0]?.key ?? '';
          const segmentedValue = selection[section.key]?.[0] ?? segmentedDefault;
          const hideSectionBelowFocusedTag =
            isKeyboardOpen && focusedTagIndex !== -1 && index > focusedTagIndex;

          if (hideSectionBelowFocusedTag) {
            return null;
          }

          return (
            <View
              key={section.key}
              style={[
                styles.section,
                section.type === 'picker' && section.layout === 'row' ? styles.sectionInline : null,
              ]}
            >
              {section.title && section.type !== 'segmented' ? (
                <Text style={styles.sectionTitle}>{section.title}</Text>
              ) : null}
              {section.type === 'segmented' && section.options ? (
                <SegmentedTabs
                  tabs={section.options.map((opt) => ({ key: opt.key, label: opt.label }))}
                  value={segmentedValue}
                  onChange={(key) => onUpdateSelection(section.key, [key])}
                />
              ) : null}
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
                  <InlineTagAddField
                    inputRef={(value) => {
                      tagInputRefs.current[section.key] = value;
                    }}
                    value={tagInputs[section.key] ?? ''}
                    onChangeText={(text) => handleTagChange(section, text)}
                    placeholder={section.placeholder ?? t('recipes.addIngredient')}
                    onAdd={() => handleAddTag(section)}
                    onFocus={() => {
                      setFocusedTagSectionKey(section.key);
                      const inputRef = {
                        get current() {
                          return tagInputRefs.current[section.key] ?? null;
                        },
                      };
                      scrollToFocusedInput(inputRef, 12);
                    }}
                    onBlur={() =>
                      setFocusedTagSectionKey((current) =>
                        current === section.key ? null : current,
                      )
                    }
                  />
                  {!isKeyboardOpen ? (
                    <View style={styles.tags}>
                      {(selection[section.key] ?? []).map((tag) => (
                        <Pressable
                          key={tag}
                          style={styles.tag}
                          onPress={() => handleRemoveTag(section, tag)}
                        >
                          <View style={styles.tagLeft}>
                            <View style={styles.tagCheck}>
                              <Check color={theme.colors.primaryDark} size={14} strokeWidth={2.4} />
                            </View>
                            <Text style={styles.tagLabel}>{tag}</Text>
                          </View>
                          <View style={styles.tagRemove}>
                            <X color={theme.colors.primaryDark} size={14} strokeWidth={2.5} />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {!isKeyboardOpen ? (
        <View style={styles.footerBleed}>
          <BottomActionBar
            items={[
              {
                key: 'clear',
                label: t('recipes.clearFilters'),
                icon: <XCircle color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
                onPress: onClear,
              },
              {
                key: 'apply',
                label: t('common.apply'),
                icon: <Check color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
                onPress: onApply,
              },
            ]}
          />
        </View>
      ) : null}

      <PickerSheet
        visible={!!activePicker}
        title={activePicker?.title ?? ''}
        onClose={() => setActivePicker(null)}
      >
        {activePicker ? (
          <PickerSelect
            value={selection[activePicker.key]?.[0] ?? ''}
            onChange={(value) => onUpdateSelection(activePicker.key, value ? [value] : [])}
            options={activePicker.options.map((opt) => ({ label: opt.label, value: opt.key }))}
            placeholder={activePicker.placeholder ?? 'Any'}
          />
        ) : null}
      </PickerSheet>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.s2,
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
    sheet: {
      paddingBottom: 0,
      borderBottomWidth: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    sheetInner: {
      transform: [{ translateY: 0 }],
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
    tags: {
      gap: theme.spacing.s2,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 10,
    },
    tagLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
      flex: 1,
    },
    tagCheck: {
      height: 22,
      width: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primaryDark,
    },
    tagLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    tagRemove: {
      height: 22,
      width: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    footerBleed: {
      marginHorizontal: -theme.spacing.s4,
      marginBottom: 0,
      marginTop: 0,
    },
  });

type InlineTagAddFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

function InlineTagAddField({
  value,
  onChangeText,
  onAdd,
  placeholder,
  onFocus,
  onBlur,
}: InlineTagAddFieldProps) {
  return (
    <InlineAddField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      onAdd={onAdd}
      onFocus={onFocus}
      onBlur={onBlur}
      autoCapitalize="none"
      returnKeyType="go"
    />
  );
}
