import { STATEMENTS as STMT } from './statements';
import * as sqlClient from 'sql.js/js/sql';
import { environment } from 'lib/utils';

const { isMock } = environment;

export class DatabaseManager {
  /**
   * This class instance is always fetched using "DatabaseManager.instance"
   * @param {object} dbFile : Uint8Array of the DB file
   */
  constructor(dbFile) {
    if (dbFile) {
      this.db = new sqlClient.Database(dbFile);
    } else {
      this.db = new sqlClient.Database();
    }
  }

  /**
   * @param {Uint8Array} dbFile
   */
  static set file(dbFile) {
    if (!this._instance) {
      DatabaseManager._instance = new DatabaseManager(dbFile);
    }
    return DatabaseManager._instance;
  }

  static get instance() {
    return DatabaseManager._instance || null;
  }

  static reset() {
    DatabaseManager._instance = null;
  }

  exportDatabase() {
    return this.db.export();
  }

  // Generates wallet DB
  generateTables() {
    const run = true;
    const promises = [];
    Object.keys(STMT).forEach(table => {
      promises.push(this.query({ statement: STMT[table].CREATE, run }));
    });

    return Promise.all(promises).then(() => this.insert().appDefaults()).then(() => {
      if (isMock()) {
        const { insertMocks } = require('./mocks/insert-mocks');
        insertMocks();
      }
    });
  }

