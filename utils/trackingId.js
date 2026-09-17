// Generates tracking IDs like: CH-260917-4F2A
// CH = Cargo Hub, YYMMDD, then 4 random hex chars

const crypto = require('crypto');

function generateTrackingId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CH-${yy}${mm}${dd}-${rand}`;
}

module.exports = { generateTrackingId };