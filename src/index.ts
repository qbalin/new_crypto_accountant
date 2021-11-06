import fs from 'fs';
import Config from './config';

const c = Config.parse();
console.log(c.blockchainAccounts);

const file = fs.readFileSync('./.gitignore', { encoding: 'utf8' });
console.log(file);
let helloWorld = "Hello World";