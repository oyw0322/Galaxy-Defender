const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// ⭐ 추가된 요소 참조
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreElement = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");

// ▶ 전투기 이미지 로드 (주의: 실제 환경에서 작동하려면 'images/fighter.png'와 'images/ufo.png' 파일이 존재해야 합니다)
const playerImage = new Image();
playerImage.src = "images/fighter.png"; 
const alienImage = new Image();
alienImage.src = "images/ufo.png"; 

// ⭐ 상수 설정
const PLAYER_BULLET_DAMAGE = 10; 
const NORMAL_ENEMY_BASE_HP = 10; 
const TANKER_ENEMY_BASE_HP = 30; 
const SPEEDSTER_ENEMY_BASE_HP = 5; 

// ⭐ 상수 설정 (보스 관련 수정)
const BOSS_HP = 1000; 
const BOSS_BULLET_DAMAGE = 30; 
const BOSS_LASER_DAMAGE = 50; 
const BOSS_HIT_SCORE = 1; 
const BOSS_SPAWN_SCORE = 100; 

// ⭐ 난이도 설정 테이블 
const difficultyStages = [
    { scoreThreshold: 0, spawnInterval: 1000, enemySpeedMultiplier: 1.0, enemyBulletSpeed: 4, enemyShootInterval: 1200, hpMultiplier: 1.0 }, 
    { scoreThreshold: 50, spawnInterval: 800, enemySpeedMultiplier: 1.2, enemyBulletSpeed: 5, enemyShootInterval: 1000, hpMultiplier: 1.2 }, 
    { scoreThreshold: 150, spawnInterval: 600, enemySpeedMultiplier: 1.5, enemyBulletSpeed: 6, enemyShootInterval: 800, hpMultiplier: 1.5 }, 
    { scoreThreshold: 300, spawnInterval: 500, enemySpeedMultiplier: 1.8, enemyBulletSpeed: 7, enemyShootInterval: 600, hpMultiplier: 2.0 }, 
    { scoreThreshold: 500, spawnInterval: 400, enemySpeedMultiplier: 2.0, enemyBulletSpeed: 8, enemyShootInterval: 500, hpMultiplier: 2.5 }, 
];

// ▶ 플레이어 설정 
const player = {
    x: 180,
    y: 550,
    width: 40,
    height: 40,
    speed: 5,
};

// ⭐ 플레이어 체력 설정 (초기값은 resetGame에서 설정)
let playerHp; 
const maxHp = 100;

// ⭐ 스테이지 및 타이머 상태 변수
let currentStageIndex;
let enemySpawnTimer;
let enemyShootTimer;
let hpItemSpawnTimer; 
let difficultyTimer; 

// ⭐ 상태 변수 (보스 관련 포함)
let boss; 
let isLaserCharging; 
let laserBeam; 

// ▶ 상태 변수 (초기값은 resetGame에서 설정)
let bullets;
let enemies;
let enemyBullets;    
let items;      
let effects;  
let score;
let gameOver;
let keys;
let spaceKeyPressed; 

// ▶ 별 배경 (기존)
const stars = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 1 + 0.5
}));

// ⭐ 함수: 게임 초기 상태로 되돌리기 (재시작 로직)
function resetGame() {
    // 1. 상태 변수 초기화
    player.x = 180;
    player.y = 550;
    playerHp = maxHp;
    bullets = [];
    enemies = [];
    enemyBullets = [];    
    items = [];      
    effects = [];  
    score = 0;
    gameOver = false;
    currentStageIndex = 0;
    boss = null;
    isLaserCharging = false;
    laserBeam = null;
    keys = {};
    spaceKeyPressed = false; 

    // 2. 타이머 재설정
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    if (enemyShootTimer) clearInterval(enemyShootTimer);
    if (hpItemSpawnTimer) clearInterval(hpItemSpawnTimer);
    if (difficultyTimer) clearInterval(difficultyTimer);
    
    setGameIntervals();
    hpItemSpawnTimer = setInterval(spawnHpItem, 5000); 

    // 3. UI 숨기기
    gameOverScreen.style.display = "none";
}

