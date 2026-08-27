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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type BookStatus = 'TO_READ' | 'FINISHED' | 'FAVORITE' | null;

export interface Book {
  id: string;
  title: string;
  authors?: string[] | string;
  description?: string;
  coverImage?: string;
  status?: BookStatus;
  rating?: number;
}

interface BookDetailModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onStatusChange: (bookId: string, newStatus: BookStatus) => Promise<void>;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  visible,
  book,
  onClose,
  onStatusChange,
}) => {
  const [currentStatus, setCurrentStatus] = useState<BookStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState<BookStatus>(null);

  useEffect(() => {
    if (book) {
      setCurrentStatus(book.status || null);
    }
  }, [book]);

  if (!book) return null;

  const handlePressStatus = async (targetStatus: 'TO_READ' | 'FINISHED' | 'FAVORITE') => {
    const nextStatus: BookStatus = currentStatus === targetStatus ? null : targetStatus;

    setCurrentStatus(nextStatus);
    setLoadingStatus(targetStatus);

    try {
      await onStatusChange(book.id, nextStatus);
    } catch (error) {
      setCurrentStatus(book.status || null);
    } finally {
      setLoadingStatus(null);
    }
  };

  // Helper to format authors safely whether backend returns Array, string, or undefined
  const formatAuthors = (authors?: string[] | string) => {
    if (Array.isArray(authors)) {
      return authors.length > 0 ? authors.join(', ') : 'Unknown Author';
    }
    if (typeof authors === 'string' && authors.trim().length > 0) {
      return authors;
    }
    return 'Unknown Author';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Book Details
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Book Cover */}
            <View style={styles.coverWrapper}>
              {book.coverImage ? (
                <Image source={{ uri: book.coverImage }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={[styles.coverImage, styles.placeholderCover]}>
                  <Ionicons name="book-outline" size={48} color="#475569" />
                </View>
              )}
            </View>

            {/* Book Info */}
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{formatAuthors(book.authors)}</Text>

            {/* Interactive Shelf Buttons */}
            <View style={styles.actionContainer}>
              {/* TO READ */}
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'TO_READ' && styles.statusButtonActiveToRead,
                ]}
                onPress={() => handlePressStatus('TO_READ')}
                disabled={loadingStatus !== null}
              >
                {loadingStatus === 'TO_READ' ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <>
                    <Ionicons
                      name={currentStatus === 'TO_READ' ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={currentStatus === 'TO_READ' ? '#3b82f6' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        currentStatus === 'TO_READ' && styles.statusTextActive,
                      ]}
                    >
                      To Read
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* FINISHED */}
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'FINISHED' && styles.statusButtonActiveFinished,
                ]}
                onPress={() => handlePressStatus('FINISHED')}
                disabled={loadingStatus !== null}
              >
                {loadingStatus === 'FINISHED' ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        currentStatus === 'FINISHED' ? 'checkmark-circle' : 'checkmark-circle-outline'
                      }
                      size={18}
                      color={currentStatus === 'FINISHED' ? '#10b981' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        currentStatus === 'FINISHED' && styles.statusTextActiveFinished,
                      ]}
                    >
                      Finished
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* FAVORITE */}
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'FAVORITE' && styles.statusButtonActiveFavorite,
                ]}
                onPress={() => handlePressStatus('FAVORITE')}
                disabled={loadingStatus !== null}
              >
                {loadingStatus === 'FAVORITE' ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons
                      name={currentStatus === 'FAVORITE' ? 'heart' : 'heart-outline'}
                      size={18}
                      color={currentStatus === 'FAVORITE' ? '#ef4444' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        currentStatus === 'FAVORITE' && styles.statusTextActiveFavorite,
                      ]}
                    >
                      Favorite
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>
                {book.description || 'No description available for this book.'}
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
  closeButton: {
    padding: 4,
  },
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
  statusTextActive: {
    color: '#3b82f6',
  },
  statusTextActiveFinished: {
    color: '#10b981',
  },
  statusTextActiveFavorite: {
    color: '#ef4444',
  },
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