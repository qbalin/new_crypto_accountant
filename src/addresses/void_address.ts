import Address from './address';

class VoidAddress extends Address {
  // eslint-disable-next-line class-methods-use-this
  toString() {
    return 'Void';
  }
}

export default VoidAddress;
