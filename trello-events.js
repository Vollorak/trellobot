const Trello = require('trello');
const EventEmitter = require('events').EventEmitter;

let e = new EventEmitter();
let trello;

module.exports = function () {

    this.frequency = 1;
    this.minId = 0;
    this.boards = [];

    this.on = function (event, listener) {
        e.on(event, listener);
    }

    this.login = function (key, token) {
        this.key = key;
        this.token = token;

        trello = new Trello(key, token);

        trello.getMember('me', (err, res) => {
            if (err) {
                e.emit('error', err);
                return;
            }

            e.emit('ready', res);
        });

        start(this);
    }

}

function start(t) {

    if (t.boards.length === 0) {
        trello.getBoards('me', (err, res) => {
            if (err) {
                e.emit('error', err);
                clearInterval(interval);
                return;
            }

            t.boards = res.forEach((board) => board.shortLink);
        });
    }

    getActions(t);
    var interval = setInterval(() => getActions(t), t.frequency * 1000);

}

function getActions(t) {

    t.boards.forEach((board) => {
        trello.getActionsOnBoard(board, (err, res) => {

            if (err) {
                e.emit('error', err);
                return;
            }

            res = res.reverse();

            let actionId;
            for (let action in res) {

                actionId = parseInt(res[action].id, 16);
                if (actionId <= t.minId) continue;

                e.emit(res[action].type, res[action], board);

            }

            t.minId = Math.max(t.minId, actionId);
            e.emit('updateActionId', t.minId);

        });
    });

}