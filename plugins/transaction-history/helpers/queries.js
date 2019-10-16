/**
 * @fileoverview DB related functions used in the My-Wallets Plugin
 * @author Marc Mathieu
 */
import { WalletManager } from 'api';

/**
 * Function that gets all Transactions from DB, and then sets the response
 * to the redux store
 * @param {func} setFn - function that sets the response to state
 */
async function fetchTransactions(setFn) {
  const res = await WalletManager.fetchTransactions();
  setFn(res);
}

/**
 * Function to get a single wallet from db by Address
 * @param {string} address - address of wallet to get
 * @param {func} setFn - function that sets the res to state
 */
async function getWalletByAddress(address) {
  const res = await WalletManager.getWalletByAddress(address);
  return res;
}

/**
 * Function to search a transactions
 * @param {func} setFn - the function that sets the query response to state
 * @param {string} value - the value to query
 */
async function searchTransactionsByValue(setFn, value, addresses, filterDate = null) {
  const res = await WalletManager.searchTransactionsByValue(addresses, value, filterDate);
  setFn(res);
}



export {
  fetchTransactions,
  getWalletByAddress,
  searchTransactionsByValue,
};
