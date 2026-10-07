const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

const reservationSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, trim: true, lowercase: true },
    roomNumber: { type: String, required: true, trim: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    nightlyRate: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/, default: 'USD' },
    /** nights x nightlyRate, computed by reservationService. */
    totalAmount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'CONFIRMED' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
