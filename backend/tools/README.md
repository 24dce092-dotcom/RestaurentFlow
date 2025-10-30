Backfill script: attach Bill records for payments without billId

Usage:
  From the repository root or the `backend` folder, run:

  # from backend folder
  node tools/backfill-payments-to-bills.js

  # or from project root (ensure NODE_PATH or CWD resolves correctly)
  node backend/tools/backfill-payments-to-bills.js

Environment:
  The script uses MONGO_URI environment variable if set, otherwise it defaults to mongodb://127.0.0.1:27017/restaurantflow

Notes:
  - The script will create minimal Bill documents for any Payment documents that are missing a billId.
  - It will then update the Payment to point at the new Bill._id.
  - Review the created Bills and consider enriching them with items or order references if available.
