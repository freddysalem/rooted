# Demoing Rooted on someone else's phone

Rooted runs in **Expo Go on SDK 57**. Guests on the same Wi-Fi scan a QR code
and get the real native app — sensors, haptics and all.

There is one non-obvious rule. As of SDK 57, **Expo Go on iOS refuses to open a
dev server unless the phone and the terminal are signed in to the same Expo
account.** It is not a network problem and there is no flag to turn it off; the
check lives inside Expo Go, not in the CLI. A guest signed in as themselves —
or signed out — sees "There was a problem running the requested project".

So the demo runs on **one shared Expo account that everybody signs in to.**

## One-time setup

1. Make an Expo account for demos only — not your personal one, since you hand
   the password out. https://expo.dev/signup
2. Sign the terminal in as it, from this directory:

   ```
   npx expo login
   ```

   Check it took: `npx expo whoami`.

## Every demo

1. Both the Mac and the phones on the same Wi-Fi.
2. Start the server (opens a Terminal window with the QR code, leaves it up):

   ```
   ~/.claude/skills/expogo/expo-qr.sh --port 8082
   ```

   Port 8082 rather than the default 8081, which is usually taken on this Mac.
3. Each guest, once, on their phone: open Expo Go → avatar icon → sign in with
   the demo account.
4. Scan the QR code. First bundle takes a few seconds; after that it's instant.

Ctrl-C in that Terminal window ends the demo. The app stops working on every
phone when it does — the bundle is served live from the Mac.

## When it doesn't work

| What they see | Cause |
|---|---|
| "signed in as X, but not signed in to Expo CLI" | Phone and terminal are on different accounts, or one is signed out. Both must be the demo account. |
| "incompatible with this version of Expo Go" | Their Expo Go is older than SDK 57. Update it. |
| White screen or timeout after scanning | Not on the same Wi-Fi, or the Mac's IP changed. Restart the script and check the `exp://` address it prints. |
| A change doesn't show up | Re-run with `--clear`. |

Android is currently more relaxed — the sign-in requirement is iOS-only for
now — but Expo has said it is coming to Android, so treat the shared account as
the rule for everyone.
