export class FileManager {
  constructor(storage) {
    this.storage = storage;
  }

  getKeyName(username, password) {
    return `whitelabelwallet:${username}:${password}`;
  }

  savePrivateKey(privateKey) {
    // check if private key exists
    this.storage.setItem('privateKey', privateKey);
  }

  getPrivateKey() {
    return this.storage.getItem('privateKey') || null;
  }

  // fetch DB file on localStorage given username
  getDatabaseFile(username, password) {
    return this.storage.getItem(this.getKeyName(username, password)) || null;
  }

  // removes DB file on localStorage
  removeDatabaseFile(username, password) {
    const keyName = this.getKeyName(username, password);

    if (this.storage.getItem(keyName) !== null) {
      this.storage.removeItem(keyName);
    }
  }

  // stores DB file on localStorage given username
  storeDatabaseFile(username, password, dbFile) {
    this.storage.setItem(this.getKeyName(username, password), dbFile);
  }
}
