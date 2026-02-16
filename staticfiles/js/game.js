let answer="";
let attempts=0;
let maxAttempts=5;
let score=0;
let gameOver=false;

// Initialize score from user's total score if available
if(typeof userTotalScore !== 'undefined' && userTotalScore > 0){
    score = userTotalScore;
}

const STORAGE_KEY = "wordler_game_state";

const board=document.getElementById("board");
const alphabetDiv=document.getElementById("alphabet");
const scoreDiv=document.getElementById("score");
const msg=document.getElementById("message");
const meaningBox=document.getElementById("meaningBox");
const restartBtn=document.getElementById("restartBtn");
const meaningBtn=document.getElementById("meaningBtn");

function buildBoard(){
    board.innerHTML="";
    for(let r=0;r<maxAttempts;r++){
        let row=document.createElement("div");
        row.className="row";
        for(let c=0;c<5;c++){
            let tile=document.createElement("div");
            tile.className="tile";
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

function buildAlphabet(){
    alphabetDiv.innerHTML="";
    let letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for(let l of letters){
        let key=document.createElement("div");
        key.className="key";
        key.id="key-"+l;
        key.textContent=l;
        alphabetDiv.appendChild(key);
    }
}

async function fetchWord(){
    try {
        let res=await fetch("https://random-word-api.herokuapp.com/word?length=5");
        if(!res.ok) throw new Error("Failed to fetch word");
        let data=await res.json();
        if(!data || !data[0]) throw new Error("Invalid response");
        answer=data[0].toUpperCase();
        console.log(answer);
    } catch(error) {
        console.error("Error fetching word:", error);
        msg.textContent="Error loading word. Please refresh the page.";
        // Fallback to a default word if API fails
        answer="HELLO";
    }
}

function updateAlphabet(letter,status){
    let key=document.getElementById("key-"+letter);
    if(!key) return;

    if(status==="correct"){
        key.classList.remove("wrong", "present");
        key.classList.add("correct");
    }
    else if(status==="present"){
        if(!key.classList.contains("correct"))
            key.classList.add("present");
    }
    else if(status==="wrong"){
        if(!key.classList.contains("correct") && !key.classList.contains("present"))
            key.classList.add("wrong");
    }
}

function submitGuess(){
    if(gameOver) return;

    let input=document.getElementById("guessInput");
    let guess=input.value.toUpperCase().trim();

    // Validate input: only letters, exactly 5 characters
    if(!/^[A-Z]{5}$/.test(guess)){
        msg.textContent="Please enter exactly 5 letters";
        return;
    }

    if(guess.length!==5) return;

    let row=board.children[attempts].children;

    // Track which letters in answer have been matched
    let answerLetters = answer.split("");
    let matched = new Array(5).fill(false);

    // First pass: mark correct positions (green)
    for(let i=0;i<5;i++){
        row[i].textContent=guess[i];
        row[i].classList.remove("correct", "present", "wrong");
        
        if(guess[i]===answer[i]){
            row[i].classList.add("correct");
            updateAlphabet(guess[i],"correct");
            matched[i] = true;
        }
    }

    // Second pass: mark present letters (yellow) - only if not already matched
    for(let i=0;i<5;i++){
        if(guess[i]!==answer[i]){
            let found = false;
            // Check if this letter appears elsewhere in answer and hasn't been matched yet
            for(let j=0;j<5;j++){
                if(!matched[j] && answer[j]===guess[i] && guess[j]!==answer[j]){
                    row[i].classList.add("present");
                    updateAlphabet(guess[i],"present");
                    matched[j] = true;
                    found = true;
                    break;
                }
            }
            if(!found){
                row[i].classList.add("wrong");
                updateAlphabet(guess[i],"wrong");
            }
        }
    }

    attempts++;

    if(guess===answer){
        endGame(true);
    }
    else if(attempts===maxAttempts){
        endGame(false);
    }

    input.value="";
    msg.textContent="";
}

async function endGame(win){
    gameOver=true;

    let points=Math.max(0,3-(attempts-1));

    if(win){
        score+=points;
        msg.textContent="Correct! +" + points + " points";
    }else{
        msg.textContent="You lost. Word was: " + answer;
    }

    scoreDiv.textContent="Score: " + score;
    restartBtn.disabled=false;
    meaningBtn.disabled=false;
    
    saveGameState(); // persist finished game state too

    // Save score to database if user is authenticated
    if(typeof isAuthenticated !== 'undefined' && isAuthenticated){
        await saveScoreToDatabase(win, points);
    }
}

async function saveScoreToDatabase(won, points){
    try {
        const response = await fetch('/save-score/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': typeof csrftoken !== 'undefined' ? csrftoken : ''
            },
            body: JSON.stringify({
                word: answer,
                attempts: attempts,
                points: points,
                won: won
            })
        });
        
        const data = await response.json();
        if(data.success){
            console.log('Score saved:', data.message);
            if(data.total_score !== undefined){
                // Update local score to match server's total score
                score = data.total_score;
                updateScoreDisplay();
            }
        } else {
            console.error('Failed to save score:', data.error);
        }
    } catch(error) {
        console.error('Error saving score:', error);
    }
}

async function showMeaning(){
    meaningBox.textContent="Loading...";
    try{
        let res=await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+answer.toLowerCase());
        let data=await res.json();
        let def=data[0].meanings[0].definitions[0].definition;
        meaningBox.textContent=def;
    }catch{
        meaningBox.textContent="Meaning not found";
    }
}

