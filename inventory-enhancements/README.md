# Features

- Shows a condensed overview of all your items across all tellers inside the bank
- Shows total and remaining bank slots
- Allows you to filter the overview with a search
- Withdraw from bank with right click
- Show item info with left click

[INSERT SCREENSHOT/ GIF OF UI]

# Installation / Usage

## Paste into chrome dev console

- Paste the contents of inventory-enhancements.js into the chrome developer console and press enter
- Run the following command on your character via the `X` button
- `parent.enhanced_bank_ui.show()`

## Load directly from drive

### TypeScript
```ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export function loadFileFromDrive(fileName: string) {
  if (!existsSync(fileName)) {
    console.warn(`${fileName} could not be found!`);
  }
  const file = readFileSync(fileName, "utf8");
  eval.apply(window, [file]);
}

// load from somewhere on your drive
loadFileFromDrive("some/path/to/inventory-enhancements.js");
```

## Load from code slot

# Development

- go to https://github.com/adventureland-community/typed-adventureland
- download the code
- run `npm run build | npm run pack`
- copy the produced .tgz to the root of this project and run the below command to install the types
  `npm install --save-dev adventureland@../typed-adventureland-0.0.2.tgz`
