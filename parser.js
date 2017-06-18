var split = require('split');
var commander = require('commander');
var fs = require('fs');

var score = {
    metadata: {},
    notes: []
};
var wav_map = {};
var events = [];
var section;
var lineno = 0;

var partial_holds = [], partial_slide_a, partial_slide_b;

var header_handler = {
    bpm: function(bpm_str) {
        return parseInt(bpm_str);
    }
};

var track_map = [6, 1, 2, 3, 4, 5, 8];

function identity(arg) {
    return arg;
}

function parseHeader(line) {
    var entities = line.split(' ');
    var key = entities[0].substr(1);
    var value = entities.slice(1).join(' ');
    if(key.startsWith('WAV')) {
        wav_map[key.substr(3)] = value.replace(/\.wav$/, '');
        if(value.toLowerCase().startsWith('bgm')) {
            score.metadata['bgmID'] = value.substr(3, 3);
            wav_map[key.substr(3)] = 'bgm';
        }
    }
    else {
        score.metadata[key.toLowerCase()] = (header_handler[key.toLowerCase()] || identity)(value.toLowerCase());
    }
}

function parseData(line) {
    var entities = line.substr(1).split(':');
    var bar_idx = parseInt(entities[0].substr(0, 3)),
        event_type = parseInt(entities[0].substr(3, 1)),
        track_idx = track_map.indexOf(parseInt(entities[0].substr(4)));
    var beats = entities[1].match(/../g);
    var denominator = beats.length;
    if(track_idx == -1) {
        throw "Invalid track index at line " + lineno;
    }
    for(var i = 0; i < beats.length; i++) {
        if(beats[i] !== '00') {
            events.push({
                bar_idx: bar_idx,
                event_type: event_type,
                track_idx: track_idx,
                denominator: denominator,
                beat_idx: i,
                command: beats[i]
            });
        }
    }
}

function noteCompare(a, b) {
    return (a.bar_idx + a.beat_idx / a.denominator) - (b.bar_idx + b.beat_idx / b.denominator);
}

function processNotes() {
    events.sort(noteCompare);
    for(var i = 0; i < events.length; i++) {
        var event = events[i];
        var note = {
            time: {
                bar_idx: event.bar_idx,
                beat_idx: event.beat_idx,
                denominator: event.denominator
            },
            track_idx: event.track_idx
        }
        if(event.event_type == 0) {
            switch(wav_map[event.command]) {
                case 'bgm':
                    note.type = "special";
                    note.command = "bgm";
                    score.notes.push(note);
                    break;
                case 'cmd_fever_ready':
                    note.type = "special";
                    note.command = "fever_ready";
                    score.notes.push(note);
                    break;
                case 'cmd_fever_start':
                    note.type = "special";
                    note.command = "fever_start";
                    score.notes.push(note);
                    break;
                case 'cmd_fever_checkpoint':
                    note.type = "special";
                    note.command = "fever_checkpoint";
                    score.notes.push(note);
                    break;
                case 'cmd_fever_end':
                    note.type = "special";
                    note.command = "fever_end";
                    score.notes.push(note);
                    break;
                default:
                    console.warn("Unkown command " + event.command);
            }
        }
        else if(event.event_type == 1) {
            switch(wav_map[event.command]) {
                case 'fever_note_flick':
                    note.is_flick = true;
                case 'fever_note':
                    note.is_fever = true;
                    note.type = "tap";
                    score.notes.push(note);
                    break;
                case 'slide_a':
                    if(!partial_slide_a) {
                        var copy = Object.assign({}, note);
                        copy.type = "slide";
                        copy.ticks = [];
                        partial_slide_a = copy;
                        score.notes.push(copy);
                    }
                    partial_slide_a.ticks.push(note);
                    break;
                case 'slide_end_a':
                    partial_slide_a.ticks.push(note);
                    partial_slide_a = null;
                    break;
                case 'slide_b':
                    if(!partial_slide_b) {
                        var copy = Object.assign({}, note);
                        copy.type = "slide";
                        copy.ticks = [];
                        partial_slide_b = copy;
                        score.notes.push(copy);
                    }
                    partial_slide_b.ticks.push(note);
                    break;
                case 'slide_end_b':
                    partial_slide_b.ticks.push(note);
                    partial_slide_b = null;
                    break;
                case 'flick':
                    note.is_flick = true;
                case 'skill':
                    if(wav_map[event.command] === 'skill') {
                        note.is_skill = true;
                    }
                case 'bd':
                default:
                    note.type = "tap";
                    score.notes.push(note);
                    break;
            }
        }
        else if(event.event_type == 5) {
            var partial_note = partial_holds[event.track_idx] || Object.assign({}, note);
            switch(wav_map[event.command]) {
                case 'fever_note_flick':
                    partial_note.is_fever = true;
                case 'flick':
                    partial_note.is_flick = true;
                    if(!partial_note.ticks) {
                        console.warn(event);
                    }
                    partial_note.ticks.push(note);
                    partial_holds[event.track_idx] = null;
                    break;
                case 'fever_note':
                    partial_note.is_fever = true;
                case 'skill':
                    if(wav_map[event.command] === 'skill') {
                        partial_note.is_skill = true;
                    }
                case 'bd':
                default:
                    if(partial_holds[event.track_idx]) {
                        partial_note.ticks.push(note);
                        partial_holds[event.track_idx] = null;
                    }
                    else {
                        partial_holds[event.track_idx] = partial_note;
                        partial_note.type = 'slide';
                        partial_note.ticks = [note];
                        score.notes.push(partial_note);
                    }
                    break;
            }
        }
        else {
            console.warn("Unkown event type " + event.event_type);
        }
    }
}

