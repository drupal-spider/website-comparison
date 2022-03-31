# website-comparison
A simple tool to compare web pages between two sites. A common use case is to compre between production and stage site before deployment.

## Install

```bash
# install locally (recommended)
npm install dotenv --save
```

Or installing with yarn? `yarn add dotenv`

## Usage

Create a `.env` file in the root of your project:

For example

```dosini
WEBSITES = {"production": "https://www.google.com", "host": "www.google.com","stage": "https://www.google.com.au"}
BASE_PATH = /,/search?keys=business,/contact-us
MAX_SHOT = 30
VIEW_PORT = { "width": "1440", "height": "600" }
```

The `.env` file contains the following arguments:

* WEBSITES: The website addresses to check.
* BASE_PATH: The base pathes of those site to check.
* MAX_SHOT: The maximum number of screenshots will take or pages to check.
* VIEW_PORT: The view port dimension.

## Run

`npm i`

`npm run start`