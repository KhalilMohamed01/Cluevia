class MemoryStore {
  constructor() {
    this.users = new Map();
  }

  addUser(userId, userData) {
    this.users.set(userId, userData);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  removeUser(userId) {
    this.users.delete(userId);
  }
}

module.exports = new MemoryStore();
