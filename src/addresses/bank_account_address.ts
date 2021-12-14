import Address from './address';

class BankAccountAddress extends Address {
  readonly controlled = false;

  // eslint-disable-next-line class-methods-use-this
  toString() {
    return 'BankAccount';
  }
}

const bankAccountAddress = new BankAccountAddress();

export default bankAccountAddress;
