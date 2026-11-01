# 3D Data Visualization - Kasatria Assignment

An interactive 3D visualization built with Three.js (CSS3DRenderer), based on the `css3d_periodictable` example. Each tile is a person loaded from a Google Sheet, and the page is gated behind Google Sign-In.

**Live demo:** https://kasatria-assignment-neon.vercel.app/

## Features

- **Google Sign-In:** login screen using Google Identity Services. The 3D scene loads after a successful sign-in.
- **Data from Google Sheets:** the sheet is read as CSV through the Google Sheets `gviz` endpoint and parsed in the browser (200 records).
- **Tile layout:** each tile shows country, age, photo, name and interest.
- **Net worth colouring:** tile border and background are coloured by net worth - red below $100K, orange from $100K to $200K, green above $200K. A legend is shown at the bottom right.
- **Four layouts:** Table (20 x 10), Sphere, Double Helix, and Grid (5 x 4 x 10), with animated transitions between them.
- **Controls:** drag to rotate, scroll to zoom (TrackballControls).

## Tech Stack

- HTML5 / CSS3 / vanilla JavaScript (no build step)
- Three.js r128 (CSS3DRenderer, TrackballControls)
- Google Identity Services
- Hosted on Vercel

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Page markup, login screen and styles |
| `app.js` | Sign-in, sheet loading and parsing, tile creation, layouts and transitions |
| `privacy.html`, `terms.html` | Pages linked from the Google OAuth consent screen |

## Running Locally

1. Clone the repository.
2. Serve the folder with any static server, for example `npx serve .`.
3. Open the served address (for example `http://localhost:3000`).

For sign-in to work on a given address, that address must be listed under **Authorized JavaScript origins** for the OAuth client in Google Cloud Console.

## Configuration

Both values are set at the top of `app.js`:

- `GOOGLE_CLIENT_ID`: OAuth 2.0 Web client ID from Google Cloud Console.
- `SPREADSHEET_ID`: ID of the Google Sheet containing the data.

The sheet must be viewable by anyone with the link, because the page reads it without an access token. Sign-in controls access to the page, not to the sheet itself.

## Sheet Columns

`Name, Photo, Age, Country, Interest, Net Worth` (in this order).
