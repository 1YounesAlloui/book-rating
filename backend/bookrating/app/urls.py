from django.urls import path
from . import views

urlpatterns = [
    path('books/home/', views.get_home_feed, name='home_feed'),
    path('books/search/', views.search_google_books, name='search_books'),
    path('books/shelf/save/', views.save_book_status, name='save_shelf_status'),
    path('books/shelf/', views.get_user_shelf, name='get_user_shelf'),
]