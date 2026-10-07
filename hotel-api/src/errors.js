/** Application errors, mapped to HTTP status codes by the error middleware in app.js. */

class AppError extends Error {
  constructor(message, statusCode, type) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

module.exports = { AppError, ValidationError, NotFoundError, ConflictError };
