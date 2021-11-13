# Development Setup


## IDE setup

1. It's recommended to use [Visual Studio Code](https://code.visualstudio.com/), as it has a good
support for TypeScript autocompletion and linting.
2. Install the [ESLint pluggin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
for VSCode


## Development tools setup

1. Install [Node.js](https://nodejs.org/en/) on your machine if you don't have it
2. Install [Yarn.js](https://classic.yarnpkg.com/en/docs/getting-started)
3. Install the dependencies: in the code root directory, run `yarn install`
4. Optional: install [GraphViz](https://graphviz.org/download/) on your system, which is a dependency of [Madge](https://github.com/pahen/madge)
5. In VSCode, Using Ctrl+Shift+P or Cmd+Shift+P, open `Preferences: Open Settings (JSON)` and add the following entries:
```
    "files.trimTrailingWhitespace": true,
    "eslint.validate": ["typescript"],
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    }
```
6. Restart VSCode


## Development

### Watch mode

In VSCode, in the top-left of the left-nav, click the three dots in front of "EXPLORER" and tick
"NPM Scripts" if it's not already.

Unfold "NPM Scripts" and click the play button in front of the "start" script. This will start the
TypeScript compiler in watch mode, so that each change to a file is immediately compiled.


### Running the code
To run the code, simply execute `node .` in a console.

