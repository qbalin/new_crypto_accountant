import fs from 'fs';

const basePath = './downloads';

class Loader {
  private readonly loaded: {[key: string]: boolean} = {}

  private readonly objectsLoaded: {[key: string]: any[]} = {}

  load<T>({ group, Model } : {
    group: string,
      Model: new({ attributes }: { attributes: any}) => T
    }) : T[] {
    const path = `${basePath}/${group}.json`;
    if (Array.isArray(this.objectsLoaded[path])) {
      return this.objectsLoaded[path];
    }
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '[]');
    }

    this.objectsLoaded[path] = JSON.parse(fs.readFileSync(path, { encoding: 'utf8' })).map((obj: Record<string, any>) => new Model({ attributes: obj }));

    return this.objectsLoaded[path];
  }

  save<T extends { toJson:() => Record<string, any> }>({ group, collection } :
     { group: string, collection: T[]}) {
    const path = `${basePath}/${group}.json`;

    this.objectsLoaded[path] = collection;
    fs.writeFileSync(path, JSON.stringify(collection.map((record) => record.toJson()), null, 2));
  }
}
export default Loader;
