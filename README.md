# Trellobot

Trellobot is a simple Discord bot that reports activities on Trello. This project is a combination and updated version of several other depositories including [Trellobot](https://github.com/Angush/trellobot/blob/master/readme.md), [trello-events](https://github.com/atuttle/node-trello-events) and [trello](https://github.com/norberteder/trello).

## Installation
1. Clone the repository.
    ```
    $ git clone https://github.com/Vollorak/trellobot.git
    ```
1. Enter the repository.
    ```
    $ cd trellobot
    ```
1. Install all the required packages.
    ```
    $ npm install
    ```
1. Configure the `config.json` file ([see below](#Configuration)).

1. Start up Trellobot.
    ```
    $ node trellobot.js
    ```

## Configuration
### Trello

Option             | Description
------------------ | -----------
`boards`           | An array of boards IDs (Strings) that Trellobot uses. You can get this from the board URL `https://trello.com/b/BOARDIDHERE/name`.
`key`              | Trello Developer API key. You can get your key [here](https://trello.com/app-key).
`token`            | Trello app token. Generate a token by going to  `https://trello.com/1/connect?name=Trellobot&response_type=token&expiration=never&key=APIKEY` (replace `APIKEY` with the API key above).
`pollFrequency`    | The number of seconds between each API call. Default is 1 second. **Note: Trello API has a limit of 10 requests per second.**
`events`           | The type of events that you want Trellobot to announce. Switch to `false` to disable.

### Discord

Option             | Description
------------------ | -----------
`token`            | Discord bot token. Create an app for Trellobot [here](https://discord.com/developers). Under the **Bot** option in the menu, create a bot. Copy the token under the bot username.
`server`           | Discord server ID. Turn on Developer Mode in your Discord, right click your server and select `Copy ID`.
`channel`          | Discord channel ID to announce Trello updates. Right click the text channel and select `Copy ID`.

### Users

Option             | Description
------------------ | -----------
`users`            | Mapping of Trello username to Discord user ID. Discord ID can be obtained by right clicking the user on your server's user list and selecting `Copy ID`.

### Debug

Option             | Description
------------------ | -----------
`debug`            | Prints a lot of debug messages into the console. Do not turn this on unless you want your console to be spammed.

### Sample Configuration

_Disclaimer: None of the values below are real. If they are, it is purely coincidental and you should let me know so I can buy a lottery ticket._

```json
{
  "trello": {
    "boards": [
      "X3vdk70c",
      "mOLa5Rck"
    ],
    "key": "e912dfe967bd3c5268978de6daa0172b",
    "token": "31ca55d238a99ceb7e20e5086ecae5b64b82bee63e863ed3a4e0f89492c6fb80",
    "pollFrequency": 1,
    "events": {
      "createCard": true,
      "updateCard": {
        "name": true,
        "description": true,
        "position": false,
        "dueDate": true,
        "list": true,
        "archive": true
      },
      "deleteCard": true,
      "commentCard": true,
      "addMemberToCard": true,
      "removeMemberFromCard": true,
      "createList": true,
      "updateList": {
        "name": true,
        "position": false,
        "archive": true
      }
    }
  },

  "discord": {
    "token": "NyI5NzU1CDIyNzA2ODY4MzI5.XwNjUw.9vbshHVU15CKYqhLsie-ZEdIwK0",
    "server": "297835441255675904",
    "channel": "787644724067696652"
  },

  "users": {
    "vollorak": "000000000000000000",
    "trellouser": "000000000000000001"
  },

  "debug": false
}
```

## Planned Features

- Support more Trello actions.
- Support claiming and abandoning cards from Discord.
- Support querying card and board information from Discord.