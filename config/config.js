const dotEnv = require("dotenv")
dotEnv.config({ path: `.env` });
module.exports = {
  "development": {
    host: "127.0.0.1",
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    dialect: "postgres",
    "logging": false
  },
  "production": {
    host: "127.0.0.1",
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    dialect: "postgres",
    "logging": false
  }
};