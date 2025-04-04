const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const memoryStore = require('./MemoryStore');

class AuthService {
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        avatarUrl: user.avatarUrl,
        authType: user.authType
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  static async loginWithUsername(username) {
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      username,
      avatarUrl: '/avatar.png',
      authType: 'username'
    };

    memoryStore.addUser(userId, user);
    return {
      user,
      token: this.generateToken(user)
    };
  }

  static removeUser(userId) {
    memoryStore.removeUser(userId);
  }

  static getUser(userId) {
    return memoryStore.getUser(userId);
  }
}

module.exports = AuthService;
