import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Link2, Trash2 } from 'lucide-react-native';
import { Card, ConfirmSheet, Screen, useGlobalToast } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { toApiError } from '@/src/core/http/toApiError';
import { connectionsApi, type Connection } from '@/src/features/settings/api/connectionsApi';

/** Apps connected to the user's MealFlow account (OAuth), with "remove access". */
export function ConnectedAppsScreen() {
  const styles = useThemedStyles(createStyles);
  const { show, showError } = useGlobalToast();
  const { t } = useTranslation();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Connection | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async () => {
    try {
      setConnections(await connectionsApi.list());
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

  const confirmRemove = useCallback(async () => {
    if (!removeTarget || isRemoving) return;
    setIsRemoving(true);
    try {
      await connectionsApi.revoke(removeTarget.clientId);
      show({ variant: 'success', message: t('connections.removed') });
      setRemoveTarget(null);
      await load();
    } catch (err) {
      showError(mapCommonError(toApiError(err)));
    } finally {
      setIsRemoving(false);
    }
  }, [isRemoving, load, removeTarget, show, showError, t]);

  return (
    <View style={styles.root}>
      <Screen
        title={t('connections.title')}
        scroll
        showBack
        onBack={() => router.back()}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.intro}>
          <Text style={styles.introTitle}>{t('connections.introTitle')}</Text>
          <Text style={styles.introBody}>{t('connections.introBody')}</Text>
        </Card>

        {isLoading ? (
          <ActivityIndicator />
        ) : connections.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('connections.empty')}</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {connections.map((c) => (
              <Card key={c.clientId} style={styles.card}>
                <View style={styles.header}>
                  <View style={styles.icon}>
                    <Link2 size={20} strokeWidth={2.4} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.meta}>
                      {t('connections.connectedSince', {
                        date: new Date(c.connectedAt).toLocaleDateString(),
                      })}
                      {c.lastActiveAt
                        ? ` • ${t('connections.lastActive', { date: new Date(c.lastActiveAt).toLocaleDateString() })}`
                        : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setRemoveTarget(c)}
                    hitSlop={10}
                    style={styles.removeBtn}
                    accessibilityLabel={t('connections.removeAccess')}
                  >
                    <Trash2 size={18} strokeWidth={2.4} />
                  </Pressable>
                </View>
                {c.scopes.map((scope) => (
                  <Text key={scope} style={styles.scope}>
                    • {t(`connections.scopes.${scope}`)}
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        )}
      </Screen>

      <ConfirmSheet
        visible={removeTarget !== null}
        title={t('connections.removeTitle')}
        description={removeTarget ? t('connections.removeDescription', { name: removeTarget.name }) : ''}
        confirmLabel={isRemoving ? t('connections.removing') : t('connections.removeAccess')}
        confirmVariant="danger"
        disabled={isRemoving}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    intro: { gap: theme.spacing.s3, padding: theme.spacing.s5, marginBottom: theme.spacing.s4 },
    introTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    introBody: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted, lineHeight: 20 },
    list: { gap: theme.spacing.s3 },
    emptyCard: { padding: theme.spacing.s5 },
    emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
    card: { padding: theme.spacing.s4, gap: theme.spacing.s2 },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgLight,
    },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
    meta: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    scope: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    removeBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.errorBg,
    },
  });
