type Attributes = {
  index: number,
  params: {
    creator: string,
    decimals: number,
    'unit-name'?: string
    name?: string
  }
}

class Asset {
  private readonly attributes: Attributes

  constructor(
    { attributes } : { attributes: Record<string, any> },
  ) {
    this.attributes = attributes as Attributes;
  }

  toDecimal({ amount } : { amount: number}) {
    return amount * 10 ** (-this.attributes.params.decimals);
  }

  get name() {
    return this.attributes.params['unit-name'] || `algorand_asset_${this.index}`;
  }

  get index() {
    return this.attributes.index.toString();
  }
}

export default Asset;
