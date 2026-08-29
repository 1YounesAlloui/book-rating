import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
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
import { BookCard, GOLD, BG, SURFACE, SURFACE_LIGHT, BORDER, TEXT, MUTED } from '../components/BookCard';
import { searchBooks } from '../services/api';

const CATEGORIES = [
  'All',
  'Politics',
  'Geopolitics',
  'Geography',
  'Fiction',
  'Technology',
  'Philosophy',
  'Science',
  'History',
  'Psychology',
  'Business',
  'Biography',
  'Mystery',
  'Fantasy',
  'Self Help',
];

const WRITING_STYLES = [
  'All',
  'Literary',
  'Analytical',
  'Dark',
  'Lighthearted',
  'Academic',
  'Poetic',
  'Thriller',
  'Philosophical',
];

const NOVEL_TYPES = [
  'All',
  'Novel',
  'Series',
  'Short Stories',
  'Graphic Novel',
  'Non-Fiction',
  'Essay / Treatise',
  'Biography / Memoir',
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

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState('All');
  
  // Results & Pagination
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter State
  const [activeFilters, setActiveFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Ref for active AbortController to cancel previous in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if non-default filters are active
  const isFilterActive = useMemo(() => {
    return (
      activeFilters.sortBy !== DEFAULT_FILTERS.sortBy ||
      activeFilters.genre !== DEFAULT_FILTERS.genre ||
      activeFilters.writingStyle !== DEFAULT_FILTERS.writingStyle ||
      activeFilters.novelType !== DEFAULT_FILTERS.novelType
    );
  }, [activeFilters]);

  // Centralized search executor with AbortController cancellation & pagination
  const performFetch = useCallback(
    async (
      q: string,
      gen: string,
      pageNum: number,
      isLoadMore = false
    ) => {
      // Cancel previous ongoing request to prevent race conditions
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setError(null);
        }

        const data = await searchBooks({
          q: q.trim(),
          genre: gen !== 'All' ? gen : undefined,
          page: pageNum,
          limit: 24, // Optimized for 4-column batches
          signal: controller.signal,
        });

        setBooks((prev) => {
          if (pageNum === 1) return data.results;
          // Deduplicate incoming results
          const seen = new Set(prev.map((b) => b.google_book_id));
          const uniqueNew = data.results.filter((b) => !seen.has(b.google_book_id));
          return [...prev, ...uniqueNew];
        });

        setPage(pageNum);
        setHasMore(data.has_more);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isLoadMore) {
          setError(err.message || 'Unable to fetch books. Please check connection.');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Debounced search trigger when query or category changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performFetch(query, category, 1, false);
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, category, performFetch]);

  // Handle Category Pill Selection
  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setActiveFilters((prev) => ({ ...prev, genre: cat }));
  };

  // Load more on scroll reached end
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      performFetch(query, category, page + 1, true);
    }
  };

  // Multi-Filter Matching (Genre, Style, Novel Type, Sort)
  const filteredAndSortedBooks = useMemo(() => {
    let list = [...books];

    const getSearchableText = (book: Book): string => {
      const desc = book.description || '';
      const title = book.title || '';
      const cats = book.categories || '';
      const authors = book.authors || '';
      return `${title} ${desc} ${cats} ${authors}`.toLowerCase();
    };

    // 1. Genre filter (if selected via modal or pill)
    if (activeFilters.genre !== 'All') {
      const genreTerm = activeFilters.genre.toLowerCase();
      list = list.filter((b) => getSearchableText(b).includes(genreTerm));
    }

    // 2. Filter by Writing Style
    if (activeFilters.writingStyle !== 'All') {
      const styleTerm = activeFilters.writingStyle.toLowerCase();
      list = list.filter((b) => getSearchableText(b).includes(styleTerm));
    }

    // 3. Filter by Novel / Book Format
    if (activeFilters.novelType !== 'All') {
      const typeTerm = activeFilters.novelType.toLowerCase().split('/')[0].trim();
      list = list.filter((b) => getSearchableText(b).includes(typeTerm));
    }

    // 4. Sort Results
    if (activeFilters.sortBy === 'newest') {
      list.sort((a, b) => {
        const dateA = new Date(a.publishedDate || 0).getTime();
        const dateB = new Date(b.publishedDate || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [books, activeFilters]);

  const handleStatusChange = async (
    bookId: string,
    newStatus: BookStatus,
    savedBook?: Book
  ) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.google_book_id === bookId
          ? { ...b, ...(savedBook ?? {}), status: newStatus }
          : b
      )
    );
    if (selectedBook?.google_book_id === bookId) {
      setSelectedBook((prev) =>
        prev ? { ...prev, ...(savedBook ?? {}), status: newStatus } : null
      );
    }
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

  const handleCardPress = useCallback((book: Book) => {
    setSelectedBook(book);
    setModalVisible(true);
  }, []);

  const renderCard = useCallback(
    ({ item }: { item: Book }) => (
      <BookCard item={item} onPress={handleCardPress} variant="grid4" />
    ),
    [handleCardPress]
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
            placeholder="Search title, author, politics, etc…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={18} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
          activeOpacity={0.75}
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

      {/* Category Pills Row */}
      <View style={styles.pillsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          nestedScrollEnabled={true}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Results Container */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.stateText}>Finding great books…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={[styles.stateText, { color: TEXT, marginBottom: 16 }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => performFetch(query, category, 1, false)}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAndSortedBooks.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={54} color="#272730" />
          <Text style={styles.emptyTitle}>No matching books found</Text>
          <Text style={styles.stateText}>
            Try clearing active filters or searching for different keywords.
          </Text>
          {isFilterActive && (
            <TouchableOpacity style={styles.clearFilterBtn} onPress={resetFilters}>
              <Text style={styles.clearFilterBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedBooks}
          keyExtractor={(item) => item.google_book_id}
          renderItem={renderCard}
          numColumns={4}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={GOLD} />
              </View>
            ) : null
          }
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
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refine Books</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              nestedScrollEnabled={true}
            >
              {/* Sort Options */}
              <Text style={styles.filterSectionTitle}>Sort Order</Text>
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

              {/* Genre / Category */}
              <Text style={styles.filterSectionTitle}>Genre & Subject</Text>
              <View style={styles.chipWrapRow}>
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

              {/* Novel / Book Format */}
              <Text style={styles.filterSectionTitle}>Novel & Book Format</Text>
              <View style={styles.chipWrapRow}>
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

              {/* Writing Style */}
              <Text style={styles.filterSectionTitle}>Writing Style & Tone</Text>
              <View style={styles.chipWrapRow}>
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

            {/* Filter Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 14 },

  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
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
    borderColor: GOLD,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
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
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },

  pillsWrapper: {
    marginBottom: 14,
  },
  pills: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: {
    backgroundColor: `${GOLD}20`,
    borderColor: GOLD,
  },
  pillText: { fontSize: 12, fontWeight: '500', color: MUTED },
  pillTextActive: { color: GOLD, fontWeight: '700' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 110,
  },
  stateText: { color: MUTED, marginTop: 10, textAlign: 'center', fontSize: 13 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    marginTop: 14,
    marginBottom: 4,
  },
  clearFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  clearFilterBtnText: {
    color: GOLD,
    fontWeight: '600',
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: GOLD,
    borderRadius: 10,
  },
  retryBtnText: { color: BG, fontWeight: '700', fontSize: 14 },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Filter Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  modalScroll: {
    marginVertical: 4,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    borderColor: GOLD,
    backgroundColor: `${GOLD}22`,
  },
  chipText: { fontSize: 12, color: MUTED, fontWeight: '500' },
  chipTextActive: { color: GOLD, fontWeight: '700' },
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
    backgroundColor: SURFACE_LIGHT,
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