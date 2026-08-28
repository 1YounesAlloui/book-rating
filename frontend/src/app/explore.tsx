import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookDetailModal, Book, BookStatus } from '../components/BookDetailModal';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

// ─── Design Tokens ────────────────────────────────────────────────
const GOLD    = '#c8a96e';
const BG      = '#0d0d10';
const SURFACE = '#111114';
const BORDER  = 'rgba(255, 255, 255, 0.07)';
const TEXT    = '#f0ede8';
const MUTED   = '#5a5a6a';

const CATEGORIES = [
  'All', 'Fiction', 'Technology', 'Philosophy',
  'Science', 'History', 'Psychology', 'Business',
  'Biography', 'Mystery', 'Fantasy', 'Self Help',
];

const WRITING_STYLES = [
  'All', 'Literary', 'Dark', 'Lighthearted', 
  'Academic', 'Poetic', 'Thriller'
];

const NOVEL_TYPES = [
  'All', 'Novel', 'Series', 'Short Stories', 'Graphic Novel'
];

type SortOption = 'relevance' | 'newest';

interface FilterOptions {
  sortBy: SortOption;
  genre: string;
  writingStyle: string;
  novelType: string;
}

const DEFAULT_FILTERS: FilterOptions = {
  sortBy: 'relevance',
  genre: 'All',
  writingStyle: 'All',
  novelType: 'All',
};

const STATUS_COLORS: Record<string, string> = {
  TO_READ: '#3b82f6',
  FINISHED: '#10b981',
  FAVORITE: '#ef4444',
};

const STATUS_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  TO_READ: 'bookmark',
  FINISHED: 'checkmark-circle',
  FAVORITE: 'heart',
};

