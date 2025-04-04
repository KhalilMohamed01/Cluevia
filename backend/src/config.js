require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  PARTY_CODE_LENGTH: 6
};