// ⭐ 함수: 재시작 버튼 이벤트 리스너 
restartButton.addEventListener("click", () => {
    resetGame();
});

// ▶ 키 입력 처리 
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === " " && !spaceKeyPressed && !gameOver) { 
        shoot();
        spaceKeyPressed = true;
    }
});
document.addEventListener("keyup", e => {
    keys[e.key] = false;
    if (e.key === " ") {
        spaceKeyPressed = false; 
    }
});

// ▶ 플레이어 총알 발사 (데미지 속성 추가)
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7,
        damage: PLAYER_BULLET_DAMAGE 
    });
}

// ⭐ 보스 객체 정의 
function createBoss() {
    const bossHp = BOSS_HP;
    return {
        x: canvas.width / 2 - 60,
        y: -100,
        width: 120,
        height: 120,
        speed: 1,
        hp: bossHp, 
        maxHp: bossHp, 
        type: 'boss',
        phase: 'entrance',
        attackCooldown: 90, 
        attackTimer: 0,
        moveDirection: 1,
        moveTime: 0,
    };
}

// ⭐ 보스 총알 발사 (유도탄)
function bossShoot(x, y, targetX, targetY, speed, damage = BOSS_BULLET_DAMAGE) {
    const angle = Math.atan2(targetY - y, targetX - x);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;

    enemyBullets.push({
        x: x,
        y: y,
        width: 8,
        height: 8,
        speed: speed,
        dx: dx,
        dy: dy,
        damage: damage, 
        isBossBullet: true, 
    });
}

// ⭐ 레이저 충전 및 발사 (2초 지연 적용 로직)
function startBossLaser() {
    isLaserCharging = true;
    
    setTimeout(() => {
        if (!boss || gameOver) {
            isLaserCharging = false;
            return;
        }

        laserBeam = {
            x: boss.x + boss.width / 2 - 5, 
            y: boss.y + boss.height,
            width: 10,
            height: canvas.height - (boss.y + boss.height),
            life: 30, 
            damage: BOSS_LASER_DAMAGE,
            sourceBoss: boss 
        };

        isLaserCharging = false;
        boss.attackTimer = 0; 
    }, 2000);
}

// ⭐ 적 생성 (다양한 적 유형 및 HP 동적 적용)
function spawnEnemy() {
    if (boss !== null) return; 
    
    const stage = difficultyStages[currentStageIndex];
    const x = Math.random() * (canvas.width - 40); 
    
    const enemyTypeRoll = Math.random();
    let type, baseHp, speedMultiplier, color;

    if (enemyTypeRoll < 0.6) {
        type = 'normal';
        baseHp = NORMAL_ENEMY_BASE_HP;
        speedMultiplier = 1.0;
        color = 'white';
    } else if (enemyTypeRoll < 0.85) {
        type = 'tanker';
        baseHp = TANKER_ENEMY_BASE_HP;
        speedMultiplier = 0.6;
        color = 'gray';
    } else {
        type = 'speedster';
        baseHp = SPEEDSTER_ENEMY_BASE_HP;
        speedMultiplier = 2.0;
        color = 'red';
    }

    const finalHp = Math.round(baseHp * stage.hpMultiplier);

    enemies.push({ 
        x: x, 
        y: 0, 
        width: 40, 
        height: 40, 
        speed: 2 * stage.enemySpeedMultiplier * speedMultiplier,
        hp: finalHp, 
        maxHp: finalHp, 
        type: type, 
        color: color 
    });
}

