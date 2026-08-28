import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type BookStatus = 'TO_READ' | 'FINISHED' | 'FAVORITE' | null;

// Covers both search results (from Google Books) and shelved books (from UserBookSerializer)
export interface Book {
  id?: number;                 // UserBook Django PK — only present on shelved books
  google_book_id: string;      // Always present — Google's string ID
  title: string;
  authors?: string;
  description?: string;
  thumbnail?: string;
  categories?: string;
  status?: BookStatus;
  rating?: number;
  updated_at?: string;
}

interface BookDetailModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onStatusChange: (googleBookId: string, newStatus: BookStatus, savedBook?: Book) => Promise<void>;
}

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://localhost:8000/api';

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  visible,
  book,
  onClose,
  onStatusChange,
}) => {
  const [currentStatus, setCurrentStatus] = useState<BookStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState<BookStatus>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track the Django id once the book has been saved for the first time
  // (so subsequent taps in the same modal session don't try to re-save)
  const [savedBookId, setSavedBookId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (book) {
      setCurrentStatus(book.status ?? null);
      setSavedBookId(book.id);
      setErrorMsg(null);
    }
  }, [book]);

  if (!book) return null;

  const handlePressStatus = async (targetStatus: 'TO_READ' | 'FINISHED' | 'FAVORITE') => {
    const nextStatus: BookStatus = currentStatus === targetStatus ? null : targetStatus;
    const previousStatus = currentStatus;

    setCurrentStatus(nextStatus);
    setLoadingStatus(targetStatus);
    setErrorMsg(null);

    try {
      if (!savedBookId) {
        // Book is from search/home — not in DB yet.

        if (nextStatus === null) {
          // Toggling off an unsaved book — nothing to persist, just clear UI state
          return;
        }

        // Save to DB for the first time
        await saveNewBook(book, nextStatus);
      } else {
        // Book is already shelved — just update its status (null = remove from shelf)
        await onStatusChange(book.google_book_id, nextStatus);
      }
    } catch (err: any) {
      // Roll back on failure
      setCurrentStatus(previousStatus);
      setErrorMsg('Failed to update shelf. Try again.');
      console.error('handlePressStatus error:', err.message);
    } finally {
      setLoadingStatus(null);
    }
  };

  const saveNewBook = async (b: Book, newStatus: BookStatus) => {
    const response = await fetch(`${BASE_URL}/books/save/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_book_id: b.google_book_id,
        title: b.title,
        authors: b.authors ?? '',
        description: b.description ?? '',
        thumbnail: b.thumbnail ?? '',
        categories: b.categories ?? '',
        status: newStatus,
        rating: b.rating ?? 0,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error('Save error body:', body);
      throw new Error(`HTTP ${response.status}`);
    }

    const saved: Book = await response.json();
    console.log('[SAVE] Book saved to shelf:', saved);

    // Cache the Django id locally so subsequent taps use PATCH instead of POST
    setSavedBookId(saved.id);

    // Notify parent with the full saved object so it can update its list state
    await onStatusChange(saved.google_book_id, newStatus, saved);
  };

  const formatAuthors = (authors?: string): string => {
    if (!authors || authors.trim().length === 0) return 'Unknown Author';
    return authors;
  };

  const SHELF_BUTTONS = [
    {
      key: 'TO_READ' as const,
      label: 'To Read',
      icon: 'bookmark' as const,
      color: '#3b82f6',
      activeStyle: styles.statusButtonActiveToRead,
      activeTextStyle: styles.statusTextActiveToRead,
    },
    {
      key: 'FINISHED' as const,
      label: 'Finished',
      icon: 'checkmark-circle' as const,
      color: '#10b981',
      activeStyle: styles.statusButtonActiveFinished,
      activeTextStyle: styles.statusTextActiveFinished,
    },
    {
      key: 'FAVORITE' as const,
      label: 'Favorite',
      icon: 'heart' as const,
      color: '#ef4444',
      activeStyle: styles.statusButtonActiveFavorite,
      activeTextStyle: styles.statusTextActiveFavorite,
    },
  ] as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Book Details
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Cover */}
            <View style={styles.coverWrapper}>
              {book.thumbnail ? (
                <Image
                  source={{ uri: book.thumbnail }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.coverImage, styles.placeholderCover]}>
                  <Ionicons name="book-outline" size={48} color="#475569" />
                </View>
              )}
            </View>

            {/* Info */}
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{formatAuthors(book.authors)}</Text>

            {/* Error message */}
            {errorMsg && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            {/* Shelf Buttons */}
            <View style={styles.actionContainer}>
              {SHELF_BUTTONS.map(({ key, label, icon, color, activeStyle, activeTextStyle }) => {
                const isActive = currentStatus === key;
                const isLoading = loadingStatus === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.statusButton, isActive && activeStyle]}
                    onPress={() => handlePressStatus(key)}
                    disabled={loadingStatus !== null}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={color} />
                    ) : (
                      <>
                        <Ionicons
                          name={isActive ? icon : (`${icon}-outline` as any)}
                          size={18}
                          color={isActive ? color : '#94a3b8'}
                        />
                        <Text style={[styles.statusText, isActive && activeTextStyle]}>
                          {label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>
                {book.description?.trim() || 'No description available for this book.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121215',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: { padding: 4 },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  coverWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  coverImage: {
    width: 130,
    height: 190,
    borderRadius: 12,
  },
  placeholderCover: {
    backgroundColor: '#1a1a1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 6,
  },
  author: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusButtonActiveToRead: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
  },
  statusButtonActiveFinished: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  statusButtonActiveFavorite: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActiveToRead: { color: '#3b82f6' },
  statusTextActiveFinished: { color: '#10b981' },
  statusTextActiveFavorite: { color: '#ef4444' },
  descriptionSection: {
    width: '100%',
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});