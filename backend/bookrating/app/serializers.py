from rest_framework import serializers
from .models import Book, UserBook

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            'id',
            'google_book_id',
            'title',
            'authors',
            'description',
            'thumbnail',
            'categories',
        ]

class UserBookSerializer(serializers.ModelSerializer):
    # Flatten book fields directly onto the UserBook response
    # so the frontend gets a single flat object instead of book: { ... }
    google_book_id = serializers.CharField(source='book.google_book_id')
    title = serializers.CharField(source='book.title')
    authors = serializers.CharField(source='book.authors')
    description = serializers.CharField(source='book.description')
    thumbnail = serializers.CharField(source='book.thumbnail')
    categories = serializers.CharField(source='book.categories')

    class Meta:
        model = UserBook
        fields = [
            'id',            # UserBook Django PK (not used for routing)
            'google_book_id', # Used as the URL param in /books/<google_book_id>/status/
            'title',
            'authors',
            'description',
            'thumbnail',
            'categories',
            'status',
            'rating',
            'updated_at',
        ]