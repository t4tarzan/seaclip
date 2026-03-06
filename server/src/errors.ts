export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class UnprocessableError extends AppError {
  constructor(message = "Unprocessable") {
    super(422, message);
    this.name = "UnprocessableError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export function notFound(msg = "Not found"): AppError {
  return new AppError(404, msg);
}

export function conflict(msg = "Conflict"): AppError {
  return new AppError(409, msg);
}

export function unprocessable(msg = "Unprocessable"): AppError {
  return new AppError(422, msg);
}

export function forbidden(msg = "Forbidden"): AppError {
  return new AppError(403, msg);
}

export function unauthorized(msg = "Unauthorized"): AppError {
  return new AppError(401, msg);
}
