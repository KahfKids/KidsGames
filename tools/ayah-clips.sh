#!/bin/sh
# Short Surahs: the recited ayat the quiz plays, kept in the repo so the quiz works offline and asks no other site.
#   sh tools/ayah-clips.sh        (run from the repo root; needs node, curl, ffmpeg)
# Lists every clip the bank uses (games/short-surahs/data.js), downloads the missing originals once into
# ../KidsGames-sounds/everyayah/Husary_Muallim_128kbps/ (kept outside the repo, like the other recordings), and writes
# games/short-surahs/audio/ayah/<surah><ayah>.m4a: the same recitation, unedited, re-encoded to mono AAC 64 kbit/s.
# Source and terms: games/short-surahs/audio/CREDITS.md.
set -e
SRC=../KidsGames-sounds/everyayah/Husary_Muallim_128kbps
OUT=games/short-surahs/audio/ayah
mkdir -p "$SRC" "$OUT"
node -e "
global.window=global;global.document={currentScript:null};global.Kit={};global.location={search:''};
['quiz.js','themes.js','catalog.js','surahs.js','scenes.js'].forEach(f=>require('./js/quiz/'+f));
require('./games/short-surahs/data.js');
const u=new Set(); KahfQuiz.defs['short-surahs'].bank.forEach(q=>[].concat(q.audio||[]).forEach(x=>u.add(x.split('/').pop().replace('.m4a',''))));
console.log([...u].sort().join('\n'));
" | while read id; do
  [ -s "$SRC/$id.mp3" ] || curl -sS -f -o "$SRC/$id.mp3" "https://everyayah.com/data/Husary_Muallim_128kbps/$id.mp3"
  [ -s "$OUT/$id.m4a" ] || ffmpeg -loglevel error -y -i "$SRC/$id.mp3" -map_metadata -1 -ac 1 -ar 44100 -c:a aac -b:a 64k -movflags +faststart "$OUT/$id.m4a"
done
ls "$OUT" | wc -l
du -sh "$OUT"