// ─── Component ────────────────────────────────────────────────────
export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState('All');
  const [rawResults, setRawResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Check if non-default filters are applied
  const isFilterActive = useMemo(() => {
    return (
      activeFilters.sortBy !== DEFAULT_FILTERS.sortBy ||
      activeFilters.genre !== DEFAULT_FILTERS.genre ||
      activeFilters.writingStyle !== DEFAULT_FILTERS.writingStyle ||
      activeFilters.novelType !== DEFAULT_FILTERS.novelType
    );
  }, [activeFilters]);

  // Sync category pill selection with API fetch & active filters
  useEffect(() => {
    executeSearch(query, category);
    if (activeFilters.genre !== category) {
      setActiveFilters((prev) => ({ ...prev, genre: category }));
    }
  }, [category]);

  const executeSearch = async (q: string, cat: string) => {
    try {
      setLoading(true);
      setError(null);
      const term = q.trim() || (cat !== 'All' ? cat : 'popular books');
      const res = await fetch(`${BASE_URL}/books/search/?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: Book[] = Array.isArray(data) ? data : [];
      const seen = new Set<string>();
      setRawResults(
        raw.filter((b) => {
          if (seen.has(b.google_book_id)) return false;
          seen.add(b.google_book_id);
          return true;
        }),
      );
    } catch {
      setError('Unable to fetch books. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side filter and sorting logic
  const filteredResults = useMemo(() => {
    let list = [...rawResults];

    // Helper to extract searchable string block from a book object
    const getSearchableText = (book: any): string => {
      const desc = typeof book?.description === 'string' ? book.description : '';
      const title = typeof book?.title === 'string' ? book.title : '';
      const cats = Array.isArray(book?.categories)
        ? book.categories.join(' ')
        : typeof book?.categories === 'string'
        ? book.categories
        : '';
      return `${title} ${desc} ${cats}`.toLowerCase();
    };

    // 1. Filter by Genre (if selected inside modal directly)
    if (activeFilters.genre !== 'All') {
      const genreTerm = activeFilters.genre.toLowerCase();
      list = list.filter((book) => getSearchableText(book).includes(genreTerm));
    }

    // 2. Filter by Writing Style & Tone
    if (activeFilters.writingStyle !== 'All') {
      const styleTerm = activeFilters.writingStyle.toLowerCase();
      list = list.filter((book) => getSearchableText(book).includes(styleTerm));
    }

    // 3. Filter by Novel Format & Type
    if (activeFilters.novelType !== 'All') {
      const typeTerm = activeFilters.novelType.toLowerCase();
      list = list.filter((book) => getSearchableText(book).includes(typeTerm));
    }

    // 4. Sort Results
    if (activeFilters.sortBy === 'newest') {
      list.sort((a: any, b: any) => {
        const dateA = new Date(a.publishedDate || 0).getTime();
        const dateB = new Date(b.publishedDate || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [rawResults, activeFilters]);

  const handleStatusChange = async (
    bookId: string,
    newStatus: BookStatus,
    savedBook?: Book,
  ) => {
    setRawResults((prev) =>
      prev.map((b) =>
        b.google_book_id === bookId
          ? { ...b, ...(savedBook ?? {}), status: newStatus }
          : b,
      ),
    );
    if (selectedBook?.google_book_id === bookId) {
      setSelectedBook((prev) =>
        prev ? { ...prev, ...(savedBook ?? {}), status: newStatus } : null,
      );
    }
  };

  const formatAuthor = (authors?: string[] | string): string => {
    if (Array.isArray(authors) && authors.length > 0) return authors[0];
    if (typeof authors === 'string' && authors.trim()) return authors;
    return 'Unknown';
  };

  const openFilterModal = () => {
    setTempFilters({ ...activeFilters, genre: category });
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveFilters(tempFilters);
    if (tempFilters.genre !== category) {
      setCategory(tempFilters.genre);
    }
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
    setCategory('All');
    setFilterModalVisible(false);
  };

  const renderCard = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        setSelectedBook(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardCoverWrapper}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.cardCover} resizeMode="cover" />
        ) : (
          <View style={[styles.cardCover, styles.placeholderCover]}>
            <Ionicons name="book-outline" size={28} color="#2e2e36" />
          </View>
        )}
        {item.status && (
          <View
            style={[
              styles.badge,
              { backgroundColor: STATUS_COLORS[item.status] ?? '#555' },
            ]}
          >
            <Ionicons name={STATUS_ICONS[item.status] ?? 'bookmark'} size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardAuthor} numberOfLines={1}>{formatAuthor(item.authors)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header Row */}
      <View style={styles.searchHeaderRow}>
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={focused ? GOLD : MUTED}
            style={{ marginRight: 2 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Title, author, subject…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => executeSearch(query, category)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                setQuery('');
                executeSearch('', category);
              }}
            >
              <Ionicons name="close-circle" size={17} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
          activeOpacity={0.7}
          onPress={openFilterModal}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={isFilterActive ? BG : TEXT}
          />
          {isFilterActive && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Category Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={styles.pillsRow}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main Results Container */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.stateText}>Searching…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={[styles.stateText, { color: TEXT }]}>{error}</Text>
        </View>
      ) : filteredResults.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={52} color="#1e1e25" />
          <Text style={styles.emptyTitle}>No matching books</Text>
          <Text style={styles.stateText}>
            Try clearing filters or switching search categories.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.google_book_id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Book Detail Modal */}
      <BookDetailModal
        visible={modalVisible}
        book={selectedBook}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refine Results</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Sort Options */}
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.chipRow}>
                {(['relevance', 'newest'] as SortOption[]).map((sort) => {
                  const active = tempFilters.sortBy === sort;
                  return (
                    <TouchableOpacity
                      key={sort}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTempFilters({ ...tempFilters, sortBy: sort })}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Genre / Category Selector */}
              <Text style={styles.filterSectionTitle}>Genre & Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChipScroll}>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((cat) => {
                    const active = tempFilters.genre === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setTempFilters({ ...tempFilters, genre: cat })}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Format / Type */}
              <Text style={styles.filterSectionTitle}>Novel Format & Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChipScroll}>
                <View style={styles.chipRow}>
                  {NOVEL_TYPES.map((type) => {
                    const active = tempFilters.novelType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setTempFilters({ ...tempFilters, novelType: type })}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Writing Style */}
              <Text style={styles.filterSectionTitle}>Writing Style & Tone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChipScroll}>
                <View style={styles.chipRow}>
                  {WRITING_STYLES.map((style) => {
                    const active = tempFilters.writingStyle === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setTempFilters({ ...tempFilters, writingStyle: style })}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{style}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 14 },

  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchBarFocused: {
    borderColor: `${GOLD}66`,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15 },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  activeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },

  pillsRow: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 14,
  },
  pills: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: {
    backgroundColor: `${GOLD}1a`,
    borderColor: `${GOLD}70`,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: MUTED },
  pillTextActive: { color: GOLD, fontWeight: '600' },

  card: {
    width: '48%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardCoverWrapper: {
    position: 'relative',
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
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginTop: 9,
    marginHorizontal: 10,
    marginBottom: 3,
    lineHeight: 18,
  },
  cardAuthor: { fontSize: 12, color: MUTED, marginHorizontal: 10, marginBottom: 10 },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  stateText: { color: MUTED, marginTop: 10, textAlign: 'center', fontSize: 13 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT,
    marginTop: 14,
    marginBottom: 4,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  modalScroll: {
    marginVertical: 4,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizontalChipScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    borderColor: GOLD,
    backgroundColor: `${GOLD}1a`,
  },
  chipText: { fontSize: 13, color: MUTED, fontWeight: '500' },
  chipTextActive: { color: GOLD, fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  resetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  resetBtnText: { color: TEXT, fontWeight: '600', fontSize: 14 },
  applyBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GOLD,
  },
  applyBtnText: { color: BG, fontWeight: '700', fontSize: 14 },
});