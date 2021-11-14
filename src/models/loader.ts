import fs from 'fs';

const basePath = './downloads';

class Loader {
  static load({ group } : {
    group: string,
    }) : Record<string, any> {
    const path = `${basePath}/${group}.json`;

    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '[]');
    }

    return JSON.parse(fs.readFileSync(path, { encoding: 'utf8' }));
  }

  static save({ group, collection } : { group: string, collection: Record<string, any>[]}) {
    const path = `${basePath}/${group}.json`;
    fs.writeFileSync(path, JSON.stringify(collection, null, 2));
  }
}
export default Loader;
