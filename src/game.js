import { Player, Letter } from './entities.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const inputText = document.getElementById('inputText');

const CELL_SIZE = 20;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);

let grid = []; // 2D array: grid[y][x] = Entity | null
let player = null;
let letters = [];
let gameRunning = false;

// Initialize grid
function createGrid() {
    grid = [];
    for (let y = 0; y < ROWS; y++) {
        let row = [];
        for (let x = 0; x < COLS; x++) {
            row.push(null);
        }
        grid.push(row);
    }
}

function initGame(text) {
    createGrid();
    letters = [];
    player = null;

    // Filter text for English letters only (A-Z, a-z)
    const cleanText = text.replace(/[^a-zA-Z]/g, '');

    if (cleanText.length === 0) {
        alert("Please enter valid English text.");
        return;
    }

    // Spawn Player
    const px = Math.floor(COLS / 2);
    const py = Math.floor(ROWS / 2);
    player = new Player(px, py);
    grid[py][px] = player;

    // Spawn Letters
    // Simple random placement for now, ensuring no overlap
    for (let char of cleanText) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const lx = Math.floor(Math.random() * COLS);
            const ly = Math.floor(Math.random() * ROWS);
            if (grid[ly][lx] === null) {
                const letter = new Letter(lx, ly, char); // Behavior default for now
                letters.push(letter);
                grid[ly][lx] = letter;
                placed = true;
            }
            attempts++;
        }
    }

    gameRunning = true;
    updateStatus("Playing");
    scoreEl.textContent = "0";
    draw();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateStatus(msg) {
    statusEl.textContent = msg;
}