  /**
   * Execute a SQL query using the 'sql.js' library returning as a promise.
   * @param {object} data : statement, params, run, exec
   * Statement (string) - a string of SQL, that can contain placeholders ('?', ':VVV', ':AAA', '@AAA')
   * Params (object or array) - (optional) values to bind to placeholders. If exec or run is set to true
   * it must be passed as array, otherwise, refer to this page on the parameter usage:
   * https://kripken.github.io/sql.js/documentation/class/Statement.html
   * Run is set to false on default. If set to true, it will execute an query and ignore rows returned.
   * Exec is also set to false on default. If set to true, it will execute an query and return the result
   * in the 'sql.js' way, which consist an array of object with keys 'column' that contains the table column name
   * and 'values' that contains the table column value.
   * The suggested way is to leave exec & run off. When executing a query, it will return the results in an
   * array of objects. Each object represents the row of result returned, with column name as the key mapped to
   * column value as the value.
   */
  query({
    statement,
    params,
    run = false,
    exec = false,
  } = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (run) {
          this.db.run(statement, params);
          resolve();
        } else if (exec) {
          const res = this.db.exec(statement, params);
          resolve(res);
        } else {
          const st = this.db.prepare(statement);
          st.bind(params);
          const rows = [];

          while (st.step()) {
            const row = st.getAsObject();
            rows.push(row);
          }
          st.free();
          resolve(rows);
        }
      } catch (e) {
        console.log(e);
        reject(e);
      }
    });
  }

  // Contains nested methods to insert single rows of data using the query method
  insert(run = true) {
    return {
      /**
       * Insert default user setting into the sqlite DB
       */
      appDefaults: () => {
        const { UPDATES, USER_SETTINGS } = STMT;
        const statementArr = [
          UPDATES.INSERT.DEFAULT,
          USER_SETTINGS.INSERT.DEFAULT,
        ];

        return this.bulkInsert({ statementArr });
      },
      /**
       * Insert into the sqlite DB one row of address data
       */
      address: ({ id, wallet_id, address, name, is_active, balance, parent_id }) => {
        return this.query({
          statement: STMT.ADDRESSES.INSERT.NEW,
          params: [id, wallet_id, address, name, is_active, balance, parent_id],
          run,
        });
      },
      /**
       * Insert into the sqlite DB one row of contact data
       */
      contact: ({ id, name, address, description }) => {
        return this.query({
          statement: STMT.CONTACTS.INSERT.NEW,
          params: [id, name, address, description],
          run,
        });
      },
      /**
       * Insert into the sqlite DB one row of transaction data
       */
      transaction: ({ id, sender_address_id, receiver_address_id, amount, fee, transaction_id, description, sender_address, receiver_address, status, created_date, transaction_type }) => {
        return this.query({
          statement: STMT.TRANSACTIONS.INSERT.NEW,
          params: [id, sender_address_id, receiver_address_id, amount, fee, transaction_id, description, sender_address, receiver_address, status, created_date, transaction_type],
          run,
        });
      },
      /**
       * Insert into the sqlite DB one row of wallet data
       */
      wallet: ({ id, name, coin_id, multi_address, require_password, password_hash, seed }) => {
        return this.query({
          statement: STMT.WALLETS.INSERT.NEW,
          params: [id, name, coin_id, multi_address, require_password, password_hash, seed],
          run,
        });
      },
    };
  }

  /**
   * Optimized method to rapidly insert multiple rows by explicitly beginning
   * beginning a transaction.
   * @param {Object} {
   *   @param {Array} statementArr - array of insert statements
   *   @param {Array} paramsArr - array of params that correspond to the statements
   * }
   */
  bulkInsert({ statementArr, paramsArr = [] }) {
    return new Promise((resolve) => {
      const run = true;
      const queries = [];

      this.db.run('begin transaction');

      for (let i = 0; i < statementArr.length; i++) {
        const query = {
          statement: statementArr[i],
          params: paramsArr[i] ? paramsArr[i] : null,
          run,
        };

        queries.push(this.query(query));
      }

      Promise.all(queries).then(() => {
        this.db.run('commit');
        resolve(true);
      });
    });
  }


  /**
   * Update data into the sqlite DB utilizing the query method
   * @param {object} the table name, the columns to be updated, and an optional where clause
   */
  update({ table, cols, where = null } = {}) {
    const setClause = this.flattenObjectToSetClause(cols);
    const whereClause = where
      ? `where ${where}`
      : '';
    const statement = `update ${table} set ${setClause} ${whereClause};`;
    return this.query({
      statement,
      run: true,
    });
  };

  /**
   * Execute a delete query into the sqlite DB
   * @param {object} the table name, and an optional where clause
   */
  delete({ table, where } = {}) {
    const statement = `delete from ${table} where ${where};`;
    return this.query({
      statement,
      run: true,
    });
  };

  /**
   * Flatten the object into a single string to be used in the set clause.
   * @param {object} data the data that needs to be flattened.
   */
  flattenObjectToSetClause(data) {
    return Object.keys(data).map(key => {
      const value = typeof data[key] === 'string' ? `'${data[key]}'` : data[key];
      return `${key}=${value}`;
    }).join(', ');
  }

  /* ------------------------------------------- */
  /* ------------- Address Queries ------------- */
  /* ------------------------------------------- */

  getAddressesByWalletId(id) {
    const statement = STMT.ADDRESSES.SELECT.WALLET_ID(id);
    return this.query({ statement });
  }

  /* ------------------------------------------- */
  /* ------------- Contact Queries ------------- */
  /* ------------------------------------------- */

  /**
   * Gets the Contacts table
   * @returns {Array} Contact(s)
   */
  getContacts() {
    const statement = STMT.CONTACTS.SELECT.ALL;
    return this.query({ statement });
  }

  /**
   * Selects contacts that fit the given search value
   * @returns {Array} Contact(s)
   * @param {string} value - Value to search by
   */
  getContactsByValue(value = '') {
    const statement = STMT.CONTACTS.SELECT.VALUE(value);
    return this.query({ statement });
  }

  /**
   * Update the contact by ID
   * @param {number} id the contact ID
   * @param {Object} cols the data to be updated
   */
  updateContactById(id, cols) {
    return this.update({
      table: 'Contacts',
      cols,
      where: `id=${id}`,
    });
  }

  /**
   * Deletes a single contact by ID
   * @param {number} id the contact's ID
   */
  deleteContactById(id) {
    return this.delete({
      table: 'Contacts',
      where: `id=${id}`,
    });
  }


  /* ------------------------------------------- */
  /* ------------- Transaction Queries ------------- */
  /* ------------------------------------------- */

  /**
   * Selects transactions that fit the given search value
   * @returns {Array} Transaction(s)
   * @param {string} value - Value to search by
   */
  getTransactionsByValue(value = '') {
    const statement = STMT.TRANSACTIONS.SELECT.VALUE(value);
    return this.query({ statement });
  }

  /**
   * Selects transactions that contain the given address
   * @returns {Array} Transaction(s)
   * @param {string} address - Address value to search by
   */
  getTransactionsPerAddress(address = '') {
    const statement = STMT.TRANSACTIONS.SELECT.PER_ADDRESS(address);
    return this.query({ statement });
  }

  /* --------------------------------------------- */
  /* -------------- Updates Queries -------------- */
  /* --------------------------------------------- */

  /**
   * Increments the db_version to the next version
   * @param {Object} cols - the data to be updated
   * @param {number} lastVersion - most recent db_version
   */
  updateDbVersion(cols, lastVersion) {
    this.update({
      table: 'Updates',
      cols,
      where: `db_version=${lastVersion}`,
    });
  }

  /**
   * Gets the latest update version (used by UpdateManager)
   * @returns {string} CurrentVersion
   */
  async getCurrentVersion() {
    const statement = STMT.UPDATES.SELECT.DB_VERSION;
    const [row] = await this.query({ statement });

    return row.db_version;
  }

  /**
   * Gets the full Updates table
   * @returns {Array} Updates table
   */
  getUpdatesTable() {
    const statement = STMT.UPDATES.SELECT.ALL;
    return this.query({ statement });
  }

  /* -------------------------------------------- */
  /* ----------- UserSettings queries ----------- */
  /* -------------------------------------------- */

  /**
   * Gets the UserSettings table
   * @returns {Array} UserSettings
   */
  async getUserSettings() {
    const statement = STMT.USER_SETTINGS.SELECT.ALL;
    const [res] = await this.query({ statement });

    return res;
  }

  /**
   * Updates the user's theme
   * @param {string} theme
   */
  updateUserTheme(theme) {
    const cols = { theme };
    return this.update({
      table: 'UserSettings',
      cols,
    });
  }

  /* -------------------------------------------- */
  /* -------------- Wallet queries -------------- */
  /* -------------------------------------------- */

  /**
   * Gets the Wallets table
   * @returns {Array} Wallet(s)
   */
  getWallets() {
    const statement = STMT.WALLETS.SELECT.ALL;
    return this.query({ statement });
  }

  /**
   * Gets each wallet name and their respective addresses
   * @returns {Array}
   */
  async getWalletAddresses() {
    const wallets = await this.query({
      statement: STMT.WALLETS.SELECT.NAME,
    });

    wallets.forEach(async (wallet) => {
      const addrStatement = STMT.ADDRESSES.SELECT.BY_WALLET_ID(wallet.id);
      wallet.addresses = await this.query({ statement: addrStatement });
    });

    return wallets;
  }

  /**
   * Gets the last created Wallet
   * @returns {Object} Most recent wallet
   */
  async getLastWallet() {
    const statement = STMT.WALLETS.SELECT.LAST_ID;
    const [res] = await this.query({ statement });

    return res;
  }

  /**
   * Gets a single Wallet by ID
   * @returns {Object} Wallet
   */
  async getWalletById(id) {
    const statement = STMT.WALLETS.SELECT.ID(id);
    const [res] = await this.query({ statement });

    return res;
  }

  /**
   * Update the wallet by ID
   * @param {number} id the wallet's ID
   * @param {Object} cols the data to be updated
   */
  updateWalletById(id, cols) {
    return this.update({
      table: 'Wallets',
      cols,
      where: `id=${id}`,
    });
  }

  /* --------------------------------------------- */
  /* -------------- Address queries -------------- */
  /* --------------------------------------------- */

  /**
   * Gets the Addresses table
   * @returns {Array} Address(es)
   */
  getAddresses() {
    const statement = STMT.ADDRESSES.SELECT.ALL;
    return this.query({ statement });
  }
}