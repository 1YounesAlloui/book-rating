# 📚 Personal Library Tracker

A cross-platform mobile application for tracking personal reading lists, categorizing books into custom shelves (`To Read`, `Finished`, `Favorites`), and managing reading statuses with real-time backend synchronization.

---

## ⚡ Tech Stack

### **Frontend**
* **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
* **Language:** TypeScript
* **UI Components:** Custom Dark Mode styling (`StyleSheet`), `@expo/vector-icons` (`Ionicons`)
* **State & Networking:** React Hooks (`useState`, `useEffect`), Async Fetch API with optimistic updates

### **Backend**
* **Framework:** [Django REST Framework (DRF)](https://www.django-rest-framework.org/)
* **Language:** Python
* **Database:** SQLite (Development) / PostgreSQL (Production)
* **API Architecture:** RESTful Endpoints

---

## ✨ Features

* **Multi-Tab Shelving:** Categorize books into `To Read`, `Finished`, and `Favorites` with real-time count updates.
* **Interactive Book Detail Modal:** View comprehensive book details and switch status on the fly.
* **Optimistic UI Updates:** Instant UI responses during status changes with fallback refetching on server errors.
* **Pull-to-Refresh:** Integrated `RefreshControl` for fetching updated server state.
* **Multi-Platform Network Routing:** Automatic `BASE_URL` resolution across Web (`localhost`), Android Emulator (`10.0.2.2`), and iOS.
* **Sleek Dark Theme:** Clean interface tailored for night reading and high contrast visibility.

---
