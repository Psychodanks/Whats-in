# GroceryPlanner

A mobile-friendly Progressive Web App (PWA) for managing your household groceries, fridge, freezer, and cupboard inventory. Supports cloud sync, role-based access, and works offline.

## Features

- Add, edit, and remove grocery items with quantities, weights, pack sizes, and best-before dates
- Organize items by location: fridge, freezer, or cupboard
- Customizable kitchen zones with drag-and-drop and renaming
- Cloud sync via Supabase: share your inventory across devices and users
- Role-based access: parent (full access) and child (read-only)
- Invite others to your shared house with secure links or QR codes
- Scan receipts with OCR to quickly add items
- PWA: installable on mobile, works offline, and sends expiry notifications
- Modern, responsive UI for desktop and mobile

## How to Use

1. Open `index.html` in your browser, or deploy to a static web host (e.g., GitHub Pages)
2. Add your groceries by clicking zones or using the add button
3. Enable cloud sync to share your inventory with family or housemates
4. Use the options panel (three dots) to manage zones, cloud, and sharing
5. Install the app to your device for offline use and notifications

## Files

- `index.html` – Main HTML file
- `style.css` – App styling
- `script.js` – Main application logic
- `manifest.json` – PWA manifest
- `sw.js` – Service worker for offline support
- `assets/` – Icons and images

## Cloud Sync Setup

This app uses [Supabase](https://supabase.com/) for cloud sync. You can use the default demo keys or set your own in `script.js` for production use.

## License

MIT License. See repository for details.