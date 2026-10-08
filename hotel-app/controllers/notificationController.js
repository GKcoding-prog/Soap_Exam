const Notification = require('../models/Notification');

// Helper used by other controllers to create a notification
exports.creerNotification = async ({ destinataire, type, titre, message, lien, meta }) => {
  try {
    await Notification.create({ destinataire, type, titre, message, lien, meta });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @GET /api/notifications  — current user's notifications
exports.mesNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ destinataire: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const nonLues = await Notification.countDocuments({ destinataire: req.user._id, lu: false });
    res.json({ succes: true, nonLues, data: notifs });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/notifications/:id/lire
exports.marquerLue = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, destinataire: req.user._id },
      { lu: true }
    );
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};

// @PUT /api/notifications/tout-lire
exports.toutMarquerLu = async (req, res) => {
  try {
    await Notification.updateMany({ destinataire: req.user._id, lu: false }, { lu: true });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
};
