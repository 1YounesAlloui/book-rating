import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Book, BookStatus } from './BookDetailModal';

export const GOLD = '#c8a96e';
export const BG = '#0d0d10';
export const SURFACE = '#121216';
export const SURFACE_LIGHT = '#1a1a22';
export const BORDER = 'rgba(255, 255, 255, 0.08)';
export const TEXT = '#f0ede8';
export const MUTED = '#8e8e9f';

export const STATUS_CONFIG: Record<
  string,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }
> = {
  TO_READ: { icon: 'bookmark', color: '#3b82f6', label: 'To Read' },
  FINISHED: { icon: 'checkmark-circle', color: '#10b981', label: 'Finished' },
  FAVORITE: { icon: 'heart', color: '#ef4444', label: 'Favorite' },
};

export function StatusBadge({ status, size = 'default' }: { status?: BookStatus; size?: 'default' | 'small' }) {
  if (!status || !STATUS_CONFIG[status]) return null;
  const { icon, color } = STATUS_CONFIG[status];
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, isSmall && styles.badgeSmall, { backgroundColor: color }]}>
      <Ionicons name={icon} size={isSmall ? 8 : 10} color="#fff" />
    </View>
  );
}

export function formatAuthor(authors?: string[] | string): string {
  if (Array.isArray(authors) && authors.length > 0) return authors[0];
  if (typeof authors === 'string' && authors.trim()) {
    return authors.split(',')[0].trim();
  }
  return 'Unknown';
}

interface BookCardProps {
  item: Book;
  onPress: (book: Book) => void;
  width?: number | `${number}%`;
  variant?: 'grid' | 'grid4' | 'horizontal';
  style?: ViewStyle;
}

export const BookCard = memo(function BookCard({
  item,
  onPress,
  width,
  variant = 'horizontal',
  style,
}: BookCardProps) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const authorName = formatAuthor(item.authors);
  const isGrid4 = variant === 'grid4';
  const isGrid = variant === 'grid';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isGrid4 ? styles.grid4Card : isGrid ? styles.gridCard : styles.horizontalCard,
        width ? { width: width as any } : undefined,
        style,
      ]}
      activeOpacity={0.82}
      onPress={handlePress}
    >
      <View
        style={[
          styles.coverWrapper,
          isGrid4
            ? styles.grid4CoverWrapper
            : isGrid
            ? styles.gridCoverWrapper
            : styles.horizontalCoverWrapper,
        ]}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.coverImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.coverImage, styles.placeholderCover]}>
            <Ionicons name="book-outline" size={isGrid4 ? 18 : 28} color="#333340" />
          </View>
        )}
        <StatusBadge status={item.status} size={isGrid4 ? 'small' : 'default'} />
      </View>

      <View style={[styles.infoContainer, isGrid4 && styles.grid4InfoContainer]}>
        <Text
          style={[styles.cardTitle, isGrid4 && styles.grid4Title]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.cardAuthor, isGrid4 && styles.grid4Author]}
          numberOfLines={1}
        >
          {authorName}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  horizontalCard: {
    width: 126,
  },
  gridCard: {
    width: '48%',
    marginBottom: 14,
  },
  grid4Card: {
    width: '23%',
    borderRadius: 10,
    marginBottom: 12,
  },
  coverWrapper: {
    position: 'relative',
    width: '100%',
    backgroundColor: SURFACE_LIGHT,
    overflow: 'hidden',
  },
  horizontalCoverWrapper: {
    height: 172,
  },
  gridCoverWrapper: {
    height: 196,
  },
  grid4CoverWrapper: {
    height: 110,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    backgroundColor: '#181820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeSmall: {
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  infoContainer: {
    padding: 8,
  },
  grid4InfoContainer: {
    padding: 5,
    paddingTop: 5,
    paddingBottom: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 3,
    lineHeight: 17,
  },
  grid4Title: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },
  grid4Author: {
    fontSize: 9,
    lineHeight: 12,
  },
});
