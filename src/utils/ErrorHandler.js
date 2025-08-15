export default class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleErrors = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error("Handled Error:", err.message);
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: err.message || "Internal Server Error",
  });
};