// ⭐ 적 총알 발사
function enemyShoot() {
    if (enemies.length === 0 || boss !== null) return;
    
    const stage = difficultyStages[currentStageIndex];
    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    
    let finalBulletSpeed = stage.enemyBulletSpeed;

    if (shooter.type === 'speedster') {
        finalBulletSpeed = stage.enemyBulletSpeed * 1.5; 
    }

    enemyBullets.push({
        x: shooter.x + shooter.width / 2 - 2,
        y: shooter.y + shooter.height,
        width: 4,
        height: 10,
        speed: finalBulletSpeed,
        damage: 20 
    });
}


// ▶ 충돌 판정 
function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}


// ⭐ 함수: 플레이어 데미지 처리 (GAME OVER 로직 수정)
function takeDamage(damage) {
    if (gameOver) return;
    
    playerHp -= damage;
    
    if (playerHp < 0) {
        playerHp = 0;
    }

    if (playerHp <= 0) {
        gameOver = true;
        
        // 1. 모든 게임 타이머 중지
        if (enemySpawnTimer) clearInterval(enemySpawnTimer);
        if (enemyShootTimer) clearInterval(enemyShootTimer);
        if (hpItemSpawnTimer) clearInterval(hpItemSpawnTimer);
        if (difficultyTimer) clearInterval(difficultyTimer);
        
        // 2. 게임 오버 화면 표시
        finalScoreElement.textContent = `최종 점수: ${score}`;
        gameOverScreen.style.display = "block";
    }
}

// ⭐ 함수: 플레이어 HP 회복
function healPlayer(amount) {
    playerHp += amount;
    if (playerHp > maxHp) {
        playerHp = maxHp;
    }
}

// ▶ 폭발 이펙트 생성 
function spawnEffect(x, y, color = `hsl(${Math.random() * 360}, 100%, 60%)`) {
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        effects.push({
            x,
            y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3,
            life: 30,
            color: color
        });
    }
}

// ⭐ 아이템 생성 
function spawnItem(x, y, type) {    
    items.push({
        x,
        y,
        width: 12,
        height: 12,
        speed: 2,
        type: type 
    });
}

// ⭐ HP 아이템 주기적 스폰 함수 
function spawnHpItem() {
    if (boss !== null || gameOver) return; 
    const x = Math.random() * (canvas.width - 12);
    spawnItem(x, 0, 'hp');    
}

// ⭐ 보스 파괴 후 다음 스테이지로 전환 (GAME CLEAR 로직 수정)
function bossDestroyed() {
    score += BOSS_HIT_SCORE; 
    
    // 이펙트 발생 
    for (let i = 0; i < 50; i++) {
        spawnEffect(boss.x + boss.width / 2, boss.y + boss.height / 2, 'yellow');
    }
    
    boss = null; 
    currentStageIndex++; 

    // 최종 스테이지 클리어 처리 수정
    if (currentStageIndex < difficultyStages.length) {
        setGameIntervals();
        console.log(`🎉 보스 파괴! Stage ${currentStageIndex + 1}로 진입합니다.`);
    } else {
        // 최종 스테이지 클리어
        gameOver = true;
        
        // 1. 모든 게임 타이머 중지
        if (enemySpawnTimer) clearInterval(enemySpawnTimer);
        if (enemyShootTimer) clearInterval(enemyShootTimer);
        if (hpItemSpawnTimer) clearInterval(hpItemSpawnTimer);
        if (difficultyTimer) clearInterval(difficultyTimer);

        // 2. 게임 클리어 화면 표시
        finalScoreElement.textContent = `게임 클리어! 최종 점수: ${score}`;
        gameOverScreen.style.display = "block";
    }
}

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
function updateEffects() {
    effects.forEach(e => {
        e.x += e.dx;
        e.y += e.dy;
        e.life--;
    });
    effects = effects.filter(e => e.life > 0);
}

