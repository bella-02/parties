const giftInput = document.getElementById("gift-text");
const addGiftButton = document.getElementById("add-gift");
const giftList = document.getElementById("gift-list");

// Load saved gifts on page load
window.addEventListener("load", () => {
    const savedGifts = JSON.parse(localStorage.getItem("birthdayGifts")) || [];
    savedGifts.forEach(gift => addGiftToDOM(gift));
});

// Add gift when button is clicked
addGiftButton.addEventListener("click", () => {
    const gift = giftInput.value.trim();
    if (gift === "") return;

    addGiftToDOM(gift);
    saveGift(gift);

    giftInput.value = "";
});

// Add gift to the page
function addGiftToDOM(gift) {
    const li = document.createElement("li");
    li.textContent = gift;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("remove-btn");

    removeBtn.addEventListener("click", () => {
        li.remove();
        removeGift(gift);
    });

    li.appendChild(removeBtn);
    giftList.appendChild(li);
}

// Save gift to localStorage
function saveGift(gift) {
    const gifts = JSON.parse(localStorage.getItem("birthdayGifts")) || [];
    gifts.push(gift);
    localStorage.setItem("birthdayGifts", JSON.stringify(gifts));
}

// Remove gift from localStorage
function removeGift(gift) {
    let gifts = JSON.parse(localStorage.getItem("birthdayGifts")) || [];
    gifts = gifts.filter(item => item !== gift);
    localStorage.setItem("birthdayGifts", JSON.stringify(gifts));
}


const checkInput = document.getElementById("check-text");
const addCheckButton = document.getElementById("add-check");
const checkList = document.getElementById("check-list");

// Load saved tasks
window.addEventListener("load", () => {
    const savedChecks = JSON.parse(localStorage.getItem("birthdayChecklist")) || [];
    savedChecks.forEach(task => addCheckToDOM(task));
});

// Add task
addCheckButton.addEventListener("click", () => {
    const task = checkInput.value.trim();
    if (task === "") return;

    addCheckToDOM(task);
    saveCheck(task);

    checkInput.value = "";
});

// Add task to DOM
function addCheckToDOM(task) {
    const li = document.createElement("li");
    li.textContent = task;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("remove-btn");

    removeBtn.addEventListener("click", () => {
        li.remove();
        removeCheck(task);
    });

    li.appendChild(removeBtn);
    checkList.appendChild(li);
}

// Save task
function saveCheck(task) {
    const tasks = JSON.parse(localStorage.getItem("birthdayChecklist")) || [];
    tasks.push(task);
    localStorage.setItem("birthdayChecklist", JSON.stringify(tasks));
}

// Remove task
function removeCheck(task) {
    let tasks = JSON.parse(localStorage.getItem("birthdayChecklist")) || [];
    tasks = tasks.filter(item => item !== task);
    localStorage.setItem("birthdayChecklist", JSON.stringify(tasks));
}
