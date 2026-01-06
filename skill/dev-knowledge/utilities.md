# Utility Services - Developer Knowledge

Small, stateless services with no auth required.

## Weather (`service-weather`)

**API**: Open-Meteo (free, no key)

```bash
uni weather london              # Current weather
uni weather "new york" -f 3     # 3-day forecast
```

**Implementation notes:**
- Geocoding via Open-Meteo's geocoding API
- Weather codes mapped to descriptions/emojis
- Temperature in Celsius by default

## Currency (`service-currency`)

**API**: Frankfurter (free, no key)

```bash
uni currency 100 usd eur        # Convert
uni currency --list             # All currencies
uni currency --rates usd        # USD rates
```

**Implementation notes:**
- Rates updated daily (not real-time)
- ~30 major currencies supported
- No crypto

## QR Code (`service-qrcode`)

**Library**: `qrcode` npm package (local generation)

```bash
uni qrcode "https://example.com"     # Generate PNG
uni qrcode "text" --terminal         # ASCII art in terminal
uni qrcode "text" -o code.png        # Save to file
```

**Implementation notes:**
- Pure local generation, no API
- Supports terminal output for quick viewing
- PNG output by default

## Short URL (`service-shorturl`)

**API**: is.gd (free, no key)

```bash
uni shorturl "https://very-long-url.com/path/to/page"
```

**Implementation notes:**
- Simple URL shortening
- No custom aliases
- No analytics

## Stocks (`service-stocks`)

**API**: Yahoo Finance (unofficial, no key)

```bash
uni stocks aapl                 # Quote
uni stocks aapl -p 1w           # 1 week history
uni stocks list                 # Popular stocks
uni stocks list crypto          # Cryptocurrencies
```

**Implementation notes:**
- Period syntax: `1d`, `5d`, `1w`, `1m`, `3m`, `1y`
- Includes crypto via Yahoo
- Market hours shown

## ArXiv (`service-arxiv`)

**API**: arXiv API (free)

```bash
uni arxiv search "transformer"  # Search papers
uni arxiv 1706.03762            # Get paper by ID
uni arxiv recent cs.AI          # Recent in category
```

**Implementation notes:**
- Paper IDs include version: `1706.03762v7`
- Categories: cs.AI, cs.LG, math.CO, etc.

## Reddit (`service-reddit`)

**API**: Reddit JSON API (free, no auth)

```bash
uni reddit hot                  # Front page
uni reddit r/programming hot    # Subreddit
uni reddit search "topic"       # Search
```

**Implementation notes:**
- Uses `.json` endpoint (no OAuth needed)
- Rate limited, be gentle

## Hacker News (`service-hn`)

**API**: HN Firebase API (free)

```bash
uni hn top                      # Top stories
uni hn new                      # New stories
uni hn best                     # Best stories
uni hn ask                      # Ask HN
uni hn show                     # Show HN
```

## Wikipedia (`service-wiki`)

**API**: Wikipedia REST API (free)

```bash
uni wiki summary "topic"        # Summary
uni wiki search "query"         # Search
uni wiki random                 # Random article
uni wiki full "topic"           # Full article (long!)
```

**Implementation notes:**
- `full` output can be very long, no pagination
- Summary is usually sufficient

## Common Patterns

All utilities follow:
- No auth required
- Fast responses (< 500ms target)
- Human-readable default output
- `--json` for machine parsing
- Simple, focused commands
