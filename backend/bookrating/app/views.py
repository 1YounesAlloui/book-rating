import os
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Book, UserBook
from .serializers import UserBookSerializer

GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")
HEADERS = {'User-Agent': 'BookDiscoveryApp/1.0 (contact@example.com)'}


# ─── API Fetchers ──────────────────────────────────────────────────

def fetch_google_books(query, max_results=10):
    url = (
        f"https://www.googleapis.com/books/v1/volumes"
        f"?q={query}&maxResults={max_results}&key={GOOGLE_BOOKS_API_KEY}"
    )
    try:
        res = requests.get(url, headers=HEADERS, timeout=5)
        if res.status_code != 200:
            return []
        items = res.json().get('items', [])
        books = []
        for item in items:
            info = item.get('volumeInfo', {})
            books.append({
                'google_book_id': item.get('id', ''),
                'title': info.get('title', 'Unknown Title'),
                'authors': ", ".join(info.get('authors', ['Unknown Author'])),
                'description': info.get('description', ''),
                'thumbnail': info.get('imageLinks', {}).get('thumbnail', ''),
                'categories': ", ".join(info.get('categories', ['General'])),
            })
        return books
    except Exception:
        return []


def fetch_open_library_books(query, limit=10):
    url = f"https://openlibrary.org/search.json?q={query}&limit={limit}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=5)
        if res.status_code != 200:
            return []
        docs = res.json().get('docs', [])
        books = []
        for item in docs:
            key = item.get('key', '').replace('/works/', '')
            cover_id = item.get('cover_i')
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else ''

            subjects = item.get('subject', [])
            categories_str = ", ".join(subjects[:2]) if isinstance(subjects, list) and subjects else 'General'

            first_sentence = item.get('first_sentence')
            desc = first_sentence[0] if isinstance(first_sentence, list) and first_sentence else ''

            books.append({
                'google_book_id': f"ol_{key}",
                'title': item.get('title', 'Unknown Title'),
                'authors': ", ".join(item.get('author_name', ['Unknown Author'])),
                'description': desc,
                'thumbnail': cover_url,
                'categories': categories_str,
            })
        return books
    except Exception:
        return []


