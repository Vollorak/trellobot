const needle = require('needle');
const EventEmitter = require('events').EventEmitter;

let e = new EventEmitter();
let trello;

const Trello = function (key, token) {

    this.uri = "https://api.trello.com";

    this.makeCall = function (method, options = []) {
        let call = `${this.uri}/1/${method}?key=${key}&token=${token}`;
        for (let i in options) call = `${call}&${options[i].key}=${options[i].value}`;
        return call;
    }

    this.getMember = function (id, callback) {
        console.log(`***HELLO*** ${this.makeCall(`members/${id}`)}`)
        needle('get', this.makeCall(`members/${id}`))
            .then(res => callback(res.body))
            .catch(err => callback(null, err));
    }

    this.getBoards = function (id, callback) {
        needle('get', this.makeCall(`members/${id}/boards`))
            .then(res => callback(res.body))
            .catch(err => callback(null, err));
    }

    this.getActionsOnBoard = function (id, callback) {
        needle('get', this.makeCall(`boards/${id}/actions`))
            .then(res => callback(res.body))
            .catch(err => callback(null, err));
    }

}

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

        trello.getMember('me', (res, err) => {
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
        trello.getBoards('me', (res, err) => {
            if (err) {
                e.emit('error', err);
                clearInterval(interval);
                return;
            }

            t.boards = res.forEach((board) => board.shortLink);
        });
    }

    getActions(t);
    let interval = setInterval(() => getActions(t), t.frequency * 1000);

}

function getActions(t) {

    t.boards.forEach((board) => {
        trello.getActionsOnBoard(board, (res, err) => {

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