// File Declarations
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

// Logger Declarations
const Logger = require('./logger.js');
const log = new Logger(config.debug);

// Discord Declarations
const Discord = require('discord.js');
const discord = new Discord.Client();

// Trello Declarations
const TrelloEvents = require('./trello-events.js');
const trello = new TrelloEvents();

// Global Variable Declarations
let lastActionId = fs.existsSync('.lastActionId') ? fs.readFileSync('.lastActionId') : 0;
let server, channel;

// Debugging Mode Message
log.debug(`Debugging mode enabled`);

/**
 * ===============
 * Discord Section
 * ===============
 */

discord.login(config.discord.token);

discord.on('ready', () => {

    log.info(`Logged in as ${discord.user.tag} on Discord!`);

    log.debug(`Finding discord server by ID...`);
    server = discord.guilds.resolve(config.discord.server);
    if (!server) {
        log.error(`Server ID ${config.discord.server} does not exist.`);
        process.exit();
    }
    // fs.writeFileSync('server.json', JSON.stringify(server));
    log.debug(`Discord server "${server.name}" found.`);

    log.debug(`Finding discord channel by ID...`);
    channel = discord.channels.resolve(config.discord.channel);
    if (!channel) {
        log.error(`Channel ID ${config.discord.channel} does not exist.`);
        process.exit();
    }
    log.debug(`Discord channel "${channel.name}" found.`);

    trello.boards = config.trello.boards;
    trello.minId = lastActionId;
    trello.login(config.trello.key, config.trello.token);

});

/**
 * ==============
 * Trello Section
 * ==============
 */

trello.on('error', (err) => {
    log.error(err);
});

trello.on('debug', (msg) => {
    log.debug(msg);
});

trello.on('ready', (user) => {
    log.info(`Logged in as ${user.username} on Trello!`);
});

// Saves the last action that was processed.
trello.on('updateActionId', (id) => {
    if (lastActionId === id) return;
    lastActionId = id;
    fs.writeFileSync('.lastActionId', id.toString());
});

/**
 * Wrapper function used for all trello listeners to standardise procedure
 * @param embedder Function for modifying the Discord embedding
 * @param action Name of the action
 * @param filter Function for filtering events within a listener
 * @returns function Function to be used in the listener
 */
const listenerWrapper = (embedder, action, filter = () => true) => {
    return (event, board) => {
        if (!filter(event)) return;

        if (event.data.hasOwnProperty('card')) {
            log.debug(`Trello event ${action} triggered for card ${event.data.card.shortLink}.`);
        } else {
            log.debug(`Trello event ${action} triggered for list ${event.data.list.id}.`);
        }

        parseMember(event.memberCreator);

        let embed = embedder(event);
        if (event.data.hasOwnProperty('card')) embed.addField(
            'ID',
            `[${event.data.card.shortLink}](https://trello.com/c/${event.data.card.shortLink})`,
            true);
        embed.addField('USER', event.memberCreator.string, true);

        if (event.memberCreator.discord) {
            embed.setThumbnail(event.memberCreator.discord.user.displayAvatarURL());
        }

        channel.send(embed);
    }
}

// Card creation listener
if (config.trello.events.createCard) {
    trello.on("createCard", listenerWrapper((event) => {
        let embed = getEmbedBase(event)
            .setTitle(`A new card has been added to __${event.data.list.name}__!`)
            .addField('CARD', event.data.card.name);
        if (event.data.card.desc) embed.addField('DESCRIPTION', event.data.card.desc);
        return embed;
    }, 'createCard'));
    log.debug('Trello event createCard listener registered.');
}

const updateCard = config.trello.events.updateCard;

// Card name update listener
if (updateCard.name) {
    trello.on('updateCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Name updated for card __${event.data.card.shortLink}__!`)
            .addField('OLD NAME', event.data.old.name)
            .addField('NEW NAME', event.data.card.name),
        'updateCard (name)',
        (event) => event.data.old.hasOwnProperty('name')));
    log.debug('Trello event updateCard (name) listener registered.');
}

// Card description update listener
if (updateCard.description) {
    trello.on('updateCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Description updated for card __${event.data.card.shortLink}__!`)
            .addField('CARD', event.data.card.name)
            .addField('DESCRIPTION', event.data.card.desc),
        'updateCard (description)',
        (event) => event.data.old.hasOwnProperty('desc')));
    log.debug('Trello event updateCard (description) listener registered.');
}

// Card position update listener
if (updateCard.position) {
    trello.on('updateCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Position updated for card __${event.data.card.shortLink}__!`)
            .addField('CARD', event.data.card.name),
        'updateCard (position)',
        (event) => event.data.old.hasOwnProperty('pos')));
    log.debug('Trello event updateCard (position) listener registered.');
}

// Card due date update listener
if (updateCard.dueDate) {
    trello.on('updateCard', listenerWrapper((event) => {
        let embed = getEmbedBase(event)
            .setTitle(`Due date updated for card __${event.data.card.shortLink}__!`)
            .addField('CARD', event.data.card.name);
        if (event.data.old.due) embed.addField('OLD DUE DATE', new Date(event.data.old.due).toUTCString());
        embed.addField(
            'NEW DUE DATE',
            event.data.card.due ? new Date(event.data.card.due).toUTCString() : 'N/A');
        return embed;
    }, 'updateCard (due date)', (event) => event.data.old.hasOwnProperty('due')));
    log.debug('Trello event updateCard (due date) listener registered.');
}

