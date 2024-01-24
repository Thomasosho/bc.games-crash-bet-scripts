var config = {
    betPercentage: {
        label: 'Multiply basebet by',
        value: 20,
        type: 'number'
    },
    bet: {
        label: 'Basebet',
        value: 100,
        type: 'number'
    },
    lossesBeforeMinBet: {
        label: 'Losses before minimum bet (range)',
        value: 30,
        type: 'text'
    },
    payout: {
        label: 'Payout',
        value: 1.01,
        type: 'number'
    },
    onLoseTitle: {
        label: 'On Loss',
        type: 'title'
    },
    onLoss: {
        label: '',
        value: 'reset',
        type: 'radio',
        options: [{
            value: 'reset',
            label: 'Return to base bet'
        }, {
            value: 'increase',
            label: 'Increase bet by (loss multiplier)'
        }]
    },
    lossMultiplier: {
        label: 'Loss multiplier',
        value: 1.01,
        type: 'number'
    },
    onWinTitle: {
        label: 'On Win',
        type: 'title'
    },
    onWin: {
        label: '',
        value: 'reset',
        type: 'radio',
        options: [{
            value: 'reset',
            label: 'Return to base bet'
        }, {
            value: 'increase',
            label: 'Increase bet by (win multiplier)'
        }]
    },
    winMultiplier: {
        label: 'Win multiplier',
        value: 1.01,
        type: 'number'
    },
    loggingLevel: {
        label: 'logging level',
        value: 'compact',
        type: 'radio',
        options: [{
            value: 'info',
            label: 'info'
        }, {
            value: 'compact',
            label: 'compact'
        }, {
            value: 'verbose',
            label: 'verbose'
        }]
    }
};

var stack = 100;
var currentBet = config.bet.value;

function main() {
    game.onBet = function () {
        log.info('Placing bet: ' + currentBet);
        
        game.bet(currentBet, config.payout.value).then(function (payout) {
            if (payout > 1) {
                var profit = currentBet * (payout - 1);
                stack += profit;
                log.success('Won ' + profit.toFixed(8) + ' | Total Stack: ' + stack.toFixed(8));
                handleWin();
            } else {
                stack -= currentBet;
                log.error('Lost ' + currentBet.toFixed(8) + ' | Total Stack: ' + stack.toFixed(8));
                handleLoss();
            }

            // Stop the script if the stack reaches zero
            if (stack <= 0) {
                log.error('Out of funds. Stopping the script.');
                game.stop();
            }
        });
    };
}

function handleWin() {
    if (config.onWin.value === 'reset') {
        currentBet = config.bet.value;
    } else {
        currentBet *= config.winMultiplier.value;
    }
}

function handleLoss() {
    if (config.onLoss.value === 'reset') {
        currentBet = config.bet.value;
    } else {
        currentBet *= config.lossMultiplier.value;
    }
}

// Run the main function
main();
