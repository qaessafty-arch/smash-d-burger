# Putting the ordering system online

The app needs a host that runs a container (or Node 22) **and keeps a small disk**. GitHub Pages cannot run it.

## Free option: Northflank (about 15 minutes)

1. Create an account at northflank.com and a new **project**.
2. **Create a service → Combined service → from your GitHub repo** `smash-d-burger`, branch `main`, build type **Dockerfile** (the repo has one).
3. **Port:** `3000`, public, HTTP. Northflank gives you an HTTPS address (needed for the waiter's camera scan).
4. **Volume:** add a volume of the free size and mount it at `/data`. This keeps orders, menu edits and photos across restarts.
5. **Environment variables** (secrets):
   - `ADMIN_USERNAME` = the owner's sign-in name
   - `ADMIN_PASSWORD` = a strong password (set it **before the first start**)
6. Deploy. Open `https://<your-address>/staff/login`, sign in, add tables, print the QR codes, create waiter and kitchen accounts.
7. Optional: add your own domain in the service's networking settings, for example `order.yourrestaurant.com`.

Notes
- Run exactly **one** instance of the service.
- Back up the `/data` volume now and then.
- Do not set `INSECURE_COOKIES` when you have HTTPS.
- Other hosts that work the same way: Railway, Fly.io, any VPS with Docker.

## Run it yourself

```bash
docker build -t smash-d-burger .
docker run -p 3000:3000 -v smash-data:/data -e ADMIN_PASSWORD='choose-a-strong-one' -e INSECURE_COOKIES=1 smash-d-burger
```
(`INSECURE_COOKIES=1` only for plain-HTTP testing on your own computer.)
