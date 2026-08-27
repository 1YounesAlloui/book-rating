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
  Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

type TabType = 'TO_READ' | 'FINISHED' | 'FAVORITE';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('TO_READ');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchLibraryBooks();
  }, []);

  const fetchLibraryBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${BASE_URL}/books/user/`);

      // Handle 404 gracefully as an empty library state
      if (response.status === 404) {
        setBooks([]);
        return;
      }

      if (!response.ok) {
        console.error(`Library fetch failed status code: ${response.status}`);
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading library:', err.message);
      setError(`Unable to load library (${err.message}).`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLibraryBooks();
  };

  const handleStatusChange = async (bookId: string, newStatus: BookStatus) => {
    setBooks((prevBooks) => {
      if (!newStatus) {
        return prevBooks.filter((b) => String(b.id) !== String(bookId));
      }
      return prevBooks.map((b) =>
        String(b.id) === String(bookId) ? { ...b, status: newStatus } : b
      );
    });

    if (selectedBook && String(selectedBook.id) === String(bookId)) {
      setSelectedBook((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const response = await fetch(`${BASE_URL}/books/${bookId}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status on backend');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      fetchLibraryBooks();
    }
  };

  const filteredBooks = books.filter((b) => b.status === activeTab);
  const getTabCount = (tab: TabType) => books.filter((b) => b.status === tab).length;

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
      <Text style={styles.heading}>My Library</Text>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'TO_READ' && styles.tabActiveToRead]}
          onPress={() => setActiveTab('TO_READ')}
        >
          <Ionicons
            name={activeTab === 'TO_READ' ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={activeTab === 'TO_READ' ? '#3b82f6' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'TO_READ' && styles.tabTextActiveToRead]}>
            To Read ({getTabCount('TO_READ')})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'FINISHED' && styles.tabActiveFinished]}
          onPress={() => setActiveTab('FINISHED')}
        >
          <Ionicons
            name={activeTab === 'FINISHED' ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={16}
            color={activeTab === 'FINISHED' ? '#10b981' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'FINISHED' && styles.tabTextActiveFinished]}>
            Finished ({getTabCount('FINISHED')})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'FAVORITE' && styles.tabActiveFavorite]}
          onPress={() => setActiveTab('FAVORITE')}
        >
          <Ionicons
            name={activeTab === 'FAVORITE' ? 'heart' : 'heart-outline'}
            size={16}
            color={activeTab === 'FAVORITE' ? '#ef4444' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'FAVORITE' && styles.tabTextActiveFavorite]}>
            Favorites ({getTabCount('FAVORITE')})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen States */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLibraryBooks}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={
              activeTab === 'TO_READ'
                ? 'bookmark-outline'
                : activeTab === 'FINISHED'
                ? 'checkmark-done-outline'
                : 'heart-outline'
            }
            size={56}
            color="#334155"
          />
          <Text style={styles.emptyTitle}>No books here yet</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'TO_READ'
              ? 'Books marked as "To Read" will appear here.'
              : activeTab === 'FINISHED'
              ? 'Books you complete will show up here.'
              : 'Add books to your favorites to see them here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderBookCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#121215',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActiveToRead: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  tabActiveFinished: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  tabActiveFavorite: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActiveToRead: {
    color: '#3b82f6',
  },
  tabTextActiveFinished: {
    color: '#10b981',
  },
  tabTextActiveFavorite: {
    color: '#ef4444',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
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
    textAlign: 'center',
    marginTop: 6,
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