function getClusterSize(x, y, char) {
    const visited = new Set();
    const queue = [[x, y]];
    visited.add(`${x},${y}`);
    let size = 0;

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        size++;

        // Check neighbors
        const neighbors = [
            [cx, cy - 1], // Up
            [cx, cy + 1], // Down
            [cx - 1, cy], // Left
            [cx + 1, cy]  // Right
        ];

        for (const [nx, ny] of neighbors) {
            // Check bounds
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    const entity = grid[ny][nx];
                    // Check if it's a letter and has the same char
                    if (entity instanceof Letter && entity.char === char) {
                        visited.add(key);
                        queue.push([nx, ny]);
                    }
                }
            }
        }
    }
    return size;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (Optional, maybe faint)
    ctx.strokeStyle = '#222';
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // Draw Entities
    ctx.font = `${CELL_SIZE - 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw Letters
    for (const letter of letters) {
        const cx = letter.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = letter.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.fillStyle = letter.color;
        ctx.fillText(letter.char, cx, cy);
    }

    // Draw Player
    if (player) {
        const cx = player.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = player.y * CELL_SIZE + CELL_SIZE / 2;
        ctx.fillStyle = player.color;
        ctx.fillText(player.symbol, cx, cy);
    }
}

startBtn.addEventListener('click', () => {
    initGame(inputText.value);
});

window.addEventListener('keydown', (e) => {
    if (!gameRunning || !player) return;

    let dx = 0;
    let dy = 0;

    if (e.key === 'ArrowUp') dy = -1;
    else if (e.key === 'ArrowDown') dy = 1;
    else if (e.key === 'ArrowLeft') dx = -1;
    else if (e.key === 'ArrowRight') dx = 1;

    if (dx !== 0 || dy !== 0) {
        e.preventDefault(); // Prevent scrolling
        movePlayer(dx, dy);
    }
});

function moveLetters() {
    if (!gameRunning) return;

    for (const letter of letters) {
        // Simple AI Tick: chance to move to avoid chaos
        if (Math.random() < 0.3) continue; // 30% chance to stay still

        let dx = 0;
        let dy = 0;

        if (letter.behaviorType === 'wander') {
            const moves = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            const move = moves[Math.floor(Math.random() * moves.length)];
            dx = move[0];
            dy = move[1];
        } else if (letter.behaviorType === 'flee') {
            // Move away from player
            const distX = player.x - letter.x;
            const distY = player.y - letter.y;

            // If close enough
            if (Math.abs(distX) < 5 && Math.abs(distY) < 5) {
                if (Math.abs(distX) > Math.abs(distY)) {
                    dx = distX > 0 ? -1 : 1;
                } else {
                    dy = distY > 0 ? -1 : 1;
                }
            }
        } else if (letter.behaviorType === 'group') {
             // Move towards center of similar neighbors (simplified: move to a random neighbor of same type)
             // Find nearest neighbor of same type
             let bestDist = 999;
             let target = null;

             for (const other of letters) {
                 if (other !== letter && other.char === letter.char) {
                     const d = Math.abs(other.x - letter.x) + Math.abs(other.y - letter.y);
                     if (d < bestDist && d < 10) { // Look within range
                         bestDist = d;
                         target = other;
                     }
                 }
             }

             if (target) {
                 const tx = target.x - letter.x;
                 const ty = target.y - letter.y;
                 if (Math.abs(tx) > Math.abs(ty)) {
                     dx = tx > 0 ? 1 : -1;
                 } else {
                     dy = ty > 0 ? 1 : -1;
                 }
             }
        }

        // Apply movement if valid
        if (dx !== 0 || dy !== 0) {
             const nx = letter.x + dx;
             const ny = letter.y + dy;

             // Check Bounds
             if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                 // Check Collision
                 const targetCell = grid[ny][nx];

                 if (targetCell === null) {
                     // Move to empty spot
                     grid[letter.y][letter.x] = null;
                     letter.x = nx;
                     letter.y = ny;
                     grid[ny][nx] = letter;
                 } else if (targetCell === player) {
                     // Attack Player
                     const clusterSize = getClusterSize(letter.x, letter.y, letter.char);
                     if (player.score >= clusterSize) {
                         // Player defends/eats (though usually happens on player turn)
                         // For simplicity, let's say letter dies if it attacks a stronger player
                         const index = letters.indexOf(letter);
                         if (index > -1) {
                            letters.splice(index, 1);
                         }
                         grid[letter.y][letter.x] = null; // Clear old spot (letter is gone)
                         player.score++;
                         scoreEl.textContent = player.score;
                         updateStatus(`Defended against '${letter.char}'!`);
                     } else {
                         // Player dies
                         gameRunning = false;
                         updateStatus(`GAME OVER! Attacked by '${letter.char}' (Cluster: ${clusterSize}).`);
                     }
                 }
             }
        }
    }
    draw();
}

function movePlayer(dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    // Check bounds
    if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) return;

    // Check collision
    const target = grid[newY][newX];

    if (target === null) {
        // Move freely
        grid[player.y][player.x] = null;
        player.x = newX;
        player.y = newY;
        grid[newY][newX] = player;
        draw();
    } else if (target instanceof Letter) {
        // Combat logic
        const clusterSize = getClusterSize(newX, newY, target.char);

        console.log(`Combat: Player Score (${player.score}) vs Cluster Size (${clusterSize})`);

        if (player.score >= clusterSize) {
            // Eat
            // Remove letter from list
            const index = letters.indexOf(target);
            if (index > -1) {
                letters.splice(index, 1);
            }

            // Move player into spot
            grid[player.y][player.x] = null;
            player.x = newX;
            player.y = newY;
            grid[newY][newX] = player;

            // Increment score
            player.score++;
            scoreEl.textContent = player.score;
            updateStatus(`Ate '${target.char}' (Cluster: ${clusterSize})`);

            // Check win (if no letters left)
            if (letters.length === 0) {
                gameRunning = false;
                updateStatus("YOU WIN! All letters eaten.");
            }
            draw();
        } else {
            // Die
            gameRunning = false;
            updateStatus(`GAME OVER! '${target.char}' cluster (Size: ${clusterSize}) was too strong.`);
        }
    }
}

let lastTime = 0;
const LETTER_MOVE_INTERVAL = 500; // ms
let letterTimer = 0;

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    letterTimer += deltaTime;
    if (letterTimer >= LETTER_MOVE_INTERVAL) {
        moveLetters();
        letterTimer = 0;
    }

    requestAnimationFrame(gameLoop);
}

// Initial draw (empty)
draw();
