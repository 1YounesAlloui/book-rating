import os
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Book, UserBook
from .serializers import UserBookSerializer

GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

def fetch_google_books(query, max_results=10):
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults={max_results}&key={GOOGLE_BOOKS_API_KEY}"
    res = requests.get(url)
    if res.status_code != 200:
        return []
    
    items = res.json().get('items', [])
    books = []
    for item in items:
        info = item.get('volumeInfo', {})
        books.append({
            'google_book_id': item.get('id'),
            'title': info.get('title', 'Unknown Title'),
            'authors': ", ".join(info.get('authors', ['Unknown Author'])),
            'description': info.get('description', ''),
            'thumbnail': info.get('imageLinks', {}).get('thumbnail', ''),
            'categories': ", ".join(info.get('categories', ['General'])),
        })
    return books

@api_view(['GET'])
def get_home_feed(request):
    """Fetches trending books and curated genres for the Home Tab."""
    genres = ['Fiction', 'Technology', 'Science', 'History', 'Fantasy']
    
    feed = {
        'trending': fetch_google_books('subject:bestsellers', max_results=8),
        'genres': {}
    }
    
    for genre in genres:
        feed['genres'][genre] = fetch_google_books(f'subject:{genre.lower()}', max_results=6)

    return Response(feed, status=status.HTTP_200_OK)

@api_view(['POST'])
def save_book_status(request):
    """Saves or updates a book's shelf status (TO_READ, FINISHED, FAVORITE) and user rating."""
    google_book_id = request.data.get('google_book_id')
    status_val = request.data.get('status')  # 'TO_READ', 'FINISHED', or 'FAVORITE'
    rating_val = request.data.get('rating', 0)

    if not google_book_id or not status_val:
        return Response({"error": "google_book_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create local book reference
    book, _ = Book.objects.get_or_create(
        google_book_id=google_book_id,
        defaults={
            'title': request.data.get('title', ''),
            'authors': request.data.get('authors', ''),
            'description': request.data.get('description', ''),
            'thumbnail': request.data.get('thumbnail', ''),
            'categories': request.data.get('categories', ''),
        }
    )

    user_book, _ = UserBook.objects.update_or_create(
        book=book,
        status=status_val,
        defaults={'rating': int(rating_val)}
    )

    return Response(UserBookSerializer(user_book).data, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_user_shelf(request):
    """Retrieves books for a specific tab filter ('TO_READ', 'FINISHED', 'FAVORITE')."""
    shelf_status = request.GET.get('status', 'TO_READ').upper()
    user_books = UserBook.objects.filter(status=shelf_status).select_related('book')
    return Response(UserBookSerializer(user_books, many=True).data, status=status.HTTP_200_OK)

@api_view(['GET'])
def search_google_books(request):
    """
    Search books via Google Books API.
    Endpoint: GET /api/books/search/?q=query
    """
    query = request.GET.get('q', '')
    if not query:
        return Response([], status=status.HTTP_200_OK)

    books = fetch_google_books(query, max_results=20)
    return Response(books, status=status.HTTP_200_OK)

    
@api_view(['POST'])
def update_book_status(request, book_id):
    """
    Handles moving a book between shelves or removing it entirely.
    Expects payload: {"status": "TO_READ" | "FINISHED" | "FAVORITE" | null}
    """
    user = request.user
    new_status = request.data.get('status') # Can be 'TO_READ', 'FINISHED', 'FAVORITE', or None

    user_book, created = UserBook.objects.get_or_create(
        user=user, 
        book_id=book_id
    )

    # If new_status is None or matches existing status -> Delete/Remove from shelf
    if not new_status or user_book.status == new_status:
        user_book.delete()
        return Response(
            {"message": "Book removed from your collection", "status": None}, 
            status=status.HTTP_200_OK
        )

    # Move to the new shelf
    user_book.status = new_status
    user_book.save()

    return Response(
        {"message": f"Book moved to {new_status}", "status": user_book.status}, 
        status=status.HTTP_200_OK
    )