A backend project combining a city-data REST API with a user-preference dashboard.

index.js: Express API serving city records (name, country, population, timezone, coordinates) from MongoDB, with endpoints to filter by population, country, or region, and to search cities by name with sorting and partial-match options.
index.php: A PHP/MySQL backend for a dashboard page that lets visitors show/hide UI blocks, tracking preferences per-user via cookies with automatic expiry.

