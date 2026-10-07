const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Creates a reservation; the total is nights x nightly rate. */
async function createReservation(data) {
  const checkIn = new Date(data.checkInDate);
  const checkOut = new Date(data.checkOutDate);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new ValidationError('checkInDate and checkOutDate must be valid dates');
  }
  const nights = Math.round((checkOut - checkIn) / DAY_MS);
  if (nights < 1) {
    throw new ValidationError('checkOutDate must be at least one day after checkInDate');
  }
  const nightlyRate = Number(data.nightlyRate);
  if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) {
    throw new ValidationError('nightlyRate must be a positive number');
  }

  try {
    return await Reservation.create({
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      roomNumber: data.roomNumber,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nightlyRate,
      currency: data.currency,
      totalAmount: Math.round(nights * nightlyRate * 100) / 100
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}

async function listReservations() {
  return Reservation.find().sort({ createdAt: -1 });
}

async function getReservation(id) {
  const reservation = mongoose.isValidObjectId(id) ? await Reservation.findById(id) : null;
  if (!reservation) {
    throw new NotFoundError(`Reservation ${id} not found`);
  }
  return reservation;
}

/** Closes the stay once its invoice is paid. */
async function checkOut(id) {
  const reservation = await getReservation(id);
  if (reservation.status === 'CANCELLED') {
    throw new ConflictError(`Reservation ${id} is cancelled`);
  }
  reservation.status = 'CHECKED_OUT';
  return reservation.save();
}

module.exports = { createReservation, listReservations, getReservation, checkOut };
