import Address from './address';

// eslint-disable-next-line no-use-before-define
const instances: Record<string, VoidAddress> = {};

class VoidAddress extends Address {
  private readonly note: string;

  readonly controlled = false;

  private constructor({ note } : { note: string }) {
    super();

    this.note = note;
  }

  static getInstance({ note } : { note: string }) {
    if (instances[note]) {
      return instances[note];
    }

    instances[note] = new VoidAddress({ note });
    return instances[note];
  }

  // eslint-disable-next-line class-methods-use-this
  toString() {
    return `Void - ${this.note}`;
  }
}

export default VoidAddress;
