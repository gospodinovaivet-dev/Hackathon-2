# ChillCheck – MVP Plan

## Target audience
- **Housekeepers:** busy households that forget what's in the fridge (Katerina)
- **Big retailers:** online grocery stores and supermarkets like eBag that lose money on expired stock in many fridges (Georgi, warehouse manager)

## Why it matters
Research found that at least 23–24% of expiration waste at one retailer came from mixed expiry dates on the same shelf: old items hidden behind new ones. Manual checks miss them. Cameras don't.

## Requirements
- Cameras take a photo of the shelves every time the door closes
- The app recognizes food and gives each item an expiry date (editable)
- Statuses: 🟢 Safe / 🟡 Eat soon (≤2 days) / 🔴 Expired, sorted by urgency
- Door open too long → buzzer + app alert (60s for homes, adjustable for warehouses)
- Temperature sensor: fridge too warm → app alert ("Your fridge is at 9°C, food may spoil faster")
- Remote view of the food list, latest photo and current temperature
- Retailers: dashboard with all fridges in one warehouse, and alerts for expired items
- Retailers: staff roles (manager sees everything, workers see only their section)
- Retailers: identical products grouped (e.g. 50 yoghurts → one row with the earliest date)
- Photos encrypted, only the latest one kept, unique device code, no default passwords

## Flows
**Setup:** User → opens app → logs in → enters the device code → fridge is paired

**Auto-scan (Katerina):** Closes fridge door → cameras take a photo → app updates the food list → Katerina checks/edits expiry dates → sees Eat Me First list

**Eat Me First (Katerina):** Opens app → Home → taps "Eat Me First" → sees items sorted by status: 🟢 Safe / 🟡 Eat soon / 🔴 Expired

**Warehouse check (Georgi):** Opens app → Dashboard → sees all fridges with their status and temperature → taps a fridge with 🔴 → sees which products expired and on which shelf → marks them "removed"

**Door alarm (both):** Door opens → timer starts → time limit passes → buzzer beeps + app shows "Your fridge door is open!" → door closes → alert clears

**Temperature alert (both):** Temperature rises above 8°C for 10+ minutes → app shows "Your fridge is too warm!" → temperature returns to normal → alert clears

## Edge cases
- **Food not recognized or hidden** → user adds or names it manually
- **Wrong expiry estimate** → user edits the date
- **Hundreds of identical items** → grouped, with the earliest expiry date shown
- **Warehouse fridges opened all day** → alarm time is adjustable
- **Short temperature rise when the door opens** → alert only if it stays high for 10+ minutes
- **Foggy/dark photo** → LED light on before each photo; if unclear, the app asks for a manual check
- **No internet / power cut** → device reconnects by itself; app shows "Last updated: [time]"

## Hardware
- 2 cameras (cold and humidity rated) + LED light
- Controller with secure boot (e.g. ESP32-S3)
- Magnetic door sensor + buzzer
- Temperature sensor (e.g. DS18B20, ~€2)

## Priorities
### 1. Главна цел (Main goal)
**Auto-scan + Eat Me First list:** door closes → photo → food list with expiry dates, sorted by urgency.

### 2. Пожелателни (Nice to have)
- recipe suggestions for housekeepers
- analysis of your most bought things
- shoppig list suggestion
- if smth in unknown, circle it in purple
- Door alarm
- Temperature alert
- Retailer dashboard for many fridges
- Remote view of the latest photo
- 
- *(Future)* automatic "sell soon" discounts on eBag's website
- *(Future)* reading printed expiry dates and barcodes
- *(Future)* flagging expiring items for donation to food banks
  
## The app recognizes food and gives each item an expiry date (editable)
- Packing?? [not quite sure]
  - * package
    *   - barcode
        - no barcode
        - visible
        - transparent
    * no package 
    *  bar code - typr of food, but no expire date
    if expire date- expire date,  two dates- prouction date, date not visible
    If it got food in the wrong packaging (Cookies in an ice cream box) - It can see that by logic the ice cream bx is not in a freezer;
    If it got a not visible pack or transperent one -  if there is a non visible package it will ask for whats inside and ask to check in the date you got it;
- Cooked [yes]

## 
