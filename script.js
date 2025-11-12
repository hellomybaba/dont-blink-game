const firebaseConfig = {
  apiKey: "TON_API_KEY",
  authDomain: "TON_PROJECT.firebaseapp.com",
  databaseURL: "https://dont-blink-game-da87e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "TON_PROJECT",
  storageBucket: "TON_PROJECT.appspot.com",
  messagingSenderId: "TON_SENDER_ID",
  appId: "TON_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const game = document.getElementById("game");
const flame = document.getElementById("flame");
const scoreDisplay = document.getElementById("score");

const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const usernameInput = document.getElementById("username");

const gameContainer = document.getElementById("game-container");

const endScreen = document.getElementById("end-screen");
const finalScore = document.getElementById("final-score");
const leaderboardList = document.getElementById("leaderboard");
const replayButton = document.getElementById("replay-button");

let score = 0;
let gameOver = false;
let playerName = "";
let spawnInterval;
let difficultyInterval;
let fallSpeed = 3;
let spawnDelay = 1800;
let logosPerSpawn = 1;
let elapsedTime = 0;
let leaderboardListener = null;

const logos = ["fogoflame.png"];

game.style.cursor = "none";

document.addEventListener("mousemove", e => {
  if (gameOver) return;

  const gameRect = game.getBoundingClientRect();
  let x = e.clientX - gameRect.left - flame.offsetWidth / 2;

  x = Math.max(0, Math.min(gameRect.width - flame.offsetWidth, x));

  flame.style.left = `${x}px`;
});

function createLogo(xPos) {
  if (gameOver) return;

  const logo = document.createElement("div");
  logo.classList.add("logo");
  logo.style.backgroundImage = `url('${logos[Math.floor(Math.random() * logos.length)]}')`;
  logo.style.left = xPos + "px";
  logo.style.top = "0px";
  game.appendChild(logo);

  const fall = setInterval(() => {
    if (gameOver) {
      clearInterval(fall);
      return;
    }

    let top = parseFloat(logo.style.top);
    logo.style.top = top + fallSpeed + "px";

    const flameRect = flame.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();

    if (
      logoRect.bottom >= flameRect.top &&
      logoRect.right >= flameRect.left &&
      logoRect.left <= flameRect.right
    ) {
      logo.remove();
      clearInterval(fall);
      score++;
      scoreDisplay.textContent = "Score : " + score;
    }

    if (top + logo.offsetHeight >= game.getBoundingClientRect().bottom) {
      logo.remove();
      clearInterval(fall);
      endGame();
    }
  }, 20);
}

function spawnLogos() {
  const screenWidth = game.getBoundingClientRect().width;
  const padding = 50;
  const minDistance = 200;
  const usedX = [];

  for (let i = 0; i < logosPerSpawn; i++) {
    let x;
    let attempts = 0;

    do {
      x = Math.random() * (screenWidth - 60 - 2 * padding) + padding;
      attempts++;
    } while (usedX.some(prev => Math.abs(prev - x) < minDistance) && attempts < 10);

    usedX.push(x);
    createLogo(x);
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;

  clearInterval(spawnInterval);
  clearInterval(difficultyInterval);

  const oldLogos = document.querySelectorAll(".logo");
  oldLogos.forEach(logo => logo.remove());

  saveScore(playerName, score);

  gameContainer.style.display = "none";
  endScreen.style.display = "flex";

  finalScore.textContent = `💥 ${playerName}, your final score: ${score} !`;

  listenLeaderboardRealtime();
}

function saveScore(name, score) {
  const newScoreKey = database.ref().child("leaderboard").push().key;

  const updates = {};
  updates["/leaderboard/" + newScoreKey] = {
    name: name,
    score: score
  };

  return database.ref().update(updates);
}

function listenLeaderboardRealtime() {
  if (leaderboardListener) {
    database.ref("leaderboard").off("value", leaderboardListener);
  }

  leaderboardListener = database.ref("leaderboard")
    .orderByChild("score")
    .limitToLast(10)
    .on("value", snapshot => {
      const scores = [];

      snapshot.forEach(childSnapshot => {
        scores.push(childSnapshot.val());
      });

      scores.sort((a, b) => b.score - a.score);

      leaderboardList.innerHTML = "";

      scores.forEach((entry, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${entry.name} — ${entry.score} pts`;
        leaderboardList.appendChild(li);
      });
    });
}

function canReplay(playerName) {
  const today = new Date().toISOString().split("T")[0];
  const replayData = JSON.parse(localStorage.getItem("replays") || "{}");

  if (!replayData[playerName]) replayData[playerName] = {};
  if (!replayData[playerName][today]) replayData[playerName][today] = 0;

  if (replayData[playerName][today] >= 3) {
    alert("You have reached the maximum of 3 replays for today!");
    return false;
  }

  replayData[playerName][today]++;
  localStorage.setItem("replays", JSON.stringify(replayData));
  return true;
}

startButton.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert("Please enter a username!");
    return;
  }


  playerName = name;

  startScreen.style.display = "none";
  gameContainer.style.display = "block";
  endScreen.style.display = "none";

  score = 0;
  gameOver = false;
  fallSpeed = 3;
  logosPerSpawn = 1;
  elapsedTime = 0;
  scoreDisplay.textContent = "Score : 0";

  const oldLogos = document.querySelectorAll(".logo");
  oldLogos.forEach(logo => logo.remove());

  spawnInterval = setInterval(spawnLogos, spawnDelay);

  difficultyInterval = setInterval(() => {
    if (fallSpeed < 10) fallSpeed += 0.2;
    elapsedTime += 10;

    if (elapsedTime >= 60 && logosPerSpawn < 2) logosPerSpawn = 2;
    if (elapsedTime >= 120 && logosPerSpawn < 3) logosPerSpawn = 3;
  }, 10000);
});

replayButton.addEventListener("click", () => {
  if (!canReplay(playerName)) return;

  endScreen.style.display = "none";
  startScreen.style.display = "flex";

  score = 0;
  gameOver = false;
  fallSpeed = 3;
  logosPerSpawn = 1;
  elapsedTime = 0;
  scoreDisplay.textContent = "Score : 0";

  const oldLogos = document.querySelectorAll(".logo");
  oldLogos.forEach(logo => logo.remove());

  if (leaderboardListener) {
    database.ref("leaderboard").off("value", leaderboardListener);
    leaderboardListener = null;
  }
});
