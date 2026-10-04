# TCG Pokédex — family sync setup

The app is one file, `index.html`. On its own it works on one device. To share between
phones it needs two free things: a **Firebase database** (holds the shared data) and
somewhere to **host the page** so each phone can open it from a link.

Both are done once, by you, in a web browser. Do the steps in order.

## Part 1 — Firebase database (about 10 minutes)

1. Open https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it `TCG Pokedex`, click **Continue**.
4. Turn **off** "Enable Google Analytics", click **Create project**. Wait, then click **Continue**.
5. In the left menu click **Build**, then **Authentication**, then **Get started**.
6. Click the **Sign-in method** tab, click **Anonymous**, switch **Enable** on, click **Save**.
7. In the left menu click **Build**, then **Realtime Database**, then **Create Database**.
8. Location: pick **Singapore (asia-southeast1)**. Click **Next**.
9. Choose **Start in locked mode**, click **Enable**.
10. Click the **Rules** tab. Delete everything in the box and paste this exactly:

    ```json
    {
      "rules": {
        "families": {
          "$code": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        }
      }
    }
    ```

11. Click **Publish**.
12. Click the **gear** next to "Project Overview" (top left), then **Project settings**.
13. Scroll down to **Your apps**, click the **`</>`** (Web) icon.
14. App nickname: `TCG Pokedex`. Leave "Firebase Hosting" unticked. Click **Register app**.
15. You will see a block of code with `const firebaseConfig = { ... }`. Copy the part
    from `{` to `}` and paste it into the chat with Claude. Claude puts it into `index.html`.
    (This config is not a secret — it only says which project to talk to. The family code
    is the thing that keeps your data private, and it is never written into the file.)

## Part 2 — Host the page (about 5 minutes)

GitHub Pages is free and needs no software installed.

1. Open https://github.com and sign in, or click **Sign up** and make an account.
2. Click the **+** at the top right, then **New repository**.
3. Repository name: `tcg-pokedex`. Leave it **Public**. Click **Create repository**.
4. On the new page click the **uploading an existing file** link.
5. Drag `C:\Projects\TCGPokedex\index.html` onto the page. Click **Commit changes**.
6. Click **Settings** (top of the repository), then **Pages** in the left menu.
7. Under **Branch** choose `main`, leave `/ (root)`, click **Save**.
8. Wait a minute, then refresh. The page shows your address, like
   `https://YOURNAME.github.io/tcg-pokedex/`. That is the app.

The app is these files, and all of them go in the repository:
`index.html`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-192.png`, `icon-512.png`,
`cards-1.fp` (the card-picture fingerprints the camera scanner matches against; about 6 MB,
rebuilt now and then as new sets come out — the number in the name goes up each time).

Optional — set symbols: TCGdex has no picture for some sets (30th Celebration, Trainer
Galleries, promos). To add one, save a PNG of the symbol named after the set id, e.g.
`30th.png`, `swsh9tg.png`, and upload it into a `symbols` folder in the repository
(**Add file → Upload files**, type `symbols/30th.png` as the name). The app shows it automatically.
Set ids are in the address bar when a set is open, e.g. `#/set/30th`.

When the app changes later: repository → **Add file** → **Upload files** → drag the changed
files in → **Commit changes**. Phones show an "Update" button next time they open the app.

## Part 3 — Join the family

1. Open the app address on your phone.
2. Scroll to the bottom and tap **join a family**, then **Start a new family**.
3. Tap **Copy link** or **Share…** and send the link to each family member.
4. Each person opens the link, then picks or adds their own user at the top.
   The phone remembers which user it is; everyone's cards show up on every phone.

On iPhone: Share → **Add to Home Screen** makes it open like an app. On Android:
browser menu → **Add to Home screen**.
