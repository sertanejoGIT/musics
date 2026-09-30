/*
 * Rádio Hungria Hip Hop
 *
 * Sistema de múltiplas playlists
 *
 * Estrutura do playlists.txt:
 *
 * Hungria Hip Hop|Hungria+Hip-Hop/hungriaHipHop.m3u
 * Lil Wayne|Lil+Wayne/lilWayne.m3u
 */


// ============================================================
// ELEMENTOS DA INTERFACE
// ============================================================

const audio = document.getElementById("audio");

const title = document.getElementById("title");
const artist = document.getElementById("artist");
const nextTrack = document.getElementById("nextTrack");
const counter = document.getElementById("counter");
const status = document.getElementById("status");
const playlist = document.getElementById("playlist");

const playlistSelect =
  document.getElementById("playlistSelect");

const previousButton =
  document.getElementById("previous");

const playButton =
  document.getElementById("play");

const nextButton =
  document.getElementById("next");


// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let playlists = [];

let tracks = [];

let currentIndex = 0;

let selectedPlaylist = null;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  initialize
);


async function initialize() {
  try {

    setStatus("Carregando playlists...");

    await loadPlaylists();

    if (!playlists.length) {
      throw new Error(
        "Nenhuma playlist foi encontrada."
      );
    }

    renderPlaylistSelector();

    // Seleciona automaticamente a primeira playlist
    await selectPlaylist(0);

  } catch (error) {

    console.error(error);

    setStatus(
      error.message ||
      "Não foi possível inicializar o sistema.",
      true
    );
  }
}


// ============================================================
// CARREGAR playlists.txt
// ============================================================

async function loadPlaylists() {

  const response = await fetch(
    "./playlists.txt",
    {
      cache: "no-cache"
    }
  );

  if (!response.ok) {
    throw new Error(
      "Não foi possível carregar o arquivo playlists.txt."
    );
  }

  const text = await response.text();

  playlists = parsePlaylistCatalog(text);
}


// ============================================================
// INTERPRETAR playlists.txt
// ============================================================

function parsePlaylistCatalog(text) {

  return text
    .split(/\r?\n/)

    .map(line => line.trim())

    .filter(line => {

      if (!line) {
        return false;
      }

      if (line.startsWith("#")) {
        return false;
      }

      return line.includes("|");
    })

    .map(line => {

      const separatorIndex =
        line.indexOf("|");

      const name =
        line
          .substring(0, separatorIndex)
          .trim();

      const url =
        line
          .substring(separatorIndex + 1)
          .trim();

      return {
        name,
        url
      };

    })

    .filter(playlist => {

      return (
        playlist.name &&
        playlist.url
      );

    });
}


// ============================================================
// MOSTRAR PLAYLISTS NO SELECT
// ============================================================

function renderPlaylistSelector() {

  playlistSelect.innerHTML = "";

  playlists.forEach(
    (playlistItem, index) => {

      const option =
        document.createElement("option");

      option.value = index;

      option.textContent =
        playlistItem.name;

      playlistSelect.appendChild(
        option
      );
    }
  );

  playlistSelect.disabled = false;
}


// ============================================================
// SELECIONAR UMA PLAYLIST
// ============================================================

async function selectPlaylist(index) {

  const playlistItem =
    playlists[index];

  if (!playlistItem) {
    return;
  }

  selectedPlaylist =
    playlistItem;

  currentIndex = 0;

  tracks = [];

  clearPlayer();

  playlist.innerHTML = "";

  setStatus(
    `Carregando "${playlistItem.name}"...`
  );

  playlistSelect.disabled = true;

  try {

    await loadPlaylist(
      playlistItem.url
    );

    if (!tracks.length) {

      throw new Error(
        "Nenhuma música foi encontrada nessa playlist."
      );
    }

    renderPlaylist();

    loadTrack(0);

    setStatus(
      `${tracks.length} música(s) carregada(s).`
    );

  } catch (error) {

    console.error(error);

    setStatus(
      `Erro ao carregar "${playlistItem.name}".`,
      true
    );

    renderEmptyPlaylist(
      "Não foi possível carregar esta playlist."
    );

  } finally {

    playlistSelect.disabled = false;
  }
}


// ============================================================
// CARREGAR ARQUIVO M3U
// ============================================================

async function loadPlaylist(url) {

  const response =
    await fetch(
      resolveUrl(url),
      {
        cache: "no-cache"
      }
    );

  if (!response.ok) {

    throw new Error(
      `Erro HTTP ${response.status}`
    );
  }

  const text =
    await response.text();

  tracks =
    parseM3U(text);
}


// ============================================================
// CONVERTER URL RELATIVA EM URL ABSOLUTA
// ============================================================

function resolveUrl(url) {

  return new URL(
    url,
    window.location.href
  ).href;
}


// ============================================================
// PARSER M3U
// ============================================================