// ⭐ 아이템 업데이트 
function updateItems() {
    items.forEach(item => {
        item.y += item.speed;
        
        if (isColliding(item, player)) {
            if (item.type === 'score') {
                score += 10;    
            } else if (item.type === 'hp') {
                healPlayer(30);    
            }
            item.collected = true;
        }
    });
    items = items.filter(i => i.y < canvas.height && !i.collected);
}

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
function drawEffects() {
    for (let e of effects) {
        const alpha = e.life / 30;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ⭐ 별 모양 아이템 그리기 함수 
function drawStarShape(x, y, radius, points, inset) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.moveTo(0, 0 - radius);
    for (let i = 0; i < points; i++) {
        ctx.rotate(Math.PI / points);
        ctx.lineTo(0, 0 - (radius * inset));
        ctx.rotate(Math.PI / points);
        ctx.lineTo(0, 0 - radius);
    }
    ctx.closePath();
    ctx.restore();
}

// ⭐ 아이템 그리기 
function drawItems() {
    for (let item of items) {
        if (item.type === 'score') {
            ctx.fillStyle = "orange";    
        } else if (item.type === 'hp') {
            ctx.fillStyle = "red";    
        }
        
        ctx.beginPath();
        drawStarShape(item.x + item.width / 2, item.y + item.height / 2, 6, 5, 0.5);
        ctx.fill();
    }
}

// ⭐ 체력 바 그리기 
function drawHpBar() {
    const barWidth = 100;
    const barHeight = 10;
    const x = canvas.width - barWidth - 10;
    const y = 10;

    ctx.fillStyle = "gray";
    ctx.fillRect(x, y, barWidth, barHeight);

    const currentHpWidth = (playerHp / maxHp) * barWidth;
    ctx.fillStyle = playerHp > 20 ? "lime" : "red";    
    ctx.fillRect(x, y, currentHpWidth, barHeight);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText(`HP: ${playerHp}`, x - 35, y + barHeight - 1);
}

// ⭐ 난이도/스테이지 표시 
function drawStageInfo() {
    ctx.fillStyle = "yellow";
    ctx.font = "bold 20px Arial";
    if (boss) {
        ctx.fillText(`BOSS HP: ${boss.hp}`, canvas.width / 2 - 60, 30);
    } else {
        ctx.fillText(`STAGE ${currentStageIndex + 1}`, canvas.width / 2 - 40, 30);
    }
}

// ⭐ 적 체력 바 그리기 
function drawEnemyHpBar(enemy) {
    const barWidth = enemy.width;
    const barHeight = 4;
    const x = enemy.x;
    const y = enemy.y - barHeight - 2;

    ctx.fillStyle = "black";
    ctx.fillRect(x, y, barWidth, barHeight);

    const currentHpWidth = (enemy.hp / enemy.maxHp) * barWidth;
    ctx.fillStyle = "orange";
    ctx.fillRect(x, y, currentHpWidth, barHeight);
}

// ⭐ 보스 그리기 
function drawBoss() {
    if (!boss) return;

    // 보스 이미지
    ctx.drawImage(alienImage, boss.x, boss.y, boss.width, boss.height);
    
    // 1. 보스 HP 바 그리기
    const barWidth = canvas.width * 0.8;
    const barHeight = 15;
    const x = canvas.width * 0.1;
    const y = 50;

    ctx.fillStyle = "red";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4); 
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, barWidth, barHeight);

    const currentHpWidth = (boss.hp / boss.maxHp) * barWidth;
    ctx.fillStyle = "yellow";
    ctx.fillRect(x, y, currentHpWidth, barHeight);
    
    // 2. 레이저 충전 상태 시 경고/표시
    if (isLaserCharging) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        const warningX = boss.x + boss.width / 2;
        
        ctx.fillRect(warningX - 5, boss.y + boss.height, 10, canvas.height - (boss.y + boss.height));
        
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.fillText("WARNING!", canvas.width / 2 - 50, canvas.height / 2);
    }
}

