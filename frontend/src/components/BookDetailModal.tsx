import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { saveBookToShelf, updateShelfStatus } from '../services/api';

export type BookStatus = 'TO_READ' | 'FINISHED' | 'FAVORITE' | null;

export interface Book {
  id?: number;                 // UserBook Django PK — only present on shelved books
  google_book_id: string;      // Always present — Google/OL/Gutendex/OpenBD ID
  title: string;
  authors?: string;
  description?: string;
  thumbnail?: string;
  categories?: string;
  status?: BookStatus;
  rating?: number;
  updated_at?: string;
  publishedDate?: string;
}

interface BookDetailModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
  onStatusChange: (googleBookId: string, newStatus: BookStatus, savedBook?: Book) => Promise<void> | void;
}

const GOLD = '#c8a96e';
const BG = '#0d0d10';
const SURFACE = '#131317';
const SURFACE_LIGHT = '#1a1a22';
const BORDER = 'rgba(255, 255, 255, 0.08)';
const TEXT = '#f0ede8';
const MUTED = '#8e8e9f';

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  visible,
  book,
  onClose,
  onStatusChange,
}) => {
  const [currentStatus, setCurrentStatus] = useState<BookStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState<BookStatus>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
        if (nextStatus === null) {
          await onStatusChange(book.google_book_id, null);
          return;
        }

        // Save new book to backend
        const saved = await saveBookToShelf(book, nextStatus);
        setSavedBookId(saved.id);
        await onStatusChange(book.google_book_id, nextStatus, saved);
      } else {
        // Update existing book
        await updateShelfStatus(book.google_book_id, nextStatus);
        await onStatusChange(book.google_book_id, nextStatus);
      }
    } catch (err: any) {
      setCurrentStatus(previousStatus);
      setErrorMsg(err.message || 'Failed to update shelf. Please try again.');
    } finally {
      setLoadingStatus(null);
    }
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
      activeBg: 'rgba(59, 130, 246, 0.16)',
      activeBorder: '#3b82f6',
    },
    {
      key: 'FINISHED' as const,
      label: 'Finished',
      icon: 'checkmark-circle' as const,
      color: '#10b981',
      activeBg: 'rgba(16, 185, 129, 0.16)',
      activeBorder: '#10b981',
    },
    {
      key: 'FAVORITE' as const,
      label: 'Favorite',
      icon: 'heart' as const,
      color: '#ef4444',
      activeBg: 'rgba(239, 68, 68, 0.16)',
      activeBorder: '#ef4444',
    },
  ] as const;

  const categories = book.categories
    ? book.categories.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIndicator} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Book Presentation Section */}
            <View style={styles.topSection}>
              <View style={styles.coverWrapper}>
                {book.thumbnail ? (
                  <Image
                    source={{ uri: book.thumbnail }}
                    style={styles.coverImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.coverImage, styles.placeholderCover]}>
                    <Ionicons name="book-outline" size={48} color="#333340" />
                  </View>
                )}
              </View>

              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.author}>{formatAuthors(book.authors)}</Text>

              {/* Category Pills */}
              {categories.length > 0 && (
                <View style={styles.categoryRow}>
                  {categories.map((cat, i) => (
                    <View key={i} style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Error message */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Shelf Actions */}
            <Text style={styles.sectionHeading}>Shelf Status</Text>
            <View style={styles.actionContainer}>
              {SHELF_BUTTONS.map(({ key, label, icon, color, activeBg, activeBorder }) => {
                const isActive = currentStatus === key;
                const isLoading = loadingStatus === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.statusButton,
                      isActive && {
                        backgroundColor: activeBg,
                        borderColor: activeBorder,
                      },
                    ]}
                    onPress={() => handlePressStatus(key)}
                    disabled={loadingStatus !== null}
                    activeOpacity={0.7}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={color} />
                    ) : (
                      <>
                        <Ionicons
                          name={isActive ? icon : (`${icon}-outline` as any)}
                          size={18}
                          color={isActive ? color : MUTED}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            isActive && { color, fontWeight: '700' },
                          ]}
                        >
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
              <Text style={styles.sectionHeading}>About this book</Text>
              <Text style={styles.descriptionText}>
                {book.description?.trim() || 'No detailed synopsis available for this volume.'}
              </Text>
            </View>

            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: '90%',
  },
  header: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    top: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: SURFACE_LIGHT,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  coverWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 16,
  },
  coverImage: {
    width: 140,
    height: 204,
    borderRadius: 14,
    backgroundColor: SURFACE_LIGHT,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 26,
  },
  author: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryPillText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionSection: {
    width: '100%',
  },
  descriptionText: {
    fontSize: 14,
    color: '#c4c4d0',
    lineHeight: 22,
  },
});