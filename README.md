# ChillCheck

ChillCheck is a smart-fridge app prototype that helps people remember what is in their fridge and use food before it goes to waste. Instead of searching behind containers or checking every label, users get an **Eat Me First** list, organised by expiry date, food type and shelf.

The intended workflow is **close the fridge door → take a shelf photo → recognise food → review the dates → eat the most urgent items first**. The current hackathon MVP demonstrates this workflow in a browser with example scans and simulated sensor readings. Real photo recognition requires a compatible Claude artifact environment.

## The idea and who it helps

Busy households often forget leftovers or buy food they already have. ChillCheck makes these items visible, suggests recipes and lets users correct names and dates. A future retailer version could help staff find older stock across multiple fridges and reduce expiry waste.

The app also considers everyday packaging surprises. In Balkan households, an ice cream tub may contain **rice-stuffed peppers**, soup or cookies. ChillCheck asks users to check uncertain contents and treats recognised cooked leftovers according to the food inside, rather than the original packaging date.

## What the prototype includes

- A demo pairing screen and a fridge overview with product photos.
- **Eat Me First**: expired, eat-soon, safe and unknown-date groups; dates can be edited and finished items removed.
- An interactive fridge map and food-type filters, including cooked meals.
- Example scans with pasta, vegetable soup, rice-stuffed peppers in an ice cream tub, and an opaque container whose contents need confirmation.
- Recipe suggestions, example recipe photos and a food information screen.
- Simulated temperature and door readings with in-app alerts.
- Browser storage so the food list survives a page refresh.
- Optional photo, receipt and printed-date recognition, AI recipes and account-based data sync when the host provides the required Claude capabilities.

The local pairing form is a demo, not real authentication or a hardware connection. Multi-fridge retailer dashboards, staff roles, physical cameras, buzzers and device connectivity are future work. Generated food photos are illustrative; they are not evidence of a scanned item's freshness.

## Technologies and why they fit

| Technology | What it does | Why it fits this MVP |
| --- | --- | --- |
| HTML5 | Defines screens, forms and semantic controls | Keeps the interface straightforward and runnable directly in a browser. |
| CSS | Responsive layouts, light/dark themes and the Strawberry Matcha palette | Grid, Flexbox and custom properties provide consistent styling without a UI framework. |
| Vanilla JavaScript | Navigation, food rules, filters, scan review and rendering | Keeps the prototype small, with no framework setup or package-install step. Responsibilities are split into focused files. |
| Browser `localStorage` | Saves the local profile, paired-device details and food list | Provides persistence for the demo without requiring a database server. Local state belongs to the browser and site address being used. |
| Canvas and SVG | Prepare scan images, draw detection overlays and provide fallback recipe illustrations | Built-in browser graphics avoid extra image-processing dependencies. |
| Claude host capabilities | Optional AI image recognition, recipe generation and user data sync | Allow the prototype to demonstrate AI features when the embedding host provides them. These capabilities are not supplied by the local server. |
| Node.js built-in `fs` and `path` modules | Bundle the app and images into one HTML file | A small build script makes the prototype easy to share without a bundler or npm dependencies. |
| Python's `http.server` | Serves the app locally during development | A simple way to open all project files under one local URL; it is not an application backend. |
| Google Fonts and QRCode.js | Typography and the phone-link QR code | Add visual polish and phone handoff; these assets load from external services. |

The planned hardware concept uses cameras and an LED light, a controller such as an ESP32-S3, a magnetic door sensor, a temperature sensor and a buzzer. None of this hardware is required to run the browser demo.

## Prerequisites

For the recommended local setup:

- A modern browser such as Chrome, Edge, Firefox or Safari.
- **Python 3** to run the local HTTP server.
- **Git** to clone the repository, or download and extract its ZIP instead.

Optional:

- **Node.js** to run `build.js` after changing source files or camera photos. No `npm install` is needed; the build uses only Node's built-in modules.
- Internet access for Google Fonts, the QR-code library and host-provided AI features. The local example workflow does not require an AI account or API key.
- A compatible Claude artifact host with the relevant capabilities enabled for real AI scans and sync. Starting the local server alone does not enable these features.

