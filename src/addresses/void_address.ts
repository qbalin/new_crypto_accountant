import Address from './address';

class VoidAddress extends Address {
  private readonly note: string;

  constructor({ note }: { note: string }) {
    super();
    this.note = note;
  }

  // eslint-disable-next-line class-methods-use-this
  toString() {
    return `Void - ${this.note}`;
  }
}

export default VoidAddress;