function processLine(line) {
    lineno++;
    line = line.trim();
    if(!line.length) {
        return;
    }
    if(line.startsWith('*-')) {
        if(line.endsWith('HEADER FIELD')) {
            section = 'HEADER'
        }
        else if(line.endsWith('MAIN DATA FIELD')) {
            section = 'MAIN DATA'
        }
        else {
            throw "Unknown field definition at line " + lineno;
        }
    }
    else if(line.startsWith('#')) {
        switch(section) {
            case 'HEADER':
                parseHeader(line);
                break;
            case 'MAIN DATA':
                parseData(line);
                break;
            default:
        }
    }
    else {
        throw "Unknown entity at line " + lineno;
    }
}

var musicInfo;
var diffNames = ['easy', 'normal', 'hard', 'expert'];

function readMusicDb() {
    var file = commander.musics;
    if (file === undefined)
        return;

    musicDb = JSON.parse(fs.readFileSync(file, 'utf8'));
    musicInfo = musicDb.find(function (m) {
        return m.bgmId === score.metadata.bgm;
    });
}

function processMusicData() {
    if (musicInfo === undefined)
        return;
    
    score.metadata.title = musicInfo.title;
}

function processDifficulty() {
    var diff = commander.difficulty;
    if (diff === undefined)
        return;
    diff = diffNames.indexOf(diff.toLowerCase());
    if (diff < 0)
        throw "Invalid difficulity";
    
    score.metadata.difficulty = diffNames[diff];
    
    if (musicInfo === null)
        return;
    score.metadata.level = Number(musicInfo.levels[diff]);
    score.metadata.combo = Number(musicInfo.combos[diff]);
}

commander
    .option('-m, --musics [file]', 'Music information file')
    .option('-d, --difficulty [diff]', 'Difficulity, must be one of easy, normal, hard and expert')
    .parse(process.argv);

process.stdin
    .pipe(split())
    .on('data', processLine)
    .on('end', function() {
        processNotes();
        readMusicDb();
        processMusicData();
        processDifficulty();
        process.stdout.write(JSON.stringify(score));
    });
