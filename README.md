# Sabrina Price Watch

Compare unit prices for Sabrina's reorder list across Target, Sam's, Whole Foods, and Walmart.

- catalog.json — products she reorders
- prices.json — current shelf offers + asOf date
- Cart and typed prices stay in the browser
- Plan trip (cart bar) picks the cheapest one- or two-store route for the cart or the whole list, comparing equal amounts of each item
- New items land in Pending; use Copy JSON / Download patch, then commit into the two JSON files

Do not scrape store sites from this static app. Refresh prices by replacing prices.json.
