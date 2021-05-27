const Discord       = require('discord.js');
const mysql         = require('mysql');
const ytdl          = require('ytdl-core');

const asTable = require ('as-table').configure ({
    print (x, k) {
        if (k === 'Date') return new Date(x).toLocaleString()
        return String (x)
    }
})

const Config        = require('./TutajowyBot.config.json');

var con = mysql.createConnection({
    host:       Config.SQL_Host,
    user:       Config.SQL_User,
    password:   Config.SQL_Pass,
    database:   Config.SQL_Database,
    charset:    Config.SQL_Charset
});

//const client = new Discord.Client();
const client = new Discord.Client({ ws: { properties: { $browser: "Discord iOS" }} });

client.login(Config.DiscordToken);

client.on('ready', () => { 
    console.log(`[DISCORD] Connected to Discord as ${client.user.tag}!`); 

    con.connect(function(err) {
        if (err) throw err;
        console.log("[MYSQL] Connected to database!");
    });
});

function sendMessage(channelid, wiadomosc) {
    //Gdzie ma wysłać wiadomość
    const channelObject = client.channels.cache.find(channel => channel.id === channelid);

    //Ładna wiadomosc to podstawa (chyba!)
    const embed = new Discord.MessageEmbed()
    embed.setColor(Config.EMBED_Kolor);
    embed.setDescription(wiadomosc);
    channelObject.send(embed);
}

client.on('guildMemberAdd', member => {
    //Zapytajmy sie bazy czy kiedykolwiek ten user miał jakiegos warna
    con.query("SELECT * FROM warny WHERE AbuserUserID = ?", [member.user.id], function (error, results) {
        if (error) console.log(error.message);

        //Pobierzmy jego dane
        if (results.length != 0) {
            for (var i = 0; i < results.length; i++) {
                if(results[i].WarnType == "kick")   member.roles.add(Config.ROLE_OstrzezenieKick_ID);
                if(results[i].WarnType == "ban")    member.roles.add(Config.ROLE_OstrzezenieBan_ID);
            }
        }
    });
})

client.on('message', message => {
    if (message.webhookID) return;

    if(message.content.indexOf(Config.METO_Prefix) == 0) {
		var msg = message.content;
		var commands = msg.substring(Config.METO_Prefix.length);
        var args = commands.split(" ");
        
        switch(args['0'].toLowerCase()) {
            case 'play':
                if(message.member.id == 793161523643809803) {
                    const channel = message.member.voice.channel;
                    if (channel && channel.type === 'voice') {
                        if(args['1'] == null) {
                            channel.join().then(conn => { conn.play('https://22613.live.streamtheworld.com/Q_DANCE.mp3'); });
                        } else {
                            if(args['1'].includes("youtube.com")) {
                                channel.join().then(conn => { 
                                    const dispatcher = conn.play( ytdl(args['1'], { filter: 'audioonly' }, { passes: 3 }) );
                                    dispatcher.on('end', function(){
                                        dispatcher = conn.play('https://22613.live.streamtheworld.com/Q_DANCE.mp3');
                                    })
                                });
                            } else {
                                channel.join().then(conn => { 
                                    const dispatcher = conn.play( args['1'] );
                                    dispatcher.on('end', function(){
                                        dispatcher = conn.play('https://22613.live.streamtheworld.com/Q_DANCE.mp3');
                                    })
                                });
                            }
                        }
                    } else {
                        message.reply('Not in VoiceChannel!');
                    }
                }

                break;
            default:
                //message.reply("Nie.");
                break;
        }
    }
});

