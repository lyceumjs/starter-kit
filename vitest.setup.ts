// Load .env into process.env for local runs. dotenv does NOT override variables
// already present in the environment, so the DATABASE_URI that `make test` exports
// (pointing at the dedicated `lms_test` database) still wins.
import 'dotenv/config'