async function restartGame(){
    attempts=0;
    gameOver=false;
    msg.textContent="";
    meaningBox.textContent="";
    restartBtn.disabled=true;
    meaningBtn.disabled=true;

    buildBoard();
    buildAlphabet();
    await fetchWord();
    clearGameState(); // starting a fresh game
}

async function init(){
    // Wait for DOM to be ready
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await setupGameFromStorageOrNew();
        });
    } else {
        await setupGameFromStorageOrNew();
    }
}

function updateScoreDisplay(){
    if(scoreDiv){
        scoreDiv.textContent="Score: " + score;
    }
}

// ---------- Persistence helpers ----------

function saveGameState(){
    try{
        const state = {
            answer,
            attempts,
            maxAttempts,
            score,
            gameOver,
            board: [],
            alphabet: {},
            message: msg ? msg.textContent : "",
        };

        // Save board letters + classes
        if(board){
            for(let r=0; r<maxAttempts; r++){
                const rowEl = board.children[r];
                if(!rowEl) continue;
                const row = [];
                for(let c=0; c<5; c++){
                    const tile = rowEl.children[c];
                    row.push({
                        letter: tile.textContent || "",
                        classes: Array.from(tile.classList)
                    });
                }
                state.board.push(row);
            }
        }

        // Save alphabet key classes
        if(alphabetDiv){
            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for(const l of letters){
                const keyEl = document.getElementById("key-"+l);
                if(keyEl){
                    state.alphabet[l] = Array.from(keyEl.classList);
                }
            }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
        console.error("Failed to save game state", e);
    }
}

function loadGameState(){
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return null;
        return JSON.parse(raw);
    }catch(e){
        console.error("Failed to load game state", e);
        return null;
    }
}

function clearGameState(){
    try{
        localStorage.removeItem(STORAGE_KEY);
    }catch(e){
        console.error("Failed to clear game state", e);
    }
}

async function setupGameFromStorageOrNew(){
    buildBoard();
    buildAlphabet();

    const state = loadGameState();

    if(state && state.answer){
        // Restore primitive state
        answer = state.answer;
        attempts = state.attempts || 0;
        maxAttempts = state.maxAttempts || maxAttempts;
        score = state.score || score;
        gameOver = !!state.gameOver;

        // Restore board
        if(Array.isArray(state.board)){
            for(let r=0; r<state.board.length && r<maxAttempts; r++){
                const rowData = state.board[r];
                const rowEl = board.children[r];
                if(!rowEl || !Array.isArray(rowData)) continue;
                for(let c=0; c<rowData.length && c<5; c++){
                    const tileData = rowData[c];
                    const tileEl = rowEl.children[c];
                    if(!tileEl || !tileData) continue;
                    tileEl.textContent = tileData.letter || "";
                    tileEl.className = "tile"; // reset then add classes
                    if(Array.isArray(tileData.classes)){
                        for(const cls of tileData.classes){
                            if(cls !== "tile"){
                                tileEl.classList.add(cls);
                            }
                        }
                    }
                }
            }
        }

        // Restore alphabet
        if(state.alphabet && typeof state.alphabet === "object"){
            for(const [letter, classes] of Object.entries(state.alphabet)){
                const keyEl = document.getElementById("key-"+letter);
                if(keyEl && Array.isArray(classes)){
                    keyEl.className = "key";
                    for(const cls of classes){
                        if(cls !== "key"){
                            keyEl.classList.add(cls);
                        }
                    }
                }
            }
        }

        // Restore message
        if(msg && state.message){
            msg.textContent = state.message;
        }

        // Restore buttons
        restartBtn.disabled = !!state.gameOver ? false : true;
        meaningBtn.disabled = !!state.gameOver ? false : true;

        updateScoreDisplay();
    }else{
        // No saved game; start a new one
        await fetchWord();
        updateScoreDisplay();
        clearGameState();
    }
}

// Add Enter key support for input field
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById("guessInput");
    if(input) {
        input.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                submitGuess();
            }
        });
        
        // Only allow letters in input
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        });
    }
});

init();