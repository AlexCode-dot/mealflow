import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FileText, Mail, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Card, Screen, useGlobalToast } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type LegalConfig = {
  privacyUrl?: string;
  termsUrl?: string;
  accountDeletionUrl?: string;
};

type SupportConfig = {
  email?: string;
};

export function LegalScreen() {
  const styles = useThemedStyles(createStyles);
  const { showValidationError, show } = useGlobalToast();
  const { t } = useTranslation();
  const legal = Constants.expoConfig?.extra?.legal as LegalConfig | undefined;
  const support = Constants.expoConfig?.extra?.support as SupportConfig | undefined;
  const appVersion = Constants.expoConfig?.version ?? Constants.expoConfig?.sdkVersion ?? '0.1';

  const openUrl = async (url?: string) => {
    if (!url) {
      showValidationError(t('errors.linkNotConfigured'));
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showValidationError(t('errors.unableToOpenLink'));
      return;
    }
    await Linking.openURL(url);
  };

  const openEmail = async (email?: string) => {
    if (!email) {
      showValidationError(t('errors.supportEmailNotConfigured'));
      return;
    }
    const url = `mailto:${email}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      await Clipboard.setStringAsync(email);
      show({ variant: 'success', message: t('errors.supportEmailCopied') });
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <Screen title={t('legal.title')} scroll showBack onBack={() => router.back()}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('legal.appName')}</Text>
          <Text style={styles.sectionSubtitle}>{t('common.version', { version: appVersion })}</Text>
          <Text style={styles.sectionText}>{t('legal.thankYou')}</Text>
        </Card>

        <Card style={styles.card} variant="premium">
          <Text style={styles.sectionTitle}>{t('legal.legal')}</Text>
          <View style={styles.divider} />
          <LegalRow
            label={t('legal.privacyPolicy')}
            onPress={() => openUrl(legal?.privacyUrl)}
            icon={<ShieldCheck size={20} color="#0F9D58" strokeWidth={2.4} />}
            iconBg="#E3F7EB"
          />
          <LegalRow
            label={t('legal.termsOfService')}
            onPress={() => openUrl(legal?.termsUrl)}
            icon={<FileText size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
          />
          <LegalRow
            label={t('legal.accountDeletionRequest')}
            onPress={() => openUrl(legal?.accountDeletionUrl)}
            icon={<Trash2 size={20} color="#C62828" strokeWidth={2.4} />}
            iconBg="#FBE9E7"
          />
        </Card>

        <Card style={styles.card} variant="premium">
          <Text style={styles.sectionTitle}>{t('legal.support')}</Text>
          <View style={styles.divider} />
          <LegalRow
            label={support?.email ?? t('legal.supportEmail')}
            onPress={() => openEmail(support?.email)}
            icon={<Mail size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
          />
        </Card>
      </Screen>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    card: {
      gap: theme.spacing.s3,
      padding: theme.spacing.s5,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    sectionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.dividerSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
  });

function LegalRow({
  label,
  icon,
  iconBg,
  onPress,
}: {
  label: string;
  icon: JSX.Element;
  iconBg: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={styles.rowText}>{label}</Text>
        <ChevronRight size={20} color={theme.colors.textMuted} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}
