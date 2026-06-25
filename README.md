# BatchBay

> Bulk-list trading cards on eBay from a spreadsheet. Upload CSV/Excel, map columns, apply your HTML template, and publish hundreds of listings in minutes.

## Features

- **📤 Upload & Parse** — Upload CSV or Excel files (.csv, .xlsx, .xls) with your card data
- **🔗 Column Mapping** — Map spreadsheet columns to eBay fields (title, price, condition, photos, etc.)
- **🎨 HTML Template Engine** — Create custom listing templates with `{{placeholder}}` variables
- **🖼️ Photo Handling** — Attach 2+ photos per listing from provided URLs
- **📋 Batch Review** — Preview all generated listings before publishing
- **🚀 One-Click Publish** — Publish to eBay with eBay API integration (configurable)
- **📊 Dashboard** — Quick overview of system status and workflow

## Tech Stack

- **Frontend**: Vite + React + Tailwind CSS + React Router
- **Backend**: Express.js (Node.js)
- **Database**: In-memory (MVP stage; SQLite/Turso ready for production)
- **File Parsing**: csv-parse, xlsx (SheetJS)

## Project Structure

```
batchbay/
├── package.json                # Root monorepo config (concurrently for dev)
├── README.md
├── server/                     # Express API backend
│   ├── package.json
│   ├── .env / .env.example
│   └── src/
│       ├── index.js            # Entry point, middleware, routes
│       ├── routes/
│       │   ├── upload.js       # File upload & parsing endpoint
│       │   ├── listings.js     # Preview & publish endpoints
│       │   ├── ebay.js         # eBay API integration (stubs)
│       │   └── templates.js    # HTML template management
│       └── services/
│           └── parser.js       # CSV/Excel parsing engine
└── client/                     # Vite + React frontend
    ├── package.json
    ├── vite.config.js          # Dev proxy to backend on port 3001
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx             # Router & navigation layout
        ├── index.css           # Tailwind imports
        ├── api/
        │   └── client.js       # API client functions
        └── pages/
            ├── DashboardPage.jsx   # Home/status overview
            ├── UploadPage.jsx      # Upload & column mapping
            ├── ReviewPage.jsx      # Batch review & publish
            └── TemplatesPage.jsx   # HTML template editor
```

## Setup

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repo-url> batchbay
cd batchbay

# Install all dependencies (root, server, client)
npm run install:all
```

### Development

```bash
# Start both server (port 3001) and client (port 5173) concurrently
npm run dev

# Or start them separately:
npm run dev:server   # Backend on http://localhost:3001
npm run dev:client   # Frontend on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the Express backend on port 3001.

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

### eBay API Configuration (Optional)

To enable actual eBay listing creation, set credentials in `server/.env`:

```
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_REDIRECT_URI=http://localhost:3001/api/ebay/callback
```

Without credentials, the app works in preview/draft mode.

## Usage Flow

1. **Prepare your spreadsheet** — CSV or Excel with columns for: title, description, price, condition, photo URLs, etc.
2. **Upload** — Go to the Upload page, select your file, and parse it
3. **Map Columns** — Match your spreadsheet columns to eBay fields
4. **Customize Template** — (Optional) Create an HTML template with `{{title}}`, `{{description}}`, `{{price}}`, `{{condition}}`, `{{photos}}` placeholders
5. **Review** — Preview all generated listings, check photos, toggle selections
6. **Publish** — One-click publish to eBay (or save as drafts when eBay API is not configured)

## CSV Format Example

```csv
title,description,price,condition,category,photo_urls,quantity,sku
"Charizard VMAX","Near mint Charizard VMAX",150.00,Near Mint,183454,"https://imgur.com/1.jpg,https://imgur.com/2.jpg",1,CHAR-001
"Pikachu Illustrator","Legendary promo",250000.00,Used,183454,"https://imgur.com/pika1.jpg",1,PIK-001
```

## License

MIT