if (process.argv.length !== 3) {
	console.log('Usage: node extract_bangdb.js file');
	process.exit(0);
}

var fs = require('fs');
var obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
var musics = obj.musicList.entries;
var diffList = obj.musicDifficultyList.entries;

var diffs = diffList.map(function(x) {
    return {id: x.musicID, diff: x.difficulty, combo: x.combo, level: x.level};
}).reduce(function(acc, x) {
    var y = acc[x.id] || {};
    return Object.assign(acc, {[x.id]: Object.assign(y, {
        level: Object.assign(y.level || {}, {[x.diff]: x.level}),
        combo: Object.assign(y.combo || {}, {[x.diff]: x.combo})
    })});
}, {});

musics.forEach(function (music) {
    var id = music.achievements[0].musicID;
    var diff = diffs[id];
    if (diff === undefined)
        return;
    
    music.levels = [diff.level.easy, diff.level.normal, diff.level.hard, diff.level.expert];
    music.combos = [diff.combo.easy, diff.combo.normal, diff.combo.hard, diff.combo.expert];
});

process.stdout.write(JSON.stringify(musics));
