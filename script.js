const audio = document.getElementById('audioPlayer');
const fileInput = document.getElementById('fileInput');
const trackList = document.getElementById('trackList');
const recentGrid = document.getElementById('recentGrid');
const progress = document.getElementById('progress');
let tracks = [];
let currentIndex = -1;
let recent = [];
let shuffle = false;
let repeat = false;
let toastTimer;

const $ = (id) => document.getElementById(id);
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
};
function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function openPicker() { fileInput.click(); }
['importButton','heroImport','emptyImport','sidebarImport'].forEach(id => $(id)?.addEventListener('click', openPicker));
fileInput.addEventListener('change', (event) => {
  const files = [...event.target.files].filter(file => file.type.startsWith('audio/'));
  if (!files.length) { notify('Choose an audio file to add it to your library.'); return; }
  files.forEach(file => tracks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: file.name.replace(/\.[^.]+$/, ''),
    artist: 'Local audio',
    file,
    url: URL.createObjectURL(file),
    added: new Date(),
    duration: 0,
    liked: false
  }));
  render();
  notify(files.length + (files.length === 1 ? ' track added' : ' tracks added') + ' to your library');
  if (currentIndex === -1) playTrack(0);
  fileInput.value = '';
});
function render() {
  $('trackCount').textContent = tracks.length + (tracks.length === 1 ? ' TRACK' : ' TRACKS');
  const query = $('searchInput').value.trim().toLowerCase();
  const visible = tracks.map((track,index)=>({...track,index})).filter(track => (track.name+' '+track.artist).toLowerCase().includes(query));
  trackList.innerHTML = visible.length ? visible.map((track,position) => `
    <div class="track-row" data-index="${track.index}">
      <span class="track-number">${track.index === currentIndex ? '♫' : String(position+1).padStart(2,'0')}</span>
      <div class="track-main"><div class="cover-art c${track.index%4+1}">♫</div><div><strong>${escapeHTML(track.name)}</strong><small>${escapeHTML(track.artist)}</small></div></div>
      <span class="track-date">${track.added.toLocaleDateString()}</span>
      <span class="track-duration">${formatTime(track.duration)}</span>
      <div class="row-actions"><button data-like="${track.index}" aria-label="Like song">${track.liked?'♥':'♡'}</button><button data-play="${track.index}" aria-label="Play song">▶</button></div>
    </div>`).join('') : '<div class="table-empty">'+(tracks.length?'No tracks match your search.':'Your library is waiting. Add a few tracks and they’ll show up here.')+'</div>';
  const recentTracks = recent.map(id => tracks.findIndex(track => track.id === id)).filter(index => index >= 0).slice(0,4);
  recentGrid.innerHTML = recentTracks.length ? recentTracks.map(index => {
    const track = tracks[index];
    return `<div class="recent-card" data-play="${index}"><div class="recent-cover">♫</div><strong>${escapeHTML(track.name)}</strong><span>${escapeHTML(track.artist)}</span></div>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">♫</div><strong>Your next favorite starts here</strong><span>Add audio files from your device to start listening.</span><button class="outline-button" id="emptyImport">＋ Import tracks</button></div>';
  $('emptyImport')?.addEventListener('click', openPicker);
  document.querySelectorAll('[data-play]').forEach(button => button.addEventListener('click', () => playTrack(Number(button.dataset.play))));
  document.querySelectorAll('[data-like]').forEach(button => button.addEventListener('click', () => toggleLike(Number(button.dataset.like))));
}
function escapeHTML(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function playTrack(index) {
  if (!tracks[index]) return;
  currentIndex = index;
  audio.src = tracks[index].url;
  audio.play().then(() => $('playButton').textContent = 'Ⅱ').catch(() => {
    $('playButton').textContent = '▶';
    notify('Press play to start this track.');
  });
  recent = [tracks[index].id, ...recent.filter(id => id !== tracks[index].id)];
  $('nowTitle').textContent = tracks[index].name;
  $('nowArtist').textContent = tracks[index].artist;
  $('miniCover').innerHTML = '<span>♫</span>';
  $('likeCurrent').textContent = tracks[index].liked ? '♥' : '♡';
  render();
}
function togglePlay() {
  if (currentIndex === -1) {
    if (tracks.length) playTrack(0);
    else { notify('Add music to your library first.'); openPicker(); }
    return;
  }
  if (audio.paused) audio.play().then(() => $('playButton').textContent='Ⅱ');
  else { audio.pause(); $('playButton').textContent='▶'; }
}
function nextTrack() {
  if (!tracks.length) return;
  let next = shuffle ? Math.floor(Math.random()*tracks.length) : (currentIndex+1)%tracks.length;
  if (repeat && currentIndex >= 0) next = currentIndex;
  playTrack(next);
}
function toggleLike(index) {
  if (!tracks[index]) return;
  tracks[index].liked = !tracks[index].liked;
  if (index === currentIndex) $('likeCurrent').textContent = tracks[index].liked ? '♥' : '♡';
  render();
}
$('playButton').addEventListener('click', togglePlay);
$('nextButton').addEventListener('click', nextTrack);
$('previousButton').addEventListener('click', () => {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (tracks.length) playTrack((currentIndex - 1 + tracks.length) % tracks.length);
});
$('likeCurrent').addEventListener('click', () => currentIndex >= 0 && toggleLike(currentIndex));
$('shuffleButton').addEventListener('click', () => {
  shuffle = !shuffle;
  $('shuffleButton').classList.toggle('selected', shuffle);
  notify(shuffle ? 'Shuffle is on' : 'Shuffle is off');
});
$('repeatButton').addEventListener('click', () => {
  repeat = !repeat;
  $('repeatButton').classList.toggle('selected', repeat);
  notify(repeat ? 'Repeat is on' : 'Repeat is off');
});
$('volume').addEventListener('input', event => audio.volume = Number(event.target.value));
audio.volume = 0.8;
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progress.value = Math.round(audio.currentTime/audio.duration*1000);
  $('currentTime').textContent = formatTime(audio.currentTime);
  $('duration').textContent = formatTime(audio.duration);
});
audio.addEventListener('loadedmetadata', () => {
  if (currentIndex >= 0) tracks[currentIndex].duration = audio.duration;
  $('duration').textContent = formatTime(audio.duration);
  render();
});
progress.addEventListener('input', () => {
  if (audio.duration) audio.currentTime = Number(progress.value)/1000*audio.duration;
});
audio.addEventListener('ended', () => repeat ? (audio.currentTime=0,audio.play()) : nextTrack());
$('searchInput').addEventListener('input', render);
$('queueButton').addEventListener('click', () => notify(tracks.length ? tracks.length+' tracks in your library' : 'Your queue is empty'));
$('newPlaylist').addEventListener('click', () => {
  const name = prompt('Name your playlist:');
  if (!name?.trim()) return;
  const button = document.createElement('button');
  button.className = 'playlist-link';
  const dot = document.createElement('span');
  dot.className = 'playlist-dot violet';
  button.append(dot, document.createTextNode(name.trim()));
  $('playlistNav').append(button);
  notify('Playlist created: '+name.trim());
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.view;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  $('pageTitle').innerHTML = view === 'favorites' ? 'Your <span>favorites.</span>' : view === 'library' ? 'All your <span>music.</span>' : 'Good music. <span>Good mood.</span>';
  $('pageSubtitle').textContent = view === 'favorites' ? 'The tracks you have saved with a little love.' : view === 'library' ? 'Every track you have added, all in one place.' : 'A little space for the songs that make your day.';
  if (view === 'favorites') {
    $('listHeading').textContent = 'Liked songs';
    const old = tracks;
    const liked = tracks.filter(track=>track.liked);
    $('trackCount').textContent = liked.length+' TRACKS';
    trackList.innerHTML = liked.length ? liked.map(track=> {
      const index=old.indexOf(track);
      return `<div class="track-row"><span class="track-number">♥</span><div class="track-main"><div class="cover-art">♫</div><div><strong>${escapeHTML(track.name)}</strong><small>${escapeHTML(track.artist)}</small></div></div><span class="track-date">${track.added.toLocaleDateString()}</span><span class="track-duration">${formatTime(track.duration)}</span><div class="row-actions"><button data-play="${index}">▶</button></div></div>`;
    }).join('') : '<div class="table-empty">Your liked songs will appear here.</div>';
    document.querySelectorAll('#trackList [data-play]').forEach(button=>button.addEventListener('click',()=>playTrack(Number(button.dataset.play))));
  } else {
    $('listHeading').textContent = 'Your tracks';
    render();
  }
}));
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); togglePlay(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('searchInput').focus(); }
});
render();