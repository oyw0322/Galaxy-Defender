// 🎮 우주 슈팅 게임 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ▶ 전투기 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; // 플레이어 전투기 이미지

// ▶ 외계인 적 이미지 로드  
const alienImage = new Image();
alienImage.src = "images/ufo.png"; // 외계인 적 이미지 경로 

// ▶ 플레이어 설정 
const player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 5,
};

// ▶ 상태 변수
let bullets = [];
let enemies = [];
// let enemyBullets = []; // 적 총알
let items = [];
let effects = [];
let score = 0;
let gameOver = false;
let keys = {};

// ▶ 별 배경 (움직이는 우주 느낌)
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1 + 0.5
}));

// ▶ 키 입력 처리
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// ▶ 플레이어 총알 발사
function shoot() {
  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 7
  });
}

// ▶ 적 생성
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 40); // 너비 고려
  enemies.push({ x: x, y: 0, width: 40, height: 40, speed: 2 });
}


// ▶ 적 총알 발사



// ▶ 충돌 판정
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}


// ▶ 폭발 이펙트 생성




// ▶ 아이템 생성



// ▶ 별 배경 업데이트
function updateStars() {
  for (let s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}


// ▶ 이펙트 업데이트




// ▶ 아이템 업데이트



// ▶ 배경 별 그리기
function drawStars() {
  ctx.fillStyle = "#6f879eff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}


// ▶ 이펙트 그리기




// ⭐ 별 모양 아이템 그리기 함수


// ⭐ 아이템 그리기



// ▶ 메인 게임 루프
function update() {
  if (gameOver) return;

  updateStars();

  // 플레이어 이동
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys[" "]) shoot();

  // 총알 이동
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  // 적 이동 및 충돌 처리
  enemies.forEach(e => {
    e.y += e.speed;
    if (isColliding(e, player)) {
      gameOver = true;
      alert("Game Over! (적과 충돌)\nScore: " + score);
    }
  });

  enemies = enemies.filter(e => {
    for (let b of bullets) {
      if (isColliding(e, b)) {
        score++;
        bullets = bullets.filter(bullet => bullet !== b);
        
        return false;
      }
    }
    return e.y < canvas.height;
  });


  // 적 총알 이동 및 충돌
  


  // ▶ 그리기
  drawStars();       // 배경


  // ▶ 적  
  enemies.forEach(e => {
    ctx.drawImage(alienImage, e.x, e.y, e.width, e.height);
  });

  // ▶ 플레이어 총알
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });


  // ▶ 적 총알
  


  // ▶ 플레이어
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

  // ▶ 점수 표시
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 10, 20);

  requestAnimationFrame(update);
}

// ▶ 적 생성 및 총알 발사 주기 설정
setInterval(spawnEnemy, 1000);


// ▶ 게임 시작
update();