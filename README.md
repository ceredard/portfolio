# Engineering Portfolio + Print Shop

A static website with:

- **Portfolio** – project cards, filterable by category, each with a write-up, photo gallery, spec table, and an **interactive 3D viewer** (STL, 3MF, OBJ, GLB, GLTF) that shows the part's bounding-box dimensions.
- **Print shop** – items with prices and color swatches, plus a **custom print request** option with file upload. Orders go to your email through Netlify Forms. No payment is taken on the site; you invoice after confirming.
- **Admin panel** at `/admin/` – add and edit projects, photos, 3D models, and shop items in the browser. Every save publishes to the live site.

Everything the site shows lives in three files: `content/site.json`, `content/projects.json`, and `content/shop.json`. The admin panel edits those for you.

---

## One-time setup (about 20 minutes)

### 1. Put the site on GitHub
1. Create a free account at github.com if you don't have one.
2. Create a new repository, e.g. `portfolio` (public or private both work).
3. Upload every file in this folder to it (on the repo page: **Add file → Upload files**, drag the whole folder contents in, commit).

### 2. Connect Netlify
1. Sign up at netlify.com with your GitHub account.
2. **Add new site → Import an existing project → GitHub →** pick `portfolio`.
3. Leave the build command empty and the publish directory as `.` (the included `netlify.toml` sets this). Deploy.
4. Under **Site configuration → Site details → Change site name** pick something like `credard` → `https://credard.netlify.app`. You can add your own domain later under **Domain management**.

### 3. Turn on order emails
1. In Netlify: **Forms → Enable form detection**, then trigger a redeploy (**Deploys → Trigger deploy**).
2. After the redeploy, the form named **order** appears under Forms.
3. **Forms → Form notifications → Add notification → Email notification**, form `order`, your email.
4. Place a test order on the live site to confirm it arrives.

Netlify's free plan includes 100 form submissions a month and file uploads up to 8 MB. Submissions are also listed in the Netlify dashboard. Spam is filtered with a hidden honeypot field plus Netlify's own filter.

### 4. Turn on the admin panel login
The editor logs in with GitHub, using Netlify as the go-between.

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: `https://YOUR-SITE.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Create it, then **Generate a new client secret**. Copy the Client ID and secret.
2. In Netlify: **Site configuration → Access & security → OAuth → Install provider → GitHub**, paste the ID and secret.
3. Edit `admin/config.yml` in your repo and set:
   ```yaml
   repo: YOUR-GITHUB-USERNAME/portfolio
   site_url: https://YOUR-SITE.netlify.app
   ```
4. Go to `https://YOUR-SITE.netlify.app/admin/` and log in with GitHub.

---

## Day-to-day editing

| To… | In the admin panel |
|---|---|
| Add a project | **Projects → All projects → Add project** (new ones go on top) |
| Add a 3D model | Inside a project, **3D models → Add model**, upload the file |
| Hide a project without deleting it | Tick **Hide from site** |
| Put a project first | Tick **Pin to top** |
| Change which model spins on the home page | **Site settings → Project whose model spins…** (use the project's URL name) |
| Add a shop item or colors | **Print shop → Items for sale** |
| Change shipping price or turn off pickup | **Print shop → Shop items & settings** (scroll below the items) |

After **Publish**, the site updates in about 30 seconds.

### Exporting CAD for the web viewer
- **OnShape:** right-click the part or Part Studio tab → **Export** → STL (binary, millimeter) or GLTF.
- **SolidWorks:** **File → Save As → STL** (Options: binary, units mm). SolidWorks 2021+ can also save GLTF/GLB.
- Keep files under about 20 MB. For big assemblies, use a coarser STL resolution; the viewer doesn't need machining-grade tessellation.
- If a model shows up lying on its side, change **Up axis** from `z` to `y` (or back).
- STL and 3MF files display in the **Display color** you choose. GLB/GLTF keep the colors they were exported with.

### Photos
JPG or WebP around 1600 px wide is plenty. The first image is the **Cover photo**; extra ones go in **Photo gallery** with captions.

---

## What's sample content
Everything in the site right now is a starting draft for you to replace:
- Four projects built from things you've worked on (cam latch, sound sensor, Pi-hole, reference app). Text marked **Draft:** needs your words.
- Two shop items with made-up prices ($8 cable clips, $18 enclosure).
- Placeholder cover images in `assets/uploads/` and three sample models in `assets/models/` (a cam plate, a Pi enclosure, a cable clip).
- The LinkedIn link points to linkedin.com; set your profile URL in **Site settings → Links**.

## Previewing on your own computer
From this folder run `python3 -m http.server 8080` and open http://localhost:8080. The order form works in preview mode (it shows the confirmation but sends nothing).
To try the admin panel locally too, run `npx decap-server` in a second terminal and open http://localhost:8080/admin/.

## Files
```
index.html          Home: hero with live 3D model, project grid, about
project.html        Project detail page (?p=url-name)
shop.html           Shop + order form (the Netlify form lives here)
admin/              Admin panel (Decap CMS) and its config
content/*.json      All site content
assets/uploads/     Photos and files uploaded through the admin panel
assets/models/      Sample 3D models
css/, js/, fonts/   Styles, scripts, self-hosted fonts
js/vendor/          three.js (3D viewer) and marked (Markdown), bundled locally
```