## How to start the app

### 1. Get the repository

```sh
git clone https://github.com/gospodinovaivet-dev/Hackathon-2.git
cd Hackathon-2
```

If you already have the project, open a terminal in the existing `Hackathon-2` folder instead.

### 2. Start the local server

On macOS or Linux:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

On Windows with the Python launcher:

```powershell
py -3 -m http.server 8080 --bind 127.0.0.1
```

### 3. Open the app

Visit **[http://127.0.0.1:8080/](http://127.0.0.1:8080/)** in your browser. Keep the terminal running while using the app. Press **Ctrl+C** in that terminal to stop the server.

For a quick preview, you can also open `index.html` directly. The local server is preferable because browser file-access and storage behaviour can differ for `file://` pages.

## Try the demo

1. Select **Fill in demo details**, then **Pair fridge**. The example device code is `CC-A7F3-2291`.
2. Select **Check inside**. With no camera photos configured, this runs an example scan. If a photo picker appears, choose **Example data**.
3. Review the names and dates, including the warning for the rice-stuffed peppers in the reused ice cream tub, then save the list.
4. Open **Eat Me First**. Try the shelf map and **Cooked meals** filter, change a date or mark an item as eaten.
5. Open **Recipes** to see the example dishes and photos. In a regular local browser, these are examples rather than newly generated AI results.
6. Run another example scan to see how existing, missing and new items are reviewed.

To reset the demo, use **Unpair fridge** and confirm with the second click. This clears the saved profile and food list.

## Build the shareable version

From the project root:

```sh
node build.js
```

This refreshes `js/photos.js` and writes **`dist/chillcheck.html`**, embedding the app's CSS, JavaScript and local food/camera images. With the local server running, open [http://127.0.0.1:8080/dist/chillcheck.html](http://127.0.0.1:8080/dist/chillcheck.html).

Run the build again after changing source files or images if you want the bundled version to include those changes. External fonts and QRCode.js remain external dependencies; the bundle does not add AI support to a normal browser.

## Add camera photos

1. Create a `photos/` folder in the project root.
2. Add fridge images in JPG, JPEG, PNG, WebP or GIF format.
3. Run `node build.js` and refresh the app.
4. Select **Check inside** to choose a camera image.

The folder stands in for the planned fridge camera. Analysing these images requires the host's AI image capability. **Example data** remains available without it. The separate `assets/products/` folder holds illustrative product and recipe photos, not camera input.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | App screens and script entry point. |
| `css/styles.css` | Layout, responsive styling and themes. |
| `js/app.js` | Navigation, review flow, fridge map and UI events. |
| `js/food.js`, `js/dates.js` | Food categories, expiry rules, date helpers and example scans. |
| `js/store.js` | Local state and optional host-provided sync. |
| `js/scanner.js` | AI scan integration and scan-response processing. |
| `js/products.js`, `assets/products/` | Product/recipe photography, mappings and generation prompts. |
| `js/recipes.js`, `js/dish.js`, `js/health.js` | Recipes, fallback illustrations and food information. |
| `js/sensors.js`, `js/ui.js` | Simulated sensor display and shared UI helpers. |
| `photos/`, `js/photos.js` | Optional camera input and its generated manifest. |
| `build.js`, `dist/chillcheck.html` | Build script and generated shareable app. |
| `archive/` | Earlier prototypes. |

## Troubleshooting

- **Port 8080 is already in use:** use port `8081` in the server command and open `http://127.0.0.1:8081/`.
- **The page shows a directory listing or a 404:** start the server from the folder containing `index.html`.
- **Python is not found:** install Python 3 and reopen the terminal; on Windows, try the `py -3` command above.
- **AI scanning is unavailable:** this is expected in a regular local browser. Use **Example data**; real scans depend on the host integration.
- **Changes do not appear:** refresh the page. If viewing `dist/chillcheck.html`, run `node build.js` first.
- **Saved items seem missing:** use the same browser, hostname and port as before. `localhost`, `127.0.0.1` and different ports have separate browser storage.
- **Phone handoff opens a different app copy:** the QR link uses the configured Claude artifact URL in `js/app.js`; it does not expose or mirror your local server.
