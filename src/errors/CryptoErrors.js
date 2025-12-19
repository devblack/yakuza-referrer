class ExpiredUrl extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidHash extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class BadPayload extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export { ExpiredUrl, InvalidHash, BadPayload };
