/**
 * @fileoverview DB related functions used in the My-Wallets Plugin
 * @author Marc Mathieu
 */
import { WalletManager } from 'api';

/**
 * Function that gets all Wallets from DB, and then sets the response
 * to the redux store
 * @param {func} setFn - function that sets the response to state
 */
async function fetchWallets(setFn) {
  const res = await WalletManager.fetchWallets();
  setFn(res);
}

/**
 * Function to get a single wallet from db by ID
 * @param {number} id - id of wallet to get
 * @param {func} setFn - function that sets the res to state
 */
async function getWalletById(id, setFn) {
  const res = await WalletManager.getWalletById(id);
  setFn(res);
}

/**
 * Function to get a addresses from db by wallet ID
 * @param {Object} manager - the manager object
 * @param {func} setFn - function that sets the res to state
 * @param {number} id - id of wallet to get
 */
async function getAddressesByWalletId(setFn, id) {
  const res = await WalletManager.getAddressesByWalletId(id);
  setFn(res);
  return res;
}

/**
 * Function that adds a new wallet to the db, and then sets the updated wallet table to state
 * @param {Object} wallet - the wallet object to add to the db
 * @param {func} setFn - function that sets the response to state
 */
async function createWalletAndUpdateList(wallet, setFn) {
  await WalletManager.createWallet(wallet);
  await fetchWallets(setFn);
}

/**
 * Function that updates a wallet by id, and then updates the selected
 * wallet in state.
 * @param {Object} wallet - the wallet object to add to the db
 * @param {func} setFn - function that sets the response to state
 */
async function updateWalletAndUpdateState(wallet, setFn) {
  await WalletManager.updateWalletbyId(wallet);
  await getWalletById(wallet.id, setFn);
}

/**
 * Function to search a transaction by description
 * @param {Object} manager - the manager object
 * @param {*} setFn - the function that sets the query response to state
 * @param {*} value - the value to query
 */
async function searchTransactionsByValue(setFn, value) {
  const res = await WalletManager.getTransactionsByValue(value);
  setFn(res);
}

/**
 * Function to get transactions that contain the desired address
 * @param {Object} manager - the manager object
 * @param {*} setFn - the function that sets the query response to state
 * @param {*} address - the address value to query
 */
async function getTransactionsPerAddress(setFn, address) {
  const res = await WalletManager.getTransactionsPerAddress(address);
  setFn(res);
}


export {
  createWalletAndUpdateList,
  fetchWallets,
  getAddressesByWalletId,
  getWalletById,
  getTransactionsPerAddress,
  searchTransactionsByValue,
  updateWalletAndUpdateState,
};
