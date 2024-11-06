// ==UserScript==
// @name         AutomationBot
// @namespace    http://tampermonkey.net/
// @version      2024-03-19
// @description  Automation bot
// @author       Michael Morrison
// @match        https://coins.bank.gov.ua/*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TASK_STATUS = {
        DONE: 0,
        POLLING: 1,
        STOPPED: 2,
        ERROR: 3
    };
    var coins = [];
    var pollingTimeout = undefined;

    function keywordExists(keyword, text) {
        const lowerCaseKeyword = keyword.replace(/\s+/g, '').toLowerCase();
        const lowerCaseText = text.replace(/\s+/g, '').toLowerCase();
        return lowerCaseText.includes(lowerCaseKeyword);
    }

    function getInputValues(callback) {
        const keyword = prompt("Введіть ключове слово:");
        const quantity = prompt("Введіть кількість\(для кожної монети з вказаним ключовим словом\):");

        if (keyword !== null && quantity !== null) {
            callback(keyword, parseInt(quantity));
        }
    }
    function repaint() {
        if(document.getElementsByClassName('bot_container').length > 0){
            document.getElementsByClassName('bot_container')[0].remove();
            injectUIintoDOM(buildUI(), true);
        }
    }

    function loadCoins() {
        let coinsData = localStorage.getItem('coins');
        coins = JSON.parse(coinsData) || [];
    }

    function saveCoins(coins) {
        localStorage.setItem('coins', JSON.stringify(coins));
    }

    function addCoin(keyword, quantity, repaintCallback) {
        loadCoins();
        coins.push({ id: coins.length, keyword: keyword, countOfAdded: 0, quantity: quantity, status: TASK_STATUS.STOPPED});
        saveCoins(coins);
        repaintCallback();
    }


    function updateCoin(id, keyword, countOfAdded, quantity, status, repaintCallback) {
        let index = coins.findIndex(function(coin) {
            return coin.id === id;
        });
        if (index !== -1) {
            coins[index].keyword = keyword;
            coins[index].countOfAdded = countOfAdded;
            coins[index].quantity = quantity;
            coins[index].status = status;
            saveCoins(coins);
        }

        repaintCallback();
    }


    function deleteCoin(id, repaintCallback) {
        loadCoins();
        let index = coins.findIndex(function(coin) {
            return coin.id === id;
        });
        if (index !== -1) {
            coins.splice(index, 1);
            saveCoins(coins);
        }
        repaintCallback();
    }

    function deleteAllCoins(repaintCallback) {
        loadCoins();
        coins = [];
        saveCoins(coins);
        repaintCallback();
    }

    let scriptElement = document.createElement('script');

    scriptElement.src = 'https://kit.fontawesome.com/758df6cf97.js';
    scriptElement.crossOrigin = 'anonymous';
    document.head.appendChild(scriptElement);

    function getTrueCoinNames(keyword) {
        const coinNameElements = document.querySelectorAll('.model_product');
        const trueCoinNames = [];

        coinNameElements.forEach(coinNameElement => {
            const coinName = coinNameElement.innerText.trim();
            if (keywordExists(keyword, coinName)) {
                trueCoinNames.push(coinName);
            }
        });

        return trueCoinNames;
    }

    async function isThereSomeActiveButton() {
        const pDescriptions = document.querySelectorAll('.p_description');
        for (const coin of coins) {
            const trueCoinNames = getTrueCoinNames(coin.keyword);
            for (const trueCoinName of trueCoinNames) {
                for (const pDescription of pDescriptions) {
                    const modelName = pDescription.querySelector('.model_product').innerText.trim();
                    const addToCartButton = pDescription.querySelector('.main-basked-icon.add2cart:not(.popup_cart):not(.gray)');
                    if (modelName === trueCoinName && addToCartButton) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isItemAddedToCart(coinName){
         const cardOkElements = document.querySelectorAll('.main-basked-icon.popup_cart.added2cart .card-ok');
         const isItemAddedToCart = Array.from(cardOkElements).some(element => {
             return element.closest('.p_description').querySelector('.model_product').innerText.trim() === coinName;
         });
         return isItemAddedToCart;
    }

    function waitForItemBeingAddedToCart(coinName) {
        return new Promise((resolve, reject) => {
            const checkElement = () => {
                if (isItemAddedToCart(coinName)) {
                    resolve(true);
                }
            };

            checkElement();

            const observer = new MutationObserver(mutationsList => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        checkElement();
                    }
                }
            });

            const config = { childList: true, subtree: true };
            observer.observe(document.body, config);
        });
    }

    async function clickAddToCartButtonByModel(coinName, quantity) {
        const pDescriptions = document.querySelectorAll('.p_description');
        let addToCartButtonClicked = false;
        for (const pDescription of pDescriptions) {
            const modelName = pDescription.querySelector('.model_product').innerText.trim();
            if (modelName === coinName && !addToCartButtonClicked) {
                const addToCartButton = pDescription.querySelector('.main-basked-icon.add2cart:not(.popup_cart):not(.gray)');
                if (addToCartButton === null) return false;
                if (addToCartButton) {
                    addToCartButton.setAttribute('data-qty', quantity);
                    addToCartButton.click();
                    addToCartButtonClicked = true;
                }
            }
        }
        return true;
    }


    function createButtonWithIcon(text, iconClass, gradientStartColor, gradientEndColor, callback) {
        let button = document.createElement('button');

        let icon = document.createElement('i');
        icon.className = 'fa-solid ' + iconClass;
        button.appendChild(icon);

        button.style.color = "white";
        button.style.background = `linear-gradient(to bottom, ${gradientStartColor}, ${gradientEndColor})`;
        button.style.border = "none";
        button.style.padding = "10px 20px";
        button.style.margin = "5px";
        button.style.width = "40px";
        button.style.height = "40px";
        button.style.borderRadius = "100%";
        button.style.display = 'flex';
        button.style.justifyContent= 'center';
        button.style.alignItems= 'center';

        button.style.boxShadow = "inset 0 0 10px rgba(0, 0, 0, 0.15)";

        button.addEventListener('mouseenter', function() {
            button.style.transition = "transform 0.3s, box-shadow 0.3s";
            button.style.boxShadow = "inset 0 0 10px rgba(0, 0, 0, 0.45)";
        });

        button.addEventListener('mouseleave', function() {
            button.style.transition = "transform 0.3s, box-shadow 0.3s";
            button.style.boxShadow = "inset 0 0 10px rgba(0, 0, 0, 0.15)";
        });

        button.addEventListener('mousedown', function() {
            button.style.transition = "transform 0.3s, box-shadow 0.3s, color 0.3s";
            button.style.boxShadow = "inset 0 0 10px rgba(0, 0, 0, 0.75)";
            button.style.color = "#EEEEEE"
        });
        button.addEventListener('mouseup', function() {
            button.style.transition = "transform 0.3s, box-shadow 0.3s, color 0.3s";
            button.style.boxShadow = "inset 0 0 10px rgba(0, 0, 0, 0.15)";
            button.style.color = "#fff"
        });

        button.addEventListener('click', callback);

        return button;
    }

    function buildUI(){

        let UIElem_Container = document.createElement('div');
        UIElem_Container.classList.add("bot_container");
        let UIElem_HeaderContainer = document.createElement('div');
        let UIElem_HeaderText = document.createElement('h3');
        let UIElem_HeaderCloseModal = document.createElement('button');
        UIElem_HeaderCloseModal.style.fontSize = "25px";
        UIElem_HeaderCloseModal.style.transform = "translate\(20px, -20px)";
        UIElem_HeaderCloseModal.style.color = "#b71c1c";
        UIElem_HeaderCloseModal.style.border = "none";
        UIElem_HeaderCloseModal.style.background = "none";

        let closeModalIcon = document.createElement("i");
            closeModalIcon.className = "fa-solid fa-times";
        UIElem_HeaderCloseModal.appendChild(closeModalIcon);
        UIElem_HeaderCloseModal.addEventListener('click', function() {
            let modalContainer = document.getElementsByClassName('bot_container')[0];
            let modalShadow = document.getElementsByClassName('bot_modal_shadow')[0];
            modalContainer.remove();
            modalShadow.remove();
            localStorage.setItem('isModalOpened', false);
            stopPolling();
        });

        UIElem_HeaderText.appendChild(document.createTextNode('Панель керування'));
        UIElem_HeaderContainer.appendChild(UIElem_HeaderText);
        UIElem_HeaderContainer.appendChild(UIElem_HeaderCloseModal);

        let UIElem_List = document.createElement('div');
        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let tbody = document.createElement("tbody");

        let headerRow = document.createElement("tr");
        let headers = ["Ключове слово", "Кількість (шт.)", "Статус", "Усунути"];
        headers.forEach(function(headerText) {
            let th = document.createElement("th");
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        coins.forEach(function(coin, index) {
            let row = document.createElement("tr");
            let keywordCell = document.createElement("td");
            keywordCell.textContent = coin.keyword;
            let quantityCell = document.createElement("td");
            quantityCell.textContent = coin.quantity;
            let status = document.createElement("td");

            switch(coin.status){
                case TASK_STATUS.DONE:
                    status.textContent = 'Завершено\(' + coin.countOfAdded + '\\∞\)';
                    break;
                case TASK_STATUS.POLLING:
                    status.textContent = 'Очікуємо кнопку';
                    break;
                case TASK_STATUS.STOPPED:
                    status.textContent = 'Не розпочато';
                    break;
                case TASK_STATUS.ERROR:
                    status.textContent = 'Помилка';
                    break;
                default:
                    status.textContent = 'Невідомий статус';
            }

            let removeCell = document.createElement("td");
            let removeButton = document.createElement("button");
            let removeIcon = document.createElement("i");
            removeIcon.className = "fa-solid fa-times";
            removeButton.appendChild(removeIcon);
            removeButton.style.color='#b71c1c'
            removeButton.style.border = "none";
            removeButton.style.background = "none";
            removeButton.style.padding = "0";
            removeButton.addEventListener("click", function() {
                deleteCoin(coin.id, repaint);
            });
            removeCell.style.padding = "17px 15px 15px 26px";
            removeCell.appendChild(removeButton);
            row.appendChild(keywordCell);
            row.appendChild(quantityCell);
            row.appendChild(status);
            row.appendChild(removeCell);
            if(index % 2 === 1) {
                row.style.background = '#f5f5f5';
                //row.style.color = '#fff';
            }
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        UIElem_List.appendChild(table);

        let UIElem_BotControlGroup = document.createElement('div');
        let button_clearTasks = createButtonWithIcon("Усунути всі задачі", "fa-trash-alt", "#f39c12", "#e67e22", function () {
            deleteAllCoins(repaint);

        });
        let button_createTask = createButtonWithIcon("Створити задачу", "fa-plus-square", "#3498db", "#2980b9", function () {
            getInputValues(function(keyword, quantity) {
                stopPolling();
                addCoin(keyword, parseInt(quantity), repaint);
                if(localStorage.getItem('isPolling') === 'true'){
                     startPolling();
                }
            });
        });
        let button_startPolling = createButtonWithIcon("Запустити", "fa-play", "#2ecc71", "#27ae60", function () {
           localStorage.setItem('isPolling', true);
           startPolling();
        });
        let button_stopPolling = createButtonWithIcon("Зупинити", "fa-stop", "#e74c3c", "#c0392b", function () {
           localStorage.setItem('isPolling', false);
           stopPolling();
        });

        UIElem_BotControlGroup.appendChild(button_createTask);
        UIElem_BotControlGroup.appendChild(button_clearTasks);
        UIElem_BotControlGroup.appendChild(button_startPolling);
        UIElem_BotControlGroup.appendChild(button_stopPolling);

        UIElem_Container.appendChild(UIElem_HeaderContainer);
        UIElem_Container.appendChild(UIElem_List);
        UIElem_Container.appendChild(UIElem_BotControlGroup);

        //Apply Styles
        UIElem_Container.style.position='fixed';
        UIElem_Container.style.top ='35%';
        UIElem_Container.style.left ='50%';
        UIElem_Container.style.transform ='translate(-50%, -50%)';
        UIElem_Container.style.width = '640px';
        UIElem_Container.style.height = '480px';
        UIElem_Container.style.backgroundColor = '#fff';
        UIElem_Container.style.border = '1px solid #E2E2E2';
        UIElem_Container.style.padding = '10px 20px 10px 20px';
        //UIElem_Container.style.boxShadow = '';
        UIElem_Container.style.zIndex = '999999';

        UIElem_HeaderContainer.style.display = 'flex';
        UIElem_HeaderContainer.style.justifyContent = 'space-between';
        UIElem_HeaderContainer.style.backgroundColor = '#fff';
        UIElem_HeaderContainer.style.borderBottom = '1px solid #E2E2E2';

        UIElem_List.style.width = '100%';
        UIElem_List.style.height = '350px';
        UIElem_List.style.padding = '20px 20px 20px 20px';
        UIElem_List.style.overflowY = 'auto';
        //UIElem_List.style.boxShadow = "inset 0 0 50px rgba(0, 0, 0, 0.15)"
        table.style.width = '100%';

        UIElem_BotControlGroup.style.display = 'flex';
        UIElem_BotControlGroup.style.justifyContent = 'flex-end';

        return UIElem_Container;
    }
    function injectUIintoDOM(elem, isRepaint = false){
        if(!isRepaint){
            let shadowDiv = document.createElement('div');
            shadowDiv.classList.add('bot_modal_shadow');
            shadowDiv.style.position='fixed';
            shadowDiv.style.top = '0';
            shadowDiv.style.left = '0';
            shadowDiv.style.width = '100%';
            shadowDiv.style.height = '100%';
            shadowDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            shadowDiv.style.zIndex = '99999';
            document.getElementsByTagName('body')[0].prepend(shadowDiv);
        }

        document.getElementsByTagName('body')[0].appendChild(elem);
    }

    function init(){
        let button = document.createElement('button');
        button.className = '';

        let icon = document.createElement('i');
        icon.className = 'fa-solid fa-shopping-cart';
        let iconSpan = document.createElement('span');
        iconSpan.className = '';
        iconSpan.appendChild(icon);

        let textSpan = document.createElement('span');
        textSpan.className = '';
        textSpan.textContent = 'Автоматизація';

        button.appendChild(iconSpan);
        button.appendChild(textSpan);
        let searchSite = document.querySelector('.search_site');

        button.addEventListener("click", function() {
            localStorage.setItem('isModalOpened', true);
            loadCoins();
            injectUIintoDOM(buildUI(), false);
        });

        searchSite.parentNode.insertBefore(button, searchSite);

        if(localStorage.getItem('isModalOpened') === 'true'){
            loadCoins();
            injectUIintoDOM(buildUI());
        }
        if(localStorage.getItem('isPolling') === 'true'){
           startPolling();
        }
    }

    function stopPolling() {
        if(pollingTimeout){
            clearTimeout(pollingTimeout);
        }
    }

    async function startPolling() {
        loadCoins();
        if(!coins.length) return;
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 800));
        pollingTimeout = setTimeout(() => {
            location.reload();
        }, await isThereSomeActiveButton()? 5100: 1250);
        for (const coin of coins) {
            updateCoin(coin.id, coin.keyword, coin.countOfAdded, coin.quantity, TASK_STATUS.DONE, repaint);
            const trueCoinNames = getTrueCoinNames(coin.keyword);
            for (const trueCoinName of trueCoinNames) {
                if (!isItemAddedToCart(trueCoinName)
                    && await clickAddToCartButtonByModel(trueCoinName, coin.quantity)
                    && await waitForItemBeingAddedToCart(trueCoinName)) {
                    updateCoin(coin.id, coin.keyword, coin.countOfAdded + 1, coin.quantity, TASK_STATUS.DONE, repaint);
                    return;
                }
            }
        }
    }
    init();
})();