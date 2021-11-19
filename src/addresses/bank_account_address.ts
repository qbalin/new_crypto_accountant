import Address from './address';

class BankAccountAddress extends Address {
  // eslint-disable-next-line class-methods-use-this
  toString() {
    return 'BankAccount';
  }
}

export default BankAccountAddress;