def fetch_gutendex_books(query):
    """Fetches free classic eBooks from Project Gutenberg via Gutendex API."""
    url = f"https://gutendex.com/books/?search={query}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=5)
        if res.status_code != 200:
            return []
        results = res.json().get('results', [])
        books = []
        for item in results:
            gutenberg_id = item.get('id')
            
            # Format authors safely (gutendex returns author objects)
            authors_list = [a.get('name', '') for a in item.get('authors', []) if a.get('name')]
            authors_str = ", ".join(authors_list) if authors_list else 'Unknown Author'
            
            # Get primary category/subject
            subjects = item.get('subjects', [])
            categories_str = subjects[0].split(' -- ')[0] if subjects else 'Classic Literature'
            
            # Formulate Project Gutenberg cover image URL
            formats = item.get('formats', {})
            thumbnail = formats.get('image/jpeg', f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.cover.medium.jpg")

            books.append({
                'google_book_id': f"gutenberg_{gutenberg_id}",
                'title': item.get('title', 'Unknown Title'),
                'authors': authors_str,
                'description': f"Public Domain Classic with {item.get('download_count', 0)} downloads on Project Gutenberg.",
                'thumbnail': thumbnail,
                'categories': categories_str,
            })
        return books
    except Exception:
        return []


def fetch_openbd_books(isbn):
    """OpenBD searches specifically by ISBN."""
    clean_isbn = isbn.replace('-', '').strip()
    url = f"https://api.openbd.jp/v1/get?isbn={clean_isbn}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=5)
        if res.status_code != 200:
            return []
        data = res.json()
        if not data or data[0] is None:
            return []

        summary = data[0].get('summary', {})
        return [{
            'google_book_id': f"obd_{summary.get('isbn', clean_isbn)}",
            'title': summary.get('title', 'Unknown Title'),
            'authors': summary.get('author', 'Unknown Author'),
            'description': summary.get('volume', ''),
            'thumbnail': summary.get('cover', ''),
            'categories': 'General',
        }]
    except Exception:
        return []


def search_all_sources(query, max_results=20):
    """
    Fetches books from Google, OpenLibrary, Gutendex, and OpenBD (if search query is an ISBN),
    merging and deduplicating results.
    """
    results = []

    # If query looks like an ISBN, try OpenBD first
    clean_query = query.replace('-', '').strip()
    if clean_query.isdigit() and len(clean_query) in (10, 13):
        results.extend(fetch_openbd_books(clean_query))

    # Fetch from providers
    google_books = fetch_google_books(query, max_results=max_results)
    open_lib_books = fetch_open_library_books(query, limit=10)
    gutendex_books = fetch_gutendex_books(query)

    results.extend(google_books)
    results.extend(open_lib_books)
    results.extend(gutendex_books)

    # Deduplicate results based on lowercased title and primary author
    seen = set()
    deduped_books = []
    for book in results:
        title_key = book['title'].strip().lower()
        author_key = book['authors'].split(',')[0].strip().lower() if book['authors'] else ''
        dedupe_key = f"{title_key}|{author_key}"

        if dedupe_key not in seen:
            seen.add(dedupe_key)
            deduped_books.append(book)

    return deduped_books[:max_results]


# ─── Django Views ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def get_home_feed(request):
    """Fetches trending books and curated genres for the Home Tab."""
    genres = [
        'Fiction', 'Technology', 'Science', 'History',
        'Fantasy', 'Philosophy', 'Psychology', 'Business',
        'Biography', 'Mystery',
    ]

    feed = {
        'trending': search_all_sources('subject:bestsellers', max_results=12),
        'recommended': search_all_sources('subject:award winning books', max_results=12),
        'genres': {}
    }

    for genre in genres:
        feed['genres'][genre] = search_all_sources(
            f'subject:{genre.lower()}', max_results=8
        )

    return Response(feed, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_book_status(request):
    google_book_id = request.data.get('google_book_id')
    status_val = request.data.get('status')
    rating_val = request.data.get('rating', 0)

    if not google_book_id or not status_val:
        return Response(
            {"error": "google_book_id and status are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

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
        user=None,   # consistent with update_book_status
        book=book,
        defaults={'status': status_val, 'rating': int(rating_val)}
    )

    return Response(UserBookSerializer(user_book).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_library(request):
    user_books = UserBook.objects.filter(user=None).select_related('book')
    return Response(
        UserBookSerializer(user_books, many=True).data,
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_shelf(request):
    shelf_status = request.GET.get('status', 'TO_READ').upper()
    user_books = UserBook.objects.filter(
        user=None, status=shelf_status
    ).select_related('book')
    return Response(
        UserBookSerializer(user_books, many=True).data,
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def search_google_books(request):
    """
    Search books via Google, OpenLibrary, Gutendex, and OpenBD APIs.
    Endpoint: GET /api/books/search/?q=query
    """
    query = request.GET.get('q', '')
    if not query:
        return Response([], status=status.HTTP_200_OK)

    books = search_all_sources(query, max_results=20)
    return Response(books, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def update_book_status(request, google_book_id):
    new_status = request.data.get('status')

    try:
        book = Book.objects.get(google_book_id=google_book_id)
    except Book.DoesNotExist:
        return Response(
            {"error": f"Book '{google_book_id}' not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    user_book = UserBook.objects.filter(user=None, book=book).first()

    if not new_status:
        if user_book:
            user_book.delete()
        return Response(
            {"message": "Book removed from shelf", "status": None},
            status=status.HTTP_200_OK
        )

    if user_book is None:
        user_book = UserBook.objects.create(
            user=None,
            book=book,
            status=new_status
        )
    elif user_book.status == new_status:
        user_book.delete()
        return Response(
            {"message": "Book removed from shelf", "status": None},
            status=status.HTTP_200_OK
        )
    else:
        user_book.status = new_status
        user_book.save()

    return Response(
        {"message": f"Book moved to {new_status}", "status": user_book.status},
        status=status.HTTP_200_OK
    )