function parseM3U(text) {

  const lines =
    text.split(/\r?\n/);

  const result = [];

  let pendingTitle = "";

  let pendingArtist = "";

  for (let i = 0; i < lines.length; i++) {

    const line =
      lines[i].trim();

    if (!line) {
      continue;
    }


    // --------------------------------------------------------
    // Ignora cabeçalho
    // --------------------------------------------------------

    if (
      line === "#EXTM3U"
    ) {
      continue;
    }


    // --------------------------------------------------------
    // Informações EXTINF
    //
    // Exemplo:
    //
    // #EXTINF:-1,Nome da música - Artista
    //
    // --------------------------------------------------------

    if (
      line.startsWith("#EXTINF:")
    ) {

      const info =
        line.substring(8);

      const commaIndex =
        info.indexOf(",");

      if (commaIndex !== -1) {

        const metadata =
          info.substring(
            commaIndex + 1
          ).trim();

        const parsed =
          parseTrackMetadata(
            metadata
          );

        pendingTitle =
          parsed.title;

        pendingArtist =
          parsed.artist;

      } else {

        pendingTitle = info;

        pendingArtist = "";
      }

      continue;
    }


    // --------------------------------------------------------
    // Ignora outras diretivas M3U
    // --------------------------------------------------------

    if (line.startsWith("#")) {
      continue;
    }


    // --------------------------------------------------------
    // Linha contendo o endereço do áudio
    // --------------------------------------------------------

    const trackUrl =
      resolvePlaylistTrackUrl(
        line,
        selectedPlaylist
          ? selectedPlaylist.url
          : ""
      );

    result.push({

      title:
        pendingTitle ||
        getFilename(trackUrl),

      artist:
        pendingArtist ||
        "Artista desconhecido",

      url:
        trackUrl

    });


    // Limpa metadados para a próxima música

    pendingTitle = "";

    pendingArtist = "";
  }

  return result;
}


// ============================================================
// INTERPRETAR TÍTULO DA MÚSICA
// ============================================================

function parseTrackMetadata(metadata) {

  let title = metadata;

  let artist = "";


  /*
   * Formato comum:
   *
   * Artista - Título
   */

  const separator =
    metadata.indexOf(" - ");


  if (separator !== -1) {

    artist =
      metadata
        .substring(
          0,
          separator
        )
        .trim();

    title =
      metadata
        .substring(
          separator + 3
        )
        .trim();

  }


  return {
    title,
    artist
  };
}


// ============================================================
// RESOLVER URL DA MÚSICA
// ============================================================

function resolvePlaylistTrackUrl(
  trackUrl,
  playlistUrl
) {

  try {

    /*
     * URL absoluta
     */

    return new URL(
      trackUrl,
      resolveUrl(playlistUrl)
    ).href;

  } catch {

    return trackUrl;
  }
}


// ============================================================
// OBTER NOME DO ARQUIVO
// ============================================================

function getFilename(url) {

  try {

    const parsed =
      new URL(url);

    const pathname =
      parsed.pathname;

    const filename =
      pathname
        .split("/")
        .pop();

    if (!filename) {
      return "Sem título";
    }

    return decodeURIComponent(
      filename
    );

  } catch {

    return "Sem título";
  }
}


// ============================================================
// CARREGAR MÚSICA
// ============================================================

function loadTrack(index) {

  if (!tracks.length) {
    return;
  }


  /*
   * Volta para a última música
   */

  if (index < 0) {

    index =
      tracks.length - 1;
  }


  /*
   * Volta para a primeira música
   */

  if (index >= tracks.length) {

    index = 0;
  }


  currentIndex =
    index;


  const track =
    tracks[currentIndex];


  title.textContent =
    track.title ||
    "Sem título";


  artist.textContent =
    track.artist ||
    "Artista desconhecido";


  audio.src =
    track.url;


  audio.load();


  updateNextTrack();

  updateCounter();

  updatePlaylist();
}


// ============================================================
// LIMPAR PLAYER
// ============================================================

function clearPlayer() {

  audio.pause();

  audio.removeAttribute(
    "src"
  );

  audio.load();

  title.textContent =
    "Carregando...";

  artist.textContent =
    "—";

  nextTrack.textContent =
    "Próxima: —";

  counter.textContent =
    "—";

  playButton.textContent =
    "▶ Tocar";
}


// ============================================================
// MÚSICA ANTERIOR
// ============================================================

function previousTrack() {

  if (!tracks.length) {
    return;
  }


  const wasPlaying =
    !audio.paused;


  loadTrack(
    currentIndex - 1
  );


  if (wasPlaying) {
    playAudio();
  }
}


// ============================================================
// PRÓXIMA MÚSICA
// ============================================================

function nextTrackAction() {

  if (!tracks.length) {
    return;
  }


  const wasPlaying =
    !audio.paused;


  loadTrack(
    currentIndex + 1
  );


  if (wasPlaying) {
    playAudio();
  }
}