// ⭐ 레이저 빔 그리기
function drawLaserBeam() {
    if (!laserBeam) return;

    const alpha = laserBeam.life / 30; 
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "red";
    ctx.fillRect(laserBeam.x, laserBeam.y, laserBeam.width, laserBeam.height);
    ctx.globalAlpha = 1;
}

// ⭐ 타이머를 현재 스테이지 설정에 맞게 재설정
function setGameIntervals() {
    const stage = difficultyStages[currentStageIndex];
    
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    if (enemyShootTimer) clearInterval(enemyShootTimer);
    if (difficultyTimer) clearInterval(difficultyTimer);
    
    if (boss === null && currentStageIndex < difficultyStages.length) {
        enemySpawnTimer = setInterval(spawnEnemy, stage.spawnInterval);
        enemyShootTimer = setInterval(enemyShoot, stage.enemyShootInterval);

        if (currentStageIndex < difficultyStages.length - 1) {
            difficultyTimer = setInterval(() => {
                currentStageIndex++;
                setGameIntervals();
                console.log(`[시간 기반] Stage ${currentStageIndex + 1}로 난이도 상승!`);
            }, 50000); 
        }
    }
}

// ⭐ 점수 기반 난이도 상승 체크
function checkDifficulty() {
    // 1. 보스 스폰 로직을 가장 먼저 체크
    if (score >= BOSS_SPAWN_SCORE && boss === null) {
        boss = createBoss();
        setGameIntervals(); // 일반 적 생성 타이머 중지
        console.log("🔥 보스 등장!");
        return; 
    }

    // 2. 스테이지 난이도 상승 체크 (보스전 중에는 스킵)
    if (boss === null) {
        const nextStageIndex = currentStageIndex + 1;
        
        if (nextStageIndex < difficultyStages.length) {
            if (difficultyStages[nextStageIndex].scoreThreshold < BOSS_SPAWN_SCORE) {
                if (score >= difficultyStages[nextStageIndex].scoreThreshold) {
                    currentStageIndex = nextStageIndex;
                    setGameIntervals(); 
                    console.log(`[점수 기반] Stage ${currentStageIndex + 1}로 난이도 상승!`);
                }
            }
        }
    }
}