// Card list update listener
if (updateCard.list) {
    trello.on('updateCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Card __${event.data.card.shortLink}__ has been moved to __${event.data.listAfter.name}__!`)
            .addField('CARD', event.data.card.name)
            .addField('OLD LIST', event.data.listBefore.name)
            .addField('NEW LIST', event.data.listAfter.name),
        'updateCard (list)',
        (event) => event.data.hasOwnProperty('listBefore')));
    log.debug('Trello event updateCard (list) listener registered.');
}

// Card archive update listener
if (updateCard.archive) {
    trello.on('updateCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(
                `Card __${event.data.card.shortLink}__ has been ${event.data.old.closed ? 'unarchived' : 'archived'}!`)
            .addField('CARD', event.data.card.name),
        'updateCard (archive)',
        (event) => event.data.old.hasOwnProperty('closed')));
    log.debug('Trello event updateCard (archive) listener registered.');
}

// Card delete listener
if (config.trello.events.deleteCard) {
    trello.on('deleteCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Card __${event.data.card.shortLink}__ has been deleted!`)
            .addField('LIST', event.data.list.name),
        'deleteCard'));
    log.debug('Trello event deleteCard listener registered.');
}

// Card comment listener
if (config.trello.events.commentCard) {
    trello.on('commentCard', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`A new comment has been added to card __${event.data.card.shortLink}__!`)
            .addField('CARD', event.data.card.name)
            .addField(`COMMENT ${event.data.hasOwnProperty('dateLastEdited') ? '(edited)' : ''}`,
                event.data.text),
        'commentCard'));
    log.debug('Trello event commentCard listener registered.');
}

// Card add member listener
if (config.trello.events.addMemberToCard) {
    trello.on('addMemberToCard', listenerWrapper(
        (event) => {
            let username = parseUsername(event.member.username);
            if (!username) username = event.member.username;
            return getEmbedBase(event)
                .setTitle(
                    event.member.username === event.memberCreator.username ?
                        `Card __${event.data.card.shortLink}__ has been claimed by ${username}!` :
                        `Card __${event.data.card.shortLink}__ has been assigned to ${username}!`)
                .addField('CARD', event.data.card.name)
                .addField('MEMBER', parseMember(event.member).string);
        }, 'addMemberToCard'));
    log.debug('Trello event addMemberToCard listener registered.');
}

// Card remove member listener
if (config.trello.events.removeMemberFromCard) {
    trello.on('removeMemberFromCard', listenerWrapper(
        (event) => {
            let username = parseUsername(event.member.username);
            if (!username) username = event.member.username;
            return getEmbedBase(event)
                .setTitle(
                    event.member.username === event.memberCreator.username ?
                        `${username} has abandoned card __${event.data.card.shortLink}__!` :
                        `${username} has been removed from card __${event.data.card.shortLink}__!`)
                .addField('CARD', event.data.card.name)
                .addField('MEMBER', parseMember(event.member).string);
        }, 'removeMemberFromCard'));
    log.debug('Trello event removeMemberFromCard listener registered.');
}

// List creation listener
if (config.trello.events.createList) {
    trello.on('createList', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`A new list has been added to __${event.data.board.name}__!`)
            .addField('LIST', event.data.list.name),
        'createList'));
    log.debug('Trello event createList listener registered.');
}

const updateList = config.trello.events.updateList;

// List name update listener
if (updateList.name) {
    trello.on('updateList', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Name updated for list __${event.data.list.name}__!`)
            .addField('OLD NAME', event.data.old.name)
            .addField('NEW NAME', event.data.list.name),
        'updateList (name)',
        (event) => event.data.old.hasOwnProperty('name')));
    log.debug('Trello event updateList (name) listener registered.');
}

// List position update listener
if (updateList.position) {
    trello.on('updateList', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(`Position updated for list __${event.data.list.name}__!`),
        'updateList (position)',
        (event) => event.data.old.hasOwnProperty('pos')));
    log.debug('Trello event updateList (position) listener registered.');
}

// List archive update listener
if (updateList.archive) {
    trello.on('updateList', listenerWrapper(
        (event) => getEmbedBase(event)
            .setTitle(
                `List __${event.data.list.name}__ has been ${event.data.old.closed ? 'unarchived' : 'archived'}!`),
        'updateList (archive)',
        (event) => event.data.old.hasOwnProperty('closed')));
    log.debug('Trello event updateList (archive) listener registered.')
}

/**
 * =================
 * General Functions
 * =================
 */

// Parses trello member into discord user and formats string
const parseMember = (member) => {
    let discordUser = parseUsername(member.username, true);
    if (discordUser) {
        member.string = `[${member.fullName}](https://trello.com/${member.username}) / ${discordUser}`;
        member.discord = discordUser;
    } else {
        member.string = `[${member.fullName}](https://trello.com/${member.username})`;
    }
    return member;
}

// Resolves discord username
const parseUsername = (username, markdown = false) => {
    let member = server.members.resolve(config.users[username]);
    if (config.users[username] && member) {
        if (markdown) return member;
        else return member.displayName;
    } else return null;
}

// Gets embedding template
const getEmbedBase = (event) => new Discord.MessageEmbed()
    .setFooter(
        `${server.members.resolve(discord.user.id).displayName} • ${event.data.board.name} [${event.data.board.shortLink}]`,
        discord.user.displayAvatarURL())
    .setTimestamp(event.hasOwnProperty("date") ? event.date : Date.now())
    .setColor("#0ABDA0");