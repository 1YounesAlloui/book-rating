import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookDetailModal, Book, BookStatus } from '../components/BookDetailModal';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

// ─── Design tokens ────────────────────────────────────────────────
const GOLD    = '#c8a96e';
const BG      = '#0d0d10';
const SURFACE = '#111114';
const BORDER  = 'rgba(255, 255, 255, 0.07)';
const TEXT    = '#f0ede8';
const MUTED   = '#5a5a6a';

type TabType = 'TO_READ' | 'FINISHED' | 'FAVORITE';

const TABS = [
  {
    key: 'TO_READ'  as const,
    label: 'To Read',
    icon: 'bookmark'         as const,
    color: '#3b82f6',
    activeBg:     'rgba(59,  130, 246, 0.12)',
    activeBorder: 'rgba(59,  130, 246, 0.40)',
    emptyMsg: 'Books you want to read will appear here.',
  },
  {
    key: 'FINISHED' as const,
    label: 'Finished',
    icon: 'checkmark-circle' as const,
    color: '#10b981',
    activeBg:     'rgba(16,  185, 129, 0.12)',
    activeBorder: 'rgba(16,  185, 129, 0.40)',
    emptyMsg: "Books you've finished will show up here.",
  },
  {
    key: 'FAVORITE' as const,
    label: 'Favorites',
    icon: 'heart'            as const,
    color: '#ef4444',
    activeBg:     'rgba(239, 68,  68,  0.12)',
    activeBorder: 'rgba(239, 68,  68,  0.40)',
    emptyMsg: 'Books you love will appear here.',
  },
] as const;

// ─── Screen ───────────────────────────────────────────────────────
export default function LibraryScreen() {
  const [activeTab, setActiveTab]   = useState<TabType>('TO_READ');
  const [books, setBooks]           = useState<Book[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { fetchLibrary(); }, []);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BASE_URL}/books/user/`);
      if (res.status === 404) { setBooks([]); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(`Unable to load library (${err.message}).`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (
    bookId: string,
    newStatus: BookStatus,
    savedBook?: Book,
  ) => {
    // Optimistic update
    setBooks((prev) => {
      if (!newStatus) return prev.filter((b) => b.google_book_id !== bookId);
      return prev.map((b) =>
        b.google_book_id === bookId ? { ...(savedBook ?? b), status: newStatus } : b,
      );
    });
    if (selectedBook?.google_book_id === bookId) {
      setSelectedBook((prev) =>
        prev ? { ...(savedBook ?? prev), status: newStatus } : null,
      );
    }
    // Sync to backend
    try {
      const res = await fetch(`${BASE_URL}/books/${bookId}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      fetchLibrary(); // Roll back
    }
  };

  const formatAuthor = (authors?: string[] | string): string => {
    if (Array.isArray(authors) && authors.length > 0) return authors[0];
    if (typeof authors === 'string' && authors.trim()) return authors;
    return 'Unknown';
  };

  const filtered  = books.filter((b) => b.status === activeTab);
  const countFor  = (tab: TabType) => books.filter((b) => b.status === tab).length;
  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  const renderCard = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => { setSelectedBook(item); setModalVisible(true); }}
    >
      <View style={styles.cardCoverWrapper}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.cardCover} resizeMode="cover" />
        ) : (
          <View style={[styles.cardCover, styles.placeholderCover]}>
            <Ionicons name="book-outline" size={28} color="#2e2e36" />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardAuthor} numberOfLines={1}>{formatAuthor(item.authors)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count  = countFor(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                active && { backgroundColor: tab.activeBg, borderColor: tab.activeBorder },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={active ? tab.icon : (`${tab.icon}-outline` as any)}
                size={14}
                color={active ? tab.color : MUTED}
              />
              <Text style={[styles.tabLabel, active && { color: tab.color }]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    active && { backgroundColor: `${tab.color}28` },
                  ]}
                >
                  <Text style={[styles.tabBadgeText, active && { color: tab.color }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content states */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.stateText}>Loading your library…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={[styles.stateText, { color: TEXT }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLibrary}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name={`${activeConfig.icon}-outline` as any}
            size={52}
            color="#1e1e25"
          />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.stateText}>{activeConfig.emptyMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.google_book_id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchLibrary(); }}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        />
      )}

      <BookDetailModal
        visible={modalVisible}
        book={selectedBook}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 14 },

  // Tab switcher
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 0.2,
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
  },

  // Cards
  card: {
    width: '48%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardCoverWrapper: {
    width: '100%',
    height: 190,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  cardCover: { width: '100%', height: '100%' },
  placeholderCover: {
    backgroundColor: '#1a1a1f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginTop: 9,
    marginHorizontal: 10,
    marginBottom: 3,
    lineHeight: 18,
  },
  cardAuthor: { fontSize: 12, color: MUTED, marginHorizontal: 10, marginBottom: 10 },

  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stateText: { color: MUTED, marginTop: 10, textAlign: 'center', fontSize: 13 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT,
    marginTop: 14,
    marginBottom: 6,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 11,
    backgroundColor: GOLD,
    borderRadius: 10,
  },
  retryBtnText: { color: '#0d0d10', fontWeight: '700', fontSize: 14 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 14 },
});