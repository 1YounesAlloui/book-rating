from rest_framework import serializers
from .models import Book, UserBook

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['id', 'google_book_id', 'title', 'authors', 'description', 'thumbnail', 'categories']

class UserBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)

    class Meta:
        model = UserBook
        fields = ['id', 'book', 'status', 'rating', 'updated_at']