// ▶ 메인 게임 루프
function update() {
    if (!gameOver) {
        
        checkDifficulty(); 
        updateStars();
        updateEffects();
        updateItems();      

        // 플레이어 이동 
        if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
        if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed;

        // 총알 이동 
        bullets.forEach(b => b.y -= b.speed);
        bullets = bullets.filter(b => b.y > 0);

        // ⭐ 보스 업데이트 및 공격 패턴
        if (boss) {
            if (boss.phase === 'entrance') {
                boss.y += boss.speed;
                if (boss.y >= 50) { 
                    boss.phase = 'fighting';
                }
            } 
            else if (boss.phase === 'fighting') {
                // 보스 움직임 로직
                boss.x += boss.speed * boss.moveDirection;
                boss.moveTime++;
                if (boss.x <= 0 || boss.x + boss.width >= canvas.width || boss.moveTime > 120) {
                    boss.moveDirection *= -1; 
                    boss.moveTime = 0;
                    boss.x = Math.min(Math.max(boss.x, 0), canvas.width - boss.width); 
                }
                
                // 보스 공격 타이머
                boss.attackTimer++;
                if (boss.attackTimer >= boss.attackCooldown && !isLaserCharging) {
                    const attackType = Math.random();
                    
                    if (attackType < 0.7) {
                        // 일반 총알 패턴 (3발 연사)
                        for (let i = 0; i < 3; i++) {
                            setTimeout(() => {
                                bossShoot(boss.x + boss.width / 2, boss.y + boss.height, player.x + player.width / 2, player.y + player.height / 2, 6);
                            }, i * 200); 
                        }
                        boss.attackTimer = 0; 
                    } else {
                        // 위험한 패턴: 레이저 충전 및 발사 (2초 지연)
                        startBossLaser();
                    }
                }

                // 플레이어 총알-보스 충돌 (HP 감소)
                bullets.forEach(b => {
                    if (isColliding(boss, b) && !b.hit) {
                        boss.hp -= b.damage;
                        b.hit = true; 
                        spawnEffect(b.x, b.y); 
                    }
                });

                // 보스 파괴 체크
                if (boss.hp <= 0) {
                    bossDestroyed();
                    return;
                }
            }
        }

        // ⭐ 레이저 빔 업데이트
        if (laserBeam) {
            if (laserBeam.sourceBoss) {
                laserBeam.x = laserBeam.sourceBoss.x + laserBeam.sourceBoss.width / 2 - 5;
            }

            laserBeam.life--;
            if (laserBeam.life > 0) {
                if (isColliding(laserBeam, player)) {
                    takeDamage(laserBeam.damage);
                    laserBeam.damage = 0; 
                }
            } else {
                laserBeam = null;
            }
        }

        // 적 이동 및 충돌 처리 (일반 적)
        enemies.forEach(e => {
            e.y += e.speed;    
            
            if (isColliding(e, player)) {
                takeDamage(10); 
                e.hp = 0; 
            }
            
            bullets.forEach(b => {
                if (isColliding(e, b) && !b.hit) {
                    e.hp -= b.damage; 
                    b.hit = true; 
                    spawnEffect(b.x, b.y);
                }
            });
            
            if (e.hp <= 0) {
                e.destroyed = true;
                score++;
                if (Math.random() < 0.3) {    
                    spawnItem(e.x + e.width / 2 - 6, e.y, 'score');    
                }
            }
        });

        // 충돌 처리 후 필터링 
        bullets = bullets.filter(b => b.y > 0 && !b.hit);
        enemies = enemies.filter(e => {
            if (e.destroyed) {
                spawnEffect(e.x + e.width / 2, e.y + e.height / 2);    
                return false;
            }
            return e.y < canvas.height;
        });


        // 적 총알 이동 및 충돌 (보스 총알 포함)
        enemyBullets.forEach(b => {
            if (b.isBossBullet) {
                b.x += b.dx;
                b.y += b.dy;
            } else {
                b.y += b.speed;
            }
            
            if (isColliding(b, player)) {
                const damageToTake = b.isBossBullet ? b.damage : 20; 
                takeDamage(damageToTake);    
                b.hit = true;    
            }
        });
        enemyBullets = enemyBullets.filter(b => b.y < canvas.height && !b.hit);
    } // !gameOver 루프 끝


    // ▶ 그리기 (게임 오버 상태여도 계속 그려야 함)
    drawStars();          
    drawEffects();        
    drawItems();          
    drawStageInfo();    

    // ⭐ 보스 및 레이저 그리기
    drawBoss();
    drawLaserBeam();

    // ▶ 적, 총알, 플레이어 그리기 
    enemies.forEach(e => {
        if (e.type === 'tanker') {
            ctx.globalAlpha = 0.6;
        } else if (e.type === 'speedster') {
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = e.color; 
            ctx.strokeRect(e.x, e.y, e.width, e.height);
        }

        ctx.drawImage(alienImage, e.x, e.y, e.width, e.height);
        ctx.globalAlpha = 1; 

        drawEnemyHpBar(e);
    });

    bullets.forEach(b => {
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    enemyBullets.forEach(b => {
        ctx.fillStyle = b.isBossBullet ? "black" : "white";
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // 플레이어 체력이 남아 있을 때만 그림
    if (playerHp > 0) {
      ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    }

    // ▶ 점수 및 체력 표시 
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Score: " + score, 10, 20);

    drawHpBar();    

    requestAnimationFrame(update);
}


// ⭐ 게임 초기화 및 시작 (코드를 로드할 때 초기 한 번만 호출)
resetGame(); // 초기 게임 상태를 설정하고 타이머를 시작합니다.
update(); // 게임 루프를 시작합니다.