client.ws.on('INTERACTION_CREATE', async interaction => {
    switch(interaction.data.name) {
        case "ostrzezenie":
            //Zawsze odpowiadaj na interakcje! (W sekrecie ofc)
            client.api.interactions(interaction.id, interaction.token).callback.post({data: {type: 2}});

            let all_data          = interaction.data.options;

            let typ_ostrzezenia   = all_data.find(kind => kind.name == "typ_ostrzezenia")['value'];
            let uzytkownik        = all_data.find(kind => kind.name == "uzytkownik")['value'];
            let powod             = all_data.find(kind => kind.name == "powod");

            //Nie chcemy by moderator sam siebie zgłaszał. (Chyba nie jest debilem...)
            //EDIT: Jednak chcemy.
            /*if(uzytkownik == interaction.member.user.id) { 
                sendMessage(interaction.channel_id, "Dlaczego chcesz siebie zgłosić, <@" + interaction.member.user.id + ">?");
                return; 
            }*/

            //Nie chcemy też by bota zgłaszano! (Bo co on zawinił)
            if(uzytkownik == Config.BOT_UserID) { 
                sendMessage(interaction.channel_id, "Dlaczego chcesz zgłosić bota, <@" + interaction.member.user.id + ">?");
                return; 
            }

            //Wykrycie czy powód został podany czy nie.
            powod = (powod == null) ? "nie podano powodu" : powod['value'];

            //Zbieraj role
            let roleid = 0;
            switch(typ_ostrzezenia) {
                case "kick":    roleid = Config.ROLE_OstrzezenieKick_ID;    break;
                case "ban":     roleid = Config.ROLE_OstrzezenieBan_ID;     break;
                default:        /* CO? */                                   break;
            }

            //Ustaw role
            client.guilds.fetch(interaction.guild_id).then(guild => {
                guild.members.fetch(uzytkownik).then(member => {
                    member.roles.add(roleid);
                })
            });

            //Zapisz log
            con.query("INSERT INTO warny (`AbuserUserID`, `UserID`, `UserName`, `Reason`, `WarnType`) VALUES (?, ?, ?, ?, ?)", [uzytkownik, interaction.member.user.id, interaction.member.user.username, powod, typ_ostrzezenia], function (error, results, fields) {
                if (error) console.log(error.message);
            });

            //Wyślij wiadomość
            sendMessage(interaction.channel_id, "<@"+uzytkownik+">, dostałeś ostrzeżenie typu **" + typ_ostrzezenia + "**. Powód: _" + powod + "_");
            break;
        case 'lista':
            //Zawsze odpowiadaj na interakcje!
            client.api.interactions(interaction.id, interaction.token).callback.post({data: {type: 2}});

            //Znajdzmy uzytkownika
            let lista = interaction.data.options.find(kind => kind.name == "uzytkownik")['value'];
            con.query("SELECT WarnType as Typ, UserName as OdKogo,Reason as Powód, Date FROM warny WHERE AbuserUserID = ?", [lista], function (error, results) {
                if (error) console.log(error.message);

                if (results.length == 0) {
                    //Brak ostrzezen, grzeczny chłopczyk
                    sendMessage(interaction.channel_id, "Brak ostrzeżeń dla użytkownika <@" + lista + ">");
                } else {
                    //Uuuu, zawinił
                    let res = asTable(results);
                    sendMessage(interaction.channel_id, "Ostrzeżenia użytkownika <@" + lista + ">: \n\n```" + Discord.escapeMarkdown(res) + "```");
                }
            });

            break;
        case 'usun_ostrzezenia':
            //Zawsze odpowiadaj na interakcje! (W sekrecie ofc)
            client.api.interactions(interaction.id, interaction.token).callback.post({data: {type: 2}});

            //Znajdzmy uzytkownika
            let usun_komu = interaction.data.options.find(kind => kind.name == "uzytkownik")['value'];

            client.guilds.fetch(interaction.guild_id).then(guild => {
                guild.members.fetch(usun_komu).then(member => {
                    member.roles.remove(Config.ROLE_OstrzezenieBan_ID);
                    member.roles.remove(Config.ROLE_OstrzezenieKick_ID);
                })
            });

            con.query("DELETE FROM warny WHERE AbuserUserID = ?", [usun_komu], function (error) {
                if (error) console.log(error.message);

                sendMessage(interaction.channel_id, "Wszystkie ostrzeżenia użytkownika <@" + usun_komu + "> zostały usunięte.");
            });
            break;
        default:
            break;
    }
})