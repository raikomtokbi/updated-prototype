# Nexcoin — cPanel Deployment Guide

Everything in this zip is production-ready. NO `npm install` is required —
all Node.js dependencies are bundled inside  dist/index.cjs.

──────────────────────────────────────────────────────────────────────
STEP 1 — Upload
──────────────────────────────────────────────────────────────────────
  • In cPanel → File Manager, create a folder (e.g.  /home/youruser/nexcoin)
  • Upload this zip into that folder and Extract it.

──────────────────────────────────────────────────────────────────────
STEP 2 — Create the MySQL database
──────────────────────────────────────────────────────────────────────
  • cPanel → MySQL Databases:
      - Create a database (e.g.  youruser_nexcoin)
      - Create a user with a strong password
      - Add the user to the database with ALL PRIVILEGES
  • cPanel → phpMyAdmin → select the database → Import:
      - Choose  migrations/setup.sql  → Go.
    This creates every table the app needs.

──────────────────────────────────────────────────────────────────────
STEP 3 — Setup the Node.js app (Setup Node.js App / Node.js Selector)
──────────────────────────────────────────────────────────────────────
  • Node.js version    : 18.x or higher
  • Application root   : the folder where you extracted the zip
  • Application URL    : your domain or subdomain
  • Application startup file :  dist/index.cjs
  • DO NOT click 'Run NPM Install'. It is not needed.

  In the same panel, add these environment variables:
      DATABASE_URL     mysql://user:password@localhost:3306/dbname
      SESSION_SECRET   <a long random string — e.g. openssl rand -hex 32>
      NODE_ENV         production
      PORT             (leave empty — cPanel sets this automatically)

──────────────────────────────────────────────────────────────────────
STEP 4 — Save & Restart
──────────────────────────────────────────────────────────────────────
  • Click  Save, then  Restart.
  • Visit your domain — the site is now live.

──────────────────────────────────────────────────────────────────────
Notes
──────────────────────────────────────────────────────────────────────
  • Static frontend lives in  public/  and is served automatically.
  • User-uploaded images go in  uploads/  (created on first upload).
  • To update the site: re-build, re-upload the new zip, and restart the
    Node.js app from cPanel. The database is preserved.
  • Default admin login (change it after first login!):
      username: admin
      password: admin123456