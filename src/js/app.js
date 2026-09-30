/*
 * Rádio Hungria Hip Hop
 *
 * Toda a lógica da aplicação deve ficar neste arquivo.
 */

const audio = document.getElementById("audio");

const title = document.getElementById("title");
const artist = document.getElementById("artist");
const nextTrack = document.getElementById("nextTrack");
const counter = document.getElementById("counter");
const status = document.getElementById("status");
const playlist = document.getElementById("playlist");

const previousButton = document.getElementById("previous");
const playButton = document.getElementById("play");
const nextButton = document.getElementById("next");


/*
 * Estado da aplicação
 */

let tracks = [];
let currentIndex = 0;


/*
 * Inicialização
 */

document.addEventListener("DOMContentLoaded", () => {
  initialize();
});


async function initialize() {
  try {
    setStatus("Carregando playlist...");

    await loadPlaylist();

    if (!tracks.length) {
      throw new Error("A playlist está vazia.");
    }

    renderPlaylist();
    loadTrack(currentIndex);

    setStatus("Playlist carregada.");
  } catch (error) {
    console.error(error);

    setStatus(
      error.message || "Não foi possível carregar a playlist.",
      true
    );
  }
}


/*
 * Carregamento da playlist
 *
 * Ajuste esta função conforme a fonte real
 * da playlist/API da rádio.
 */

async function loadPlaylist() {
  /*
   * Exemplo de estrutura esperada:
   *
   * [
   *   {
   *     title: "Música",
   *     artist: "Artista",
   *     url: "audio/musica.mp3"
   *   }
   * ]
   *
   * Por enquanto, deixamos uma playlist
   * de exemplo para a estrutura funcionar.
   */

  tracks = [
    {
      title: "Hungria Hip Hop",
      artist: "Rádio Hungria Hip Hop",
      url: ""
    }
  ];
}


/*
 * Carrega uma música específica
 */

function loadTrack(index) {
  if (!tracks.length) {
    return;
  }

  if (index < 0) {
    index = tracks.length - 1;
  }

  if (index >= tracks.length) {
    index = 0;
  }

  currentIndex = index;

  const track = tracks[currentIndex];

  title.textContent = track.title || "Sem título";
  artist.textContent = track.artist || "Artista desconhecido";

  if (track.url) {
    audio.src = track.url;
    audio.load();
  }

  updateNextTrack();
  updateCounter();
  updatePlaylist();
}


/*
 * Música anterior
 */

function previousTrack() {
  if (!tracks.length) {
    return;
  }

  const wasPlaying = !audio.paused;

  loadTrack(currentIndex - 1);

  if (wasPlaying) {
    playAudio();
  }
}


/*
 * Próxima música
 */

function nextTrackAction() {
  if (!tracks.length) {
    return;
  }

  const wasPlaying = !audio.paused;

  loadTrack(currentIndex + 1);

  if (wasPlaying) {
    playAudio();
  }
}


/*
 * Play / Pause
 */

function togglePlay() {
  if (!audio.src) {
    setStatus("Nenhum arquivo de áudio disponível.", true);
    return;
  }

  if (audio.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
}


function playAudio() {
  const promise = audio.play();

  if (promise !== undefined) {
    promise
      .then(() => {
        updatePlayButton();
        setStatus("Reproduzindo.");
      })
      .catch((error) => {
        console.error(error);

        setStatus(
          "Não foi possível iniciar a reprodução.",
          true
        );
      });
  }
}


function pauseAudio() {
  audio.pause();

  updatePlayButton();
  setStatus("Pausado.");
}


function updatePlayButton() {
  if (audio.paused) {
    playButton.textContent = "▶ Tocar";
  } else {
    playButton.textContent = "⏸ Pausar";
  }
}


/*
 * Atualiza informação da próxima faixa
 */

function updateNextTrack() {
  if (!tracks.length) {
    nextTrack.textContent = "Próxima: —";
    return;
  }

  const nextIndex =
    (currentIndex + 1) % tracks.length;

  const track = tracks[nextIndex];

  nextTrack.textContent =
    `Próxima: ${track.title || "Sem título"}`;
}


/*
 * Atualiza contador
 */

function updateCounter() {
  if (!tracks.length) {
    counter.textContent = "—";
    return;
  }

  counter.textContent =
    `${currentIndex + 1} / ${tracks.length}`;
}


/*
 * Renderiza a playlist
 */

function renderPlaylist() {
  playlist.innerHTML = "";

  tracks.forEach((track, index) => {
    const item = document.createElement("div");

    item.className = "item";

    item.innerHTML = `
      <strong>${escapeHtml(track.title || "Sem título")}</strong>
      <br>
      <span>${escapeHtml(track.artist || "Artista desconhecido")}</span>
    `;

    item.addEventListener("click", () => {
      const wasPlaying = !audio.paused;

      loadTrack(index);

      if (wasPlaying) {
        playAudio();
      }
    });

    playlist.appendChild(item);
  });

  updatePlaylist();
}


/*
 * Destaca a música atual
 */

function updatePlaylist() {
  const items = playlist.querySelectorAll(".item");

  items.forEach((item, index) => {
    item.classList.toggle(
      "active",
      index === currentIndex
    );
  });
}


/*
 * Status da aplicação
 */

function setStatus(message, error = false) {
  status.textContent = message;

  status.classList.toggle(
    "error",
    error
  );
}


/*
 * Quando uma música termina,
 * avança automaticamente.
 */

audio.addEventListener("ended", () => {
  nextTrackAction();
});


/*
 * Eventos do player
 */

audio.addEventListener("play", () => {
  updatePlayButton();
});

audio.addEventListener("pause", () => {
  updatePlayButton();
});

audio.addEventListener("error", () => {
  setStatus(
    "Erro ao carregar o áudio.",
    true
  );
});


/*
 * Botões
 */

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


/*
 * Proteção contra HTML
 * quando dados externos forem exibidos.
 */

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}
