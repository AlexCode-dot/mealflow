import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, KeyRound, Trash2 } from 'lucide-react-native';
import {
  Button,
  Card,
  ConfirmSheet,
  FormSheet,
  Screen,
  TextField,
  useGlobalToast,
} from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { toApiError } from '@/src/core/http/toApiError';
import {
  integrationTokensApi,
  type IntegrationScope,
  type IntegrationTokenSummary,
  type IssuedIntegrationToken,
} from '@/src/features/settings/api/integrationTokensApi';

type ExpiryOption = { labelKey: string; days: number | null };

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { labelKey: 'developer.expiry30Days', days: 30 },
  { labelKey: 'developer.expiry90Days', days: 90 },
  { labelKey: 'developer.expiry1Year', days: 365 },
  { labelKey: 'developer.expiryNever', days: null },
];

export function DeveloperAccessScreen() {
  const styles = useThemedStyles(createStyles);
  const { show, showError } = useGlobalToast();
  const { t } = useTranslation();

  const [tokens, setTokens] = useState<IntegrationTokenSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(true);
  const [expiry, setExpiry] = useState<ExpiryOption>(EXPIRY_OPTIONS[2]); // 1 year default
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<IssuedIntegrationToken | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<IntegrationTokenSummary | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await integrationTokensApi.list();
      setTokens(list);
    } catch (err) {
      showError(mapCommonError(toApiError(err)), { onRetry: load });
    }
  }, [showError]);

  useEffect(() => {
    setIsLoading(true);
    void load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const openCreate = useCallback(() => {
    setName('');
    setCanRead(true);
    setCanWrite(true);
    setExpiry(EXPIRY_OPTIONS[2]);
    setCreatedToken(null);
    setCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setName('');
    setCreatedToken(null);
  }, []);

  const selectedScopes = useMemo<IntegrationScope[]>(() => {
    const result: IntegrationScope[] = [];
    if (canRead) result.push('recipes:read');
    if (canWrite) result.push('recipes:write');
    return result;
  }, [canRead, canWrite]);

  const submitCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating || selectedScopes.length === 0) return;
    setIsCreating(true);
    try {
      const issued = await integrationTokensApi.create({
        name: trimmed,
        scopes: selectedScopes,
        expiresInDays: expiry.days,
      });
      setCreatedToken(issued);
      await load();
    } catch (err) {
      showError(mapCommonError(toApiError(err)));
    } finally {
      setIsCreating(false);
    }
  }, [expiry.days, isCreating, load, name, selectedScopes, showError]);

  const copyToken = useCallback(
    async (token: string) => {
      await Clipboard.setStringAsync(token);
      show({ variant: 'success', message: t('developer.tokenCopied') });
    },
    [show],
  );

  const askRevoke = useCallback((t: IntegrationTokenSummary) => setRevokeTarget(t), []);
  const cancelRevoke = useCallback(() => setRevokeTarget(null), []);

  const confirmRevoke = useCallback(async () => {
    if (!revokeTarget || isRevoking) return;
    setIsRevoking(true);
    try {
      await integrationTokensApi.revoke(revokeTarget.id);
      show({ variant: 'success', message: t('developer.tokenRevoked') });
      setRevokeTarget(null);
      await load();
    } catch (err) {
      showError(mapCommonError(toApiError(err)));
    } finally {
      setIsRevoking(false);
    }
  }, [isRevoking, load, revokeTarget, show, showError]);

  return (
    <View style={styles.root}>
      <Screen
        title={t('developer.title')}
        scroll
        showBack
        onBack={() => router.back()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.intro}>
          <Text style={styles.introTitle}>{t('developer.apiTokensTitle')}</Text>
          <Text style={styles.introBody}>{t('developer.apiTokensBody')}</Text>
          <Button title={t('developer.generateToken')} variant="primary" onPress={openCreate} />
        </Card>

        <Text style={styles.sectionHeader}>{t('developer.yourTokens')}</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : tokens.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('developer.noTokensYet')}</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {tokens.map((tok) => (
              <TokenRow key={tok.id} token={tok} onRevoke={() => askRevoke(tok)} styles={styles} t={t} />
            ))}
          </View>
        )}
      </Screen>

      <FormSheet
        visible={createOpen}
        title={createdToken ? t('developer.tokenCreated') : t('developer.generateToken')}
        onClose={closeCreate}
      >
        {createdToken ? (
          <View style={styles.modalBody}>
            <Text style={styles.warningText}>{t('developer.tokenWarning')}</Text>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} selectable>
                {createdToken.token}
              </Text>
            </View>
            <Text style={styles.helper}>
              {t('developer.scopesLabel', { scopes: createdToken.scopes.join(', ') })}
              {createdToken.expiresAt
                ? ` • ${t('developer.expiresLabel', { date: new Date(createdToken.expiresAt).toLocaleDateString() })}`
                : ` • ${t('developer.neverExpires')}`}
            </Text>
            <Button
              title={t('developer.copyToken')}
              variant="primary"
              onPress={() => copyToken(createdToken.token)}
            />
            <Button title={t('common.done')} variant="secondary" onPress={closeCreate} />
          </View>
        ) : (
          <View style={styles.modalBody}>
            <Text style={styles.label}>{t('developer.tokenName')}</Text>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder={t('developer.tokenNamePlaceholder')}
              maxLength={80}
            />

            <Text style={styles.label}>{t('developer.permissions')}</Text>
            <ScopeToggle
              label={t('developer.readRecipes')}
              description={t('developer.readRecipesDesc')}
              checked={canRead}
              onToggle={() => setCanRead((v) => !v)}
              styles={styles}
            />
            <ScopeToggle
              label={t('developer.writeRecipes')}
              description={t('developer.writeRecipesDesc')}
              checked={canWrite}
              onToggle={() => setCanWrite((v) => !v)}
              styles={styles}
            />

            <Text style={styles.label}>{t('developer.expiresIn')}</Text>
            <View style={styles.optionRow}>
              {EXPIRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.labelKey}
                  onPress={() => setExpiry(opt)}
                  style={[
                    styles.optionChip,
                    expiry.labelKey === opt.labelKey ? styles.optionChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      expiry.labelKey === opt.labelKey ? styles.optionChipTextActive : null,
                    ]}
                  >
                    {t(opt.labelKey as Parameters<typeof t>[0])}
                  </Text>
                </Pressable>
              ))}
            </View>
            {expiry.days === null ? (
              <Text style={styles.helper}>{t('developer.neverExpiresHint')}</Text>
            ) : null}

            <Button
              title={isCreating ? t('developer.generating') : t('developer.generateTokenBtn')}
              variant="primary"
              onPress={submitCreate}
              disabled={!name.trim() || selectedScopes.length === 0 || isCreating}
            />
          </View>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={revokeTarget !== null}
        title={t('developer.revokeTitle')}
        description={
          revokeTarget
            ? t('developer.revokeDescription', { name: revokeTarget.name })
            : ''
        }
        confirmLabel={isRevoking ? t('developer.revoking') : t('developer.revokeToken')}
        confirmVariant="danger"
        disabled={isRevoking}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmRevoke}
        onCancel={cancelRevoke}
      />
    </View>
  );
}

function ScopeToggle({
  label,
  description,
  checked,
  onToggle,
  styles,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.scopeRow}>
      <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
        {checked ? <Check size={14} strokeWidth={3} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.scopeLabel}>{label}</Text>
        <Text style={styles.scopeDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function TokenRow({
  token,
  onRevoke,
  styles,
  t,
}: {
  token: IntegrationTokenSummary;
  onRevoke: () => void;
  styles: ReturnType<typeof createStyles>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const now = Date.now();
  const isRevoked = token.revokedAt !== null;
  const isExpired = token.expiresAt !== null && new Date(token.expiresAt).getTime() < now;
  const inactive = isRevoked || isExpired;

  const lastUsedText = token.lastUsedAt
    ? t('developer.lastUsed', { date: new Date(token.lastUsedAt).toLocaleString() })
    : t('developer.lastUsedNever');
  const created = t('developer.created', { date: new Date(token.createdAt).toLocaleDateString() });
  const expiry = token.expiresAt
    ? t('developer.expiresLabel', { date: new Date(token.expiresAt).toLocaleDateString() })
    : t('developer.neverExpires');

  let statusSuffix = '';
  if (isRevoked) statusSuffix = ' (revoked)';
  else if (isExpired) statusSuffix = ' (expired)';

  return (
    <Card style={[styles.tokenCard, inactive ? styles.tokenCardRevoked : null]}>
      <View style={styles.tokenHeader}>
        <View style={styles.tokenIcon}>
          <KeyRound size={20} strokeWidth={2.4} />
        </View>
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenName}>
            {token.name}
            {statusSuffix}
          </Text>
          <Text style={styles.tokenPreview}>{token.tokenPreview}…</Text>
        </View>
        {!isRevoked ? (
          <Pressable onPress={onRevoke} hitSlop={10} style={styles.revokeBtn}>
            <Trash2 size={18} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.tokenMeta}>
        {token.scopes.join(', ') || t('developer.noScopes')} • {expiry}
      </Text>
      <Text style={styles.tokenMeta}>
        {created} • {lastUsedText}
      </Text>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    intro: { gap: theme.spacing.s3, padding: theme.spacing.s5 },
    introTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    introBody: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted, lineHeight: 20 },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1.6,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      marginTop: theme.spacing.s4,
      marginBottom: theme.spacing.s2,
    },
    list: { gap: theme.spacing.s3 },
    emptyCard: { padding: theme.spacing.s5 },
    emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
    tokenCard: { padding: theme.spacing.s4, gap: theme.spacing.s2 },
    tokenCardRevoked: { opacity: 0.6 },
    tokenHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
    tokenIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgLight,
    },
    tokenInfo: { flex: 1, gap: 2 },
    tokenName: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
    tokenPreview: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      fontFamily: 'monospace',
    },
    tokenMeta: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    revokeBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.errorBg,
    },
    modalBody: { gap: theme.spacing.s3, paddingVertical: theme.spacing.s2 },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: theme.spacing.s2,
    },
    helper: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, lineHeight: 16 },
    warningText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.error,
      lineHeight: 18,
    },
    tokenBox: {
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      padding: theme.spacing.s3,
    },
    tokenText: { fontFamily: 'monospace', fontSize: 13, color: theme.colors.text },
    scopeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.borderNeutral,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    scopeLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    scopeDescription: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    optionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.s2,
    },
    optionChip: {
      paddingVertical: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s3,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.surface,
    },
    optionChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
    optionChipTextActive: { color: theme.colors.textOnPrimary },
  });
