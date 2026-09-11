const { subscribersService } = require("../models");

async function subscribe(req, res) {
  const { email } = req.body || {};
  const result = await subscribersService.subscribe(email);

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  if (result.alreadySubscribed) {
    return res.status(200).json({
      message:
        "You're already subscribed. News will be sent to your mail at 7:00 AM in the morning.",
      alreadySubscribed: true,
    });
  }

  return res.status(201).json({ message: "Subscribed. See you at 7AM." });
}

async function unsubscribe(req, res) {
  const email = req.query.email || req.body?.email;
  const result = await subscribersService.unsubscribe(email);

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ message: "Unsubscribed." });
}

module.exports = {
  subscribe,
  unsubscribe,
};
