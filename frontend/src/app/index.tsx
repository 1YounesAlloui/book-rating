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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookDetailModal, Book, BookStatus } from '../components/BookDetailModal';

const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchHomeFeed();
  }, []);

  const fetchHomeFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${BASE_URL}/books/home/`);
      if (!response.ok) {
        throw new Error(`Failed to load books (${response.status})`);
      }
      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load home feed:', err);
      setError('Unable to fetch books. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookId: string, newStatus: BookStatus) => {
    setBooks((prevBooks) =>
      prevBooks.map((item) =>
        String(item.id) === String(bookId) ? { ...item, status: newStatus } : item
      )
    );

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
        throw new Error('API update failed');
      }
    } catch (err) {
      console.error('Error updating status on server:', err);
      fetchHomeFeed();
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchHomeFeed}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Explore Books</Text>

      <FlatList
        data={books}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderBookCard}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
  centered: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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