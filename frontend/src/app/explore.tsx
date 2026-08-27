import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookDetailModal, Book, BookStatus } from '../components/BookDetailModal';

const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

const CATEGORIES = [
  'All',
  'Fiction',
  'Technology',
  'Philosophy',
  'Science',
  'History',
  'Psychology',
  'Business',
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    executeSearch(searchQuery, selectedCategory);
  }, [selectedCategory]);

  const executeSearch = async (query: string, category: string) => {
    try {
      setLoading(true);
      setError(null);

      const searchTerm = query.trim() || (category !== 'All' ? category : 'popular books');
      const response = await fetch(`${BASE_URL}/books/search/?q=${encodeURIComponent(searchTerm)}`);

      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }

      const data = await response.json();
      const rawList: Book[] = Array.isArray(data) ? data : [];

      // Deduplicate results by book ID to prevent key collisions
      const uniqueResults = rawList.filter(
        (book, index, self) => index === self.findIndex((b) => String(b.id) === String(book.id))
      );

      setSearchResults(uniqueResults);
    } catch (err: any) {
      console.error('Error conducting search:', err);
      setError('Unable to fetch books. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    executeSearch(searchQuery, selectedCategory);
  };

  const handleStatusChange = async (bookId: string, newStatus: BookStatus) => {
    setSearchResults((prev) =>
      prev.map((b) => (String(b.id) === String(bookId) ? { ...b, status: newStatus } : b))
    );

    if (selectedBook && String(selectedBook.id) === String(bookId)) {
      setSelectedBook((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await fetch(`${BASE_URL}/books/${bookId}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Error updating status on server:', err);
    }
  };

  const formatCardAuthor = (authors?: string[] | string) => {
    if (Array.isArray(authors) && authors.length > 0) return authors[0];
    if (typeof authors === 'string' && authors.trim().length > 0) return authors;
    return 'Unknown';
  };

  const renderBookCard = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        setSelectedBook(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardCoverWrapper}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.cardCover} />
        ) : (
          <View style={[styles.cardCover, styles.placeholderCover]}>
            <Ionicons name="book-outline" size={32} color="#475569" />
          </View>
        )}

        {item.status && (
          <View
            style={[
              styles.badge,
              item.status === 'TO_READ' && styles.badgeToRead,
              item.status === 'FINISHED' && styles.badgeFinished,
              item.status === 'FAVORITE' && styles.badgeFavorite,
            ]}
          >
            <Ionicons
              name={
                item.status === 'TO_READ'
                  ? 'bookmark'
                  : item.status === 'FINISHED'
                  ? 'checkmark-circle'
                  : 'heart'
              }
              size={12}
              color="#fff"
            />
          </View>
        )}
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          {formatCardAuthor(item.authors)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Explore</Text>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search title, author, or subject..."
          placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              executeSearch('', selectedCategory);
            }}
          >
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Searching books...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No books found</Text>
          <Text style={styles.emptySubtitle}>Try searching with a different term or subject.</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderBookCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
  },
  categoriesWrapper: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryPillActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  errorText: {
    color: '#f8fafc',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#121215',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardCoverWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardCover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    backgroundColor: '#1a1a1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeToRead: {
    backgroundColor: '#3b82f6',
  },
  badgeFinished: {
    backgroundColor: '#10b981',
  },
  badgeFavorite: {
    backgroundColor: '#ef4444',
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#94a3b8',
  },
});