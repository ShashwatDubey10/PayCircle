const https  = require('https');
const logger = require('./logger');

const PUSH_TIMEOUT_MS = 8000;

function sendPushNotification(expoPushToken, title, body, data = {}) {
  // Accept both legacy "ExponentPushToken[" and current "ExpoPushToken[" formats
  if (!expoPushToken || (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken['))) return Promise.resolve();

  const payload = JSON.stringify({
    to:    expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'exp.host',
        path:     '/--/api/v2/push/send',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Accept:           'application/json',
        },
      },
      (res) => {
        res.resume();
        resolve();
      }
    );

    req.setTimeout(PUSH_TIMEOUT_MS, () => {
      logger.warn('PUSH', `Push notification request timed out after ${PUSH_TIMEOUT_MS}ms`);
      req.destroy();
      resolve();
    });

    req.on('error', (err) => {
      logger.warn('PUSH', 'Push notification request failed', { error: err.message });
      resolve(); // fire-and-forget — never fail the caller
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendPushNotification };
