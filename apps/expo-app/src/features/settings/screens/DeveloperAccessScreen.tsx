import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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

type ExpiryOption = { label: string; days: number | null };

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'Never', days: null },
];

export function DeveloperAccessScreen() {
  const styles = useThemedStyles(createStyles);
  const { show, showError } = useGlobalToast();

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
      show({ variant: 'success', message: 'Token copied to clipboard.' });
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
      show({ variant: 'success', message: 'Token revoked.' });
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
        title="Developer access"
        scroll
        showBack
        onBack={() => router.back()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.intro}>
          <Text style={styles.introTitle}>API tokens</Text>
          <Text style={styles.introBody}>
            Generate a long-lived token to let a trusted third-party app read or write your recipes.
          </Text>
          <Button title="Generate API token" variant="primary" onPress={openCreate} />
        </Card>

        <Text style={styles.sectionHeader}>Your tokens</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : tokens.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>You haven&apos;t generated any tokens yet.</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {tokens.map((t) => (
              <TokenRow key={t.id} token={t} onRevoke={() => askRevoke(t)} styles={styles} />
            ))}
          </View>
        )}
      </Screen>

      <FormSheet
        visible={createOpen}
        title={createdToken ? 'Token created' : 'Generate API token'}
        onClose={closeCreate}
      >
        {createdToken ? (
          <View style={styles.modalBody}>
            <Text style={styles.warningText}>
              This is the only time we&apos;ll show this token. Save it now or generate a new one.
            </Text>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} selectable>
                {createdToken.token}
              </Text>
            </View>
            <Text style={styles.helper}>
              Scopes: {createdToken.scopes.join(', ')}
              {createdToken.expiresAt
                ? ` • Expires ${new Date(createdToken.expiresAt).toLocaleDateString()}`
                : ' • Never expires'}
            </Text>
            <Button
              title="Copy token"
              variant="primary"
              onPress={() => copyToken(createdToken.token)}
            />
            <Button title="Done" variant="secondary" onPress={closeCreate} />
          </View>
        ) : (
          <View style={styles.modalBody}>
            <Text style={styles.label}>Token name</Text>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="e.g. second-brain-ai"
              maxLength={80}
            />

            <Text style={styles.label}>Permissions</Text>
            <ScopeToggle
              label="Read recipes"
              description="GET /api/recipes"
              checked={canRead}
              onToggle={() => setCanRead((v) => !v)}
              styles={styles}
            />
            <ScopeToggle
              label="Write recipes"
              description="Create, update, delete recipes"
              checked={canWrite}
              onToggle={() => setCanWrite((v) => !v)}
              styles={styles}
            />

            <Text style={styles.label}>Expires in</Text>
            <View style={styles.optionRow}>
              {EXPIRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setExpiry(opt)}
                  style={[
                    styles.optionChip,
                    expiry.label === opt.label ? styles.optionChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      expiry.label === opt.label ? styles.optionChipTextActive : null,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {expiry.days === null ? (
              <Text style={styles.helper}>
                Tokens that never expire stay valid until you revoke them. Pick a finite expiry when
                possible.
              </Text>
            ) : null}

            <Button
              title={isCreating ? 'Generating…' : 'Generate token'}
              variant="primary"
              onPress={submitCreate}
              disabled={!name.trim() || selectedScopes.length === 0 || isCreating}
            />
          </View>
        )}
      </FormSheet>

      <ConfirmSheet
        visible={revokeTarget !== null}
        title="Revoke this token?"
        description={
          revokeTarget
            ? `"${revokeTarget.name}" will stop working immediately for any app using it.`
            : ''
        }
        confirmLabel={isRevoking ? 'Revoking…' : 'Revoke token'}
        confirmVariant="danger"
        disabled={isRevoking}
        cancelLabel="Cancel"
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
}: {
  token: IntegrationTokenSummary;
  onRevoke: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const now = Date.now();
  const isRevoked = token.revokedAt !== null;
  const isExpired = token.expiresAt !== null && new Date(token.expiresAt).getTime() < now;
  const inactive = isRevoked || isExpired;

  const lastUsed = token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'never';
  const created = new Date(token.createdAt).toLocaleDateString();
  const expiry = token.expiresAt
    ? `Expires ${new Date(token.expiresAt).toLocaleDateString()}`
    : 'Never expires';

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
        {token.scopes.join(', ') || 'no scopes'} • {expiry}
      </Text>
      <Text style={styles.tokenMeta}>
        Created {created} • Last used {lastUsed}
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
