# Phase 14: Universal Utilities

> Status: PENDING

## Overview

Universal utilities that work for everyone without any API keys or authentication. These commands solve everyday problems with free, publicly available APIs or local computation.

**Design Principles:**
- Zero configuration required
- No API keys or auth needed
- Fast responses (< 500ms)
- Works offline where possible
- Consistent output format with other services

---

## Commands

### weather

**Get current weather or forecast for a location.**

```bash
uni weather                           # Current location (requires geoloc)
uni weather London                    # City name
uni weather "New York, US"            # Full city query
uni weather 40.7128,-74.0060          # Lat,long
uni weather London --forecast 7       # 7-day forecast
uni weather London --json             # JSON output
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| location | No* | City name or coordinates. Uses geolocation if omitted. |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--forecast` | Number | Days to forecast (1-7, default: current only) |
| `--json` | Boolean | JSON output |

**Examples:**
```bash
uni weather Tokyo
# Output:
# Tokyo, Japan
# 72°F (22°C), Partly Cloudy
# Humidity: 65% | Wind: 8 mph

uni weather London --forecast 3 --json
# {"location":"London","current":{"temp":58,"condition":"Rainy",...}}
```

**Implementation:**
- API: Open-Meteo (https://open-meteo.com/)
- Geocoding: Open-Meteo Geocoding API (no key required)
- Caching: Cache for 15 minutes to avoid rate limits

---

### currency

**Convert currencies with live exchange rates.**

```bash
uni currency 100 usd                  # USD to default (EUR)
uni currency 100 usd to jpy           # USD to JPY
uni currency 100 eur to gbp           # EUR to GBP
uni currency 5000 jpy to usd eur      # JPY to USD and EUR
uni currency --list                   # List supported currencies
uni currency 100 usd to jpy --json    # JSON output
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| amount | Yes | Amount to convert |
| from | Yes | Source currency code (USD, EUR, JPY, etc.) |
| to | Yes* | Target currency code(s). Multiple allowed. |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--list` | Boolean | List all supported currencies |
| `--json` | Boolean | JSON output |
| `--source` | String | API source (default: frankfurter) |

**Examples:**
```bash
uni currency 100 usd to jpy
# 100 USD = 15,050 JPY

uni currency 1000 eur to usd gbp
# 1000 EUR = 1,085 USD
# 1000 EUR = 852 GBP

uni currency --list
# Supported currencies:
# USD, EUR, JPY, GBP, CHF, CAD, AUD, CNY, ...
```

**Implementation:**
- API: frankfurter.app (ECB data, no key)
- Fallback: open.er-api.com (no key)
- Supported: 30+ major currencies
- Caching: Cache rates for 1 hour

---

### qrcode

**Generate QR codes from text or URLs.**

```bash
uni qrcode "https://example.com"                    # Generate QR code
uni qrcode "https://example.com" --output qr.png    # Save to file
uni qrcode "wifi:WIFI-S;T:WPA;P:password;;"        # WiFi QR code
uni qrcode "https://example.com" --size 500        # Custom size
uni qrcode "Hello World" --foreground #000000      # Colors
uni qrcode "https://example.com" --terminal        # Display in terminal
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| content | Yes | Text, URL, or data to encode |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--output` | String | Output file path (PNG) |
| `--size` | Number | QR code size in pixels (default: 256) |
| `--foreground` | String | Foreground color (hex) |
| `--background` | String | Background color (hex) |
| `--terminal` | Boolean | Display in terminal (ASCII) |
| `--json` | Boolean | JSON output |

**Examples:**
```bash
uni qrcode "https://mysite.com/payment" --output payment.png
# Generated: payment.png (256x256)

uni qrcode "https://example.com" --terminal
# ████████████████
# ████████████████
# ██  ██    ██  ██
# ██  ██    ██  ██
# ...

uni qrcode "https://example.com" --json
# {"content":"https://example.com","size":256,"file":"payment.png"}
```

**Implementation:**
- Library: `qrcode` npm package
- Output formats: PNG, SVG, terminal (ASCII art)
- Terminal display: Uses block characters for QR visualization
- Error correction: Level M (15% damage)

---

### shorturl

**Shorten long URLs using free services.**

```bash
uni shorturl "https://very-long-url.com/with/many/params"  # Shorten URL
uni shorturl "https://..." --service is.gd                  # Specify service
uni shorturl "https://..." --custom "my-custom-code"       # Custom alias
uni shorturl --expand "https://is.gd/xxxxx"               # Expand short URL
```

**Arguments:**
| Arg | Required | Description |
|-----|----------|-------------|
| url | Yes* | URL to shorten. Required unless `--expand` is used. |

**Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--service` | String | Service to use (is.gd, tinyurl, t.ly) |
| `--custom` | String | Custom alias for the short URL |
| `--expand` | String | Expand a short URL back to original |
| `--json` | Boolean | JSON output |

**Examples:**
```bash
uni shorturl "https://example.com/very/long/path?query=value"
# Original: https://example.com/very/long/path?query=value
# Short: https://is.gd/abc123

uni shorturl "https://..." --expand
# Expanded: https://original-long-url.com

uni shorturl "https://..." --json
# {"original":"https://...","short":"https://is.gd/abc123","service":"is.gd"}
```

**Implementation:**
- Primary: is.gd (no key, no rate limit)
- Fallback: tinyurl.com (no key)
- Custom aliases: Not guaranteed, depends on availability
- Expand: Reverses the shortening

---

## Service Discovery

These utilities are built-in services, auto-discovered like others:

```bash
uni list
# ...
# weather     Weather forecasts            [builtin]
# currency    Currency converter           [builtin]
# qrcode      QR code generator            [builtin]
# shorturl    URL shortener                [builtin]
```

---

## Output Formats

### Human Format
```bash
uni weather London
# London, GB
# 68°F (20°C), Partly Cloudy
# Feels like: 70°F
# Humidity: 62% | Wind: 7 mph
```

### JSON Format
```bash
uni weather London --json
# {
#   "location": "London",
#   "country": "GB",
#   "current": {
#     "temp": 20,
#     "temp_f": 68,
#     "condition": "Partly Cloudy",
#     "feels_like": 21,
#     "humidity": 62,
#     "wind_mph": 7
#   }
# }
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Network failure | User-friendly message: "Unable to connect. Check internet." |
| Invalid location | "Location not found. Try city name or coordinates." |
| Invalid currency | "Unknown currency code. Use --list to see supported currencies." |
| API rate limit | "Too many requests. Wait a moment and try again." |

---

## Files to Create

```
packages/
├── service-weather/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       └── weather.ts
│   ├── package.json
│   └── README.md
│
├── service-currency/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       └── currency.ts
│   ├── package.json
│   └── README.md
│
├── service-qrcode/
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       └── qrcode.ts
│   ├── package.json
│   └── README.md
│
└── service-shorturl/
    ├── src/
    │   ├── index.ts
    │   └── commands/
    │       └── shorturl.ts
    ├── package.json
    └── README.md
```

---

## Dependencies

```json
{
  "dependencies": {
    "qrcode": "^1.5.3"
  }
}
```

All other functionality uses native Node.js or free public APIs.

---

## Configuration

No configuration required. Each service works out of the box.

Optional overrides in `~/.uni/config.toml`:
```toml
[weather]
default_city = "New York"
units = "fahrenheit"  # or celsius

[currency]
default_from = "USD"

[qrcode]
default_size = 256
foreground = "#000000"
background = "#ffffff"

[shorturl]
service = "is.gd"
```

---

## Testing Checklist

- [ ] `uni weather` works with current location
- [ ] `uni weather London` returns correct data
- [ ] `uni weather Tokyo --forecast 3` shows 3-day forecast
- [ ] `uni weather --json` returns valid JSON
- [ ] `uni currency 100 usd to jpy` converts correctly
- [ ] `uni currency --list` shows supported currencies
- [ ] `uni currency --json` returns valid JSON
- [ ] `uni qrcode "text"` generates QR code
- [ ] `uni qrcode "text" --output file.png` saves to file
- [ ] `uni qrcode "text" --terminal` shows ASCII art
- [ ] `uni shorturl "url"` creates short link
- [ ] `uni shorturl "url" --expand` reverses it
- [ ] All commands return error on network failure
- [ ] All commands support `--json` flag
- [ ] Services appear in `uni list`

---

## Performance

| Command | Target Response Time |
|---------|---------------------|
| `uni weather` | < 500ms |
| `uni currency` | < 300ms |
| `uni qrcode` | < 200ms |
| `uni shorturl` | < 500ms |

Caching:
- Weather: 15 minutes
- Currency rates: 1 hour
- Geocoding: 24 hours

---

## Why These Commands?

**weather** - Everyone checks weather daily
**currency** - Freelancers, travelers, traders
**qrcode** - Payments, WiFi sharing, tickets
**shorturl** - Clean links in chat/email

All solve real problems with zero setup. No other CLI has this combination.

---

## Future Extensions

These can be added as optional npm packages:

```bash
# Install additional utilities
uni install wolfram      # Wolfram Alpha queries
uni install hackernews   # Hacker News top stories
uni install reddit       # Reddit frontpage
uni install translate    # Full translation service
```

The core stays lean; users add what they need.
