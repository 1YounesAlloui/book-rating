import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  FlatList,
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

const CARD_WIDTH = 124;
const CARD_GAP = 12;

interface HomeFeed {
  trending: Book[];
  recommended: Book[];
  genres: Record<string, Book[]>;
}

// ─── Curated High-Quality Fallbacks ───────────────────────────────
const CURATED_FALLBACK_HERO: Book = {
  google_book_id: 'hero_meditations',
  title: 'Meditations',
  authors: 'Marcus Aurelius',
  thumbnail: 'https://books.google.com/books/content?id=9-8-AAAAIAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
  description: 'Timeless stoic wisdom from the Roman Emperor on ethics, duty, and human nature.',
  status: null,
};

const STATUS_CONFIG = {
  TO_READ:  { icon: 'bookmark'         as const, color: '#3b82f6' },
  FINISHED: { icon: 'checkmark-circle' as const, color: '#10b981' },
  FAVORITE: { icon: 'heart'            as const, color: '#ef4444' },
};

function StatusBadge({ status }: { status: BookStatus }) {
  if (!status) return null;
  const { icon, color } = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Ionicons name={icon} size={10} color="#fff" />
    </View>
  );
}

const SectionHeader = memo(function SectionHeader({
  icon,
  iconColor,
  title,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={15} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
});

// Memoized BookCard prevents unnecessary row re-renders
const BookCard = memo(function BookCard({
  item,
  onPress,
}: {
  item: Book;
  onPress: (book: Book) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const authorName = Array.isArray(item.authors)
    ? item.authors[0]
    : typeof item.authors === 'string'
    ? item.authors
    : 'Unknown';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handlePress}>
      <View style={styles.cardCoverWrapper}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.cardCover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardCover, styles.placeholderCover]}>
            <Ionicons name="book-outline" size={28} color="#2e2e36" />
          </View>
        )}
        <StatusBadge status={item.status ?? null} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardAuthor} numberOfLines={1}>{authorName}</Text>
    </TouchableOpacity>
  );
});

function HeroCard({ book, onPress }: { book: Book; onPress: () => void }) {
  const authorName = Array.isArray(book.authors)
    ? book.authors[0]
    : typeof book.authors === 'string'
    ? book.authors
    : 'Unknown';

  return (
    <TouchableOpacity style={styles.hero} activeOpacity={0.88} onPress={onPress}>
      {book.thumbnail ? (
        <Image source={{ uri: book.thumbnail }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, styles.heroPlaceholder]}>
          <Ionicons name="book-outline" size={56} color="#2e2e36" />
        </View>
      )}
      <View style={styles.heroOverlay}>
        <View style={styles.heroPill}>
          <Ionicons name="flame" size={11} color="#f97316" />
          <Text style={styles.heroPillText}>Featured Philosophy</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.heroAuthor} numberOfLines={1}>{authorName}</Text>
      </View>
      <StatusBadge status={book.status ?? null} />
    </TouchableOpacity>
  );
}

// Fast Horizontal List with layout pre-calculation
const BookHorizontalList = memo(function BookHorizontalList({
  data,
  onOpenBook,
}: {
  data: Book[];
  onOpenBook: (book: Book) => void;
}) {
  const renderItem = useCallback(
    ({ item }: { item: Book }) => <BookCard item={item} onPress={onOpenBook} />,
    [onOpenBook],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_WIDTH + CARD_GAP,
      offset: (CARD_WIDTH + CARD_GAP) * index,
      index,
    }),
    [],
  );

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.google_book_id}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      initialNumToRender={4}
      maxToRenderPerBatch={5}
      windowSize={3}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
});

// ─── Main Screen Component ─────────────────────────────────────────
export default function HomeScreen() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchHomeFeed();
  }, []);

  const fetchHomeFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BASE_URL}/books/home/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Ensure fallbacks for arrays to prevent map errors
      setFeed({
        trending: Array.isArray(data?.trending) ? data.trending : [],
        recommended: Array.isArray(data?.recommended) ? data.recommended : [],
        genres: data?.genres && typeof data.genres === 'object' ? data.genres : {},
      });
    } catch {
      setError('Unable to fetch books. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    bookId: string,
    newStatus: BookStatus,
    savedBook?: Book,
  ) => {
    if (!feed) return;
    const patch = (list: Book[]) =>
      (list || []).map((b) =>
        b.google_book_id === bookId ? { ...(savedBook ?? b), status: newStatus } : b,
      );

    setFeed((prev) =>
      prev
        ? {
            ...prev,
            trending: patch(prev.trending),
            recommended: patch(prev.recommended),
            genres: Object.fromEntries(
              Object.entries(prev.genres).map(([k, v]) => [k, patch(v)]),
            ),
          }
        : prev,
    );
    if (selectedBook?.google_book_id === bookId) {
      setSelectedBook((prev) =>
        prev ? { ...(savedBook ?? prev), status: newStatus } : null,
      );
    }
  };

  const openBook = useCallback((book: Book) => {
    setSelectedBook(book);
    setModalVisible(true);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.stateText}>Curating bookshelf…</Text>
      </View>
    );
  }

  if (error || !feed) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={[styles.stateText, { color: TEXT, marginBottom: 20 }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchHomeFeed}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hero = feed.trending.length > 0 ? feed.trending[0] : CURATED_FALLBACK_HERO;
  const restTrending = feed.trending.length > 0 ? feed.trending.slice(1) : [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Featured Hero */}
        <View style={styles.section}>
          <HeroCard book={hero} onPress={() => openBook(hero)} />
        </View>

        {/* Trending */}
        {restTrending.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="flame" iconColor="#f97316" title="Trending Now" />
            <BookHorizontalList data={restTrending} onOpenBook={openBook} />
          </View>
        )}

        {/* Recommended */}
        {feed.recommended.length > 0 && (
          <View style={styles.section}>
            <SectionHeader icon="sparkles" iconColor={GOLD} title="Recommended Works" />
            <BookHorizontalList data={feed.recommended} onOpenBook={openBook} />
          </View>
        )}

        {/* Categorized Shelves (Philosophy, Novels, Science, etc.) */}
        {Object.entries(feed.genres).map(([genre, books]) =>
          !Array.isArray(books) || books.length === 0 ? null : (
            <View key={genre} style={styles.section}>
              <SectionHeader icon="library-outline" iconColor={MUTED} title={genre} />
              <BookHorizontalList data={books} onOpenBook={openBook} />
            </View>
          ),
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

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
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingTop: 16 },

  // Sections
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.2,
  },
  row: { paddingHorizontal: 16, gap: CARD_GAP },

  // Hero card
  hero: {
    marginHorizontal: 16,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: '#1a1a1f', justifyContent: 'center', alignItems: 'center' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  heroPillText: { fontSize: 11, fontWeight: '600', color: '#f97316' },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 4,
  },
  heroAuthor: { fontSize: 13, color: 'rgba(255, 255, 255, 0.55)' },

  // Book card
  card: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardCoverWrapper: {
    position: 'relative',
    width: '100%',
    height: 164,
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
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 3,
    lineHeight: 17,
  },
  cardAuthor: {
    fontSize: 11,
    color: MUTED,
    marginHorizontal: 8,
    marginBottom: 8,
  },

  // States
  centered: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stateText: { color: MUTED, marginTop: 12, textAlign: 'center', fontSize: 13 },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    backgroundColor: GOLD,
    borderRadius: 10,
  },
  retryBtnText: { color: '#0d0d10', fontWeight: '700', fontSize: 14 },
});