// ============================================================
// PLAY / PAUSE
// ============================================================

function togglePlay() {

  if (!audio.src) {

    setStatus(
      "Nenhuma música carregada.",
      true
    );

    return;
  }


  if (audio.paused) {

    playAudio();

  } else {

    pauseAudio();
  }
}


// ============================================================
// PLAY
// ============================================================

function playAudio() {

  const promise =
    audio.play();


  if (promise !== undefined) {

    promise

      .then(() => {

        updatePlayButton();

        setStatus(
          `Reproduzindo: ${title.textContent}`
        );

      })

      .catch(error => {

        console.error(error);

        setStatus(
          "Não foi possível iniciar a reprodução.",
          true
        );

      });
  }
}


// ============================================================
// PAUSE
// ============================================================

function pauseAudio() {

  audio.pause();

  updatePlayButton();

  setStatus(
    "Reprodução pausada."
  );
}


// ============================================================
// ATUALIZAR BOTÃO PLAY
// ============================================================

function updatePlayButton() {

  if (audio.paused) {

    playButton.textContent =
      "▶ Tocar";

  } else {

    playButton.textContent =
      "⏸ Pausar";
  }
}


// ============================================================
// PRÓXIMA FAIXA
// ============================================================

function updateNextTrack() {

  if (!tracks.length) {

    nextTrack.textContent =
      "Próxima: —";

    return;
  }


  const nextIndex =
    (
      currentIndex + 1
    ) % tracks.length;


  const track =
    tracks[nextIndex];


  nextTrack.textContent =
    `Próxima: ${
      track.title || "Sem título"
    }`;
}


// ============================================================
// CONTADOR
// ============================================================

function updateCounter() {

  if (!tracks.length) {

    counter.textContent =
      "—";

    return;
  }


  counter.textContent =
    `${currentIndex + 1} / ${tracks.length}`;
}


// ============================================================
// RENDERIZAR LISTA DE MÚSICAS
// ============================================================

function renderPlaylist() {

  playlist.innerHTML = "";


  if (!tracks.length) {

    renderEmptyPlaylist(
      "Nenhuma música encontrada."
    );

    return;
  }


  tracks.forEach(
    (track, index) => {

      const item =
        document.createElement("div");


      item.className =
        "item";


      item.innerHTML = `
        <strong>
          ${escapeHtml(
            track.title ||
            "Sem título"
          )}
        </strong>

        <span>
          ${escapeHtml(
            track.artist ||
            "Artista desconhecido"
          )}
        </span>
      `;


      item.addEventListener(
        "click",
        () => {

          const wasPlaying =
            !audio.paused;


          loadTrack(index);


          if (wasPlaying) {
            playAudio();
          }

        }
      );


      playlist.appendChild(
        item
      );
    }
  );


  updatePlaylist();
}


// ============================================================
// PLAYLIST VAZIA
// ============================================================

function renderEmptyPlaylist(
  message
) {

  playlist.innerHTML = "";

  const empty =
    document.createElement("div");

  empty.className =
    "playlist-empty";

  empty.textContent =
    message;

  playlist.appendChild(
    empty
  );
}


// ============================================================
// DESTACAR MÚSICA ATUAL
// ============================================================

function updatePlaylist() {

  const items =
    playlist.querySelectorAll(
      ".item"
    );


  items.forEach(
    (item, index) => {

      item.classList.toggle(
        "active",
        index === currentIndex
      );

    }
  );
}


// ============================================================
// STATUS
// ============================================================

function setStatus(
  message,
  error = false
) {

  status.textContent =
    message;


  status.classList.toggle(
    "error",
    error
  );
}


// ============================================================
// EVENTOS DO PLAYER
// ============================================================

audio.addEventListener(
  "play",
  () => {

    updatePlayButton();
  }
);


audio.addEventListener(
  "pause",
  () => {

    updatePlayButton();
  }
);


audio.addEventListener(
  "ended",
  () => {

    nextTrackAction();
  }
);


audio.addEventListener(
  "error",
  () => {

    setStatus(
      "Erro ao carregar o áudio.",
      true
    );
  }
);


// ============================================================
// EVENTOS DOS BOTÕES
// ============================================================

previousButton.addEventListener(
  "click",
  previousTrack
);


playButton.addEventListener(
  "click",
  togglePlay
);


nextButton.addEventListener(
  "click",
  nextTrackAction
);


// ============================================================
// EVENTO DO SELECT DE PLAYLISTS
// ============================================================

playlistSelect.addEventListener(
  "change",
  async event => {

    const index =
      Number(event.target.value);

    await selectPlaylist(index);
  }
);


// ============================================================
// PROTEÇÃO CONTRA HTML
// ============================================================

function escapeHtml(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value;

  return div.innerHTML;
}
