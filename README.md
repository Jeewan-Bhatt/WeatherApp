# Cloudline — Live Weather Dashboard

A responsive city weather dashboard built with semantic HTML, CSS, and vanilla JavaScript. It uses the free Open-Meteo geocoding and forecast APIs, with no API key.

## Features

- Search for a city and show live current conditions plus a five-day forecast.
- Display temperature, condition, feels-like temperature, humidity, wind, precipitation, and daily highs/lows.
- Use accessible weather SVGs and text labels for WMO weather codes.
- Validate empty and very short searches; show distinct loading, not-found, API, and network messages.
- Check `response.ok` before reading JSON and safely render API values with `textContent`.
- Remember the last successful city in `localStorage` and reload it at startup. Kathmandu is the first-visit example.
- Responsive layout with keyboard focus styles and reduced-motion support.

## Run locally

Open `index.html` in a browser or use VS Code Live Server. Search requests are made only when the form is submitted, so typing does not trigger repeated API calls.

## Data and attribution

City lookup uses the [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api). Current conditions and five forecast days use the [Open-Meteo Forecast API](https://open-meteo.com/en/docs). Geocoding uses GeoNames location data. The browser stores only the last successful city name; no API key is required.

## Publish

Put `index.html`, `styles.css`, and `app.js` at the root of a GitHub repository, then enable GitHub Pages in **Settings → Pages → Deploy from a branch**. Choose the default branch and `/ (root)`.
