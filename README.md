# VD Tickets

A small iPhone web app for logging client requests for Vision Digital.

- Create a ticket with the client's name and what they asked for.
- New clients are saved automatically and get their own color; pick them from chips next time.
- The created date and time are stamped automatically. A due date is optional.
- Open tickets are grouped into Overdue, Due today, Upcoming and No due date. Tap the circle to mark one done.
- Data is stored on the phone. Use **Clients → Export backup** now and then.

## Preview on this computer

```bash
node tools/serve.js vd-tickets 5173
```

Then open http://localhost:5173. Add `--lan` to open it from a phone on the same Wi-Fi (no offline mode over plain http).

## Put it on your iPhone

The folder is a plain static site (no build step), so any static host works:

1. Upload the `vd-tickets` folder to a host such as Netlify (drag and drop at app.netlify.com/drop), GitHub Pages or Cloudflare Pages.
2. Open the link in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen**. It opens full screen like an app and works offline.

Tickets live on the device and website address they were created on, so start using it from the final link.
