var config = {
    betPercentage: {
        label: 'Multiply basebet by',
        value: 1,
        type: 'number'
    },
    bet: {
        label: 'Basebet',
        value: currency.minAmount,
        type: 'number'
    },
    lossesBeforeMinBet: {
        label: 'Losses before minimum bet (range)',
        value: 40,
        type: 'text'
    },
    payout: {
        label: 'Payout',
        value: 1.01,  // Adjusted for potentially safer bets
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
        value: 1.05,  // Adjusted for potentially safer recovery from losses
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
        value: 1.02,  // Adjusted for potentially safer profit-taking
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

var stop = 0;
var lossesForBreak = 0;
var roundsToBreakFor = 0;

var totalWagers = 0;
var netProfit = 0;
var totalWins = 0;
var totalLoses = 0;
var longestWinStreak = 0;
var longestLoseStreak = 0;
var currentStreak = 0;
var loseStreak = 0;
var numberOfRoundsToSkip = 0;
var currentBet = GetNewBaseBet();
var totalNumberOfGames = 0;
var originalbalance = currency.amount;
var runningbalance = currency.amount;
var consequetiveLostBets = 0;
var lossStopAmountVar = 0;
var consecutiveWins = 0;
var betCount = 0;

function main() {
    maxLossesBeforeMinBet = GetLossesBeforeMinBet(2 - 3);

    function GetLossesBeforeMinBet() {
        if (config.lossesBeforeMinBet.value.toString().indexOf('-') >= 0) {
            var numbers = config.lossesBeforeMinBet.value.split('-');
            return GetRandomInt(Number.parseInt(numbers[0]), Number.parseInt(numbers[1]));
        } else {
            return Number.parseInt(config.lossesBeforeMinBet.value);
        }
    }

    function GetRandomInt(min, max) {
        var retValue = Math.floor(Math.random() * (max - min)) + min;
        log.info('Number of losses before pause is set to ' + retValue + '');
        return retValue;
    }

    game.onBet = function () {
        if (numberOfRoundsToSkip > 0) {
            numberOfRoundsToSkip -= 1;
            log.info('Skipping round to relax, and the next ' + numberOfRoundsToSkip + ' rounds.');
            return;
        } else {
            if (totalNumberOfGames == 0) {
                currentBet = currency.minAmount;
            }

            if (loseStreak >= maxLossesBeforeMinBet) {
                if (game.history[0] >= (config.payout.value * 100)) {
                    loseStreak = 0;
                    maxLossesBeforeMinBet = GetLossesBeforeMinBet();
                } else {
                    game.bet(currency.minAmount).then(function (payout) {
                        runningbalance -= currency.minAmount;
                        totalWagers += currency.minAmount;
                        totalNumberOfGames += 1;

                        if (payout > 1) {
                            var netwin = currency.minAmount * config.payout.value - currency.minAmount;
                            consequetiveLostBets = 0;
                            netProfit += netwin;
                            runningbalance += netwin + currency.minAmount;
                            loseStreak = 0;
                            maxLossesBeforeMinBet = GetLossesBeforeMinBet();
                        }
                    });
                    log.info('Betting minimum until a win hits');
                    return;
                }
            }

            log.info('Placed bet for the amount of ' + currentBet);
            game.bet(currentBet, config.payout.value).then(function (payout) {
                runningbalance -= currentBet;
                totalWagers += currentBet;
                totalNumberOfGames += 1;

                if (currentBet < currency.minAmount) {
                    log.info('Current bet amount is below the minimum allowed. Betting minimum amount.');
                    currentBet = GetNewBaseBet();
                }

                if (payout > 1) {
                    var netwin = currentBet * config.payout.value - currentBet;
                    consequetiveLostBets = 0;
                    if (config.loggingLevel.value != 'compact') {
                        LogMessage('We won a net profit of: ' + netwin.toFixed(8), 'success');
                    }
                    netProfit += netwin;
                    runningbalance += netwin + currentBet;

                    if (loseStreak > 0) {
                        loseStreak = 0;
                        maxLossesBeforeMinBet = GetLossesBeforeMinBet();
                    }

                    currentStreak += 1;
                    totalWins += 1;

                    if (currentStreak === 1) {
                        config.payout.value = 1.32;
                        log.info('First streak 1 win, set payout to 1.32.');
                    }

                    if (config.onWin.value === 'reset') {
                        currentBet = GetNewBaseBet();
                        config.payout.value *= 1.05;
                    } else {
                        currentBet *= config.winMultiplier.value;
                    }

                    if (currentBet < currency.minAmount) {
                        log.info('Current bet amount is below the minimum allowed. Betting minimum amount.');
                        currentBet = GetNewBaseBet();
                    }
                    LogMessage('We won, so next bet will be ' + currentBet.toFixed(8) + ' ' + currency.currencyName, 'success');

                } else {
                    log.error('We lost a net amount of: ' + currentBet.toFixed(8));
                    netProfit -= currentBet;
                    loseStreak += 1;
                    currentStreak = 0;
                    totalLoses += 1;
                    consequetiveLostBets += currentBet;
                    LogSummary('false', currentBet);

                    if (config.onLoss.value == 'reset') {
                        currentBet = GetNewBaseBet();

                    } else {
                        currentBet *= config.lossMultiplier.value;
                    }

                    if (loseStreak >= 2) {
                        currentBet *= 4.25;
                        log.info('Streak >=2 losses, increase bet by 325%.');
                    }

                    if (loseStreak === 2) {
                        config.payout.value = 1.32;
                        log.info('First streak 2 losses, set payout to 1.32.');
                    }

                    if (loseStreak === 6) {
                        currentBet *= 0.5;
                        log.info('First streak 6 losses, decrease bet by 50%.');
                    }

                    if (currentBet < currency.minAmount) {
                        log.info('Current bet amount is below the minimum allowed. Betting minimum amount.');
                        currentBet = GetNewBaseBet();
                    }
                    LogMessage('We lost, so next bet will be ' + currentBet.toFixed(8) + ' ' + currency.currencyName, 'failure');
                }

                if (currentStreak > longestWinStreak) {
                    longestWinStreak = currentStreak;
                }
                if (loseStreak > longestLoseStreak) {
                    longestLoseStreak = loseStreak;
                }

                recordStats();

                if (currentBet < currency.minAmount) {
                    log.info('Current bet amount is below the minimum allowed. Betting minimum amount.');
                    currentBet = GetNewBaseBet();
                }

                var minimumPayout = 1.32; // Set your desired minimum payout value here

                if (config.payout.value < minimumPayout) {
                    log.info('Payout is below the minimum allowed. Using minimum payout.');
                    config.payout.value = minimumPayout;
                }
                var maximumPayout = 1.6; // Set your desired minimum payout value here

                if (config.payout.value > maximumPayout) {
                    log.info('Payout is above the maximum allowed. Using maximum payout.');
                    config.payout.value = maximumPayout;
                }
            });
        }
    };
}

function recordStats() {
    if (config.loggingLevel.value != 'compact') {
        LogMessage('total wagers: ' + totalWagers.toFixed(8), 'info');
        LogMessage('Net Profit: ' + netProfit.toFixed(8), 'info');
        LogMessage('Current win streak: ' + currentStreak, 'info');
        LogMessage('Current Lose streak: ' + loseStreak, 'info');
        LogMessage('Total wins: ' + totalWins, 'info');
        LogMessage('Total Losses: ' + totalLoses, 'info');
        LogMessage('Longest win streak: ' + longestWinStreak, 'info');
        LogMessage('Longest lose streak: ' + longestLoseStreak, 'info');
    }
}

function GetNewBaseBet() {
    var returnValue = 0;
    returnValue = currency.minAmount * config.betPercentage.value;

    if (returnValue > currency.minAmount) {
        LogMessage('Recalculating base bet to ' + returnValue.toFixed(8) + ' which is ' + config.betPercentage.value + ' percent of ' + runningbalance.toFixed(8), 'info');
    } else {
        LogMessage('The recalculated bet amount ' + returnValue.toFixed(8) + ' is lower than the minimum allowed bet.  Setting bet to the minimum allowable amount of ' + currency.minAmount, 'info');
        returnValue = currency.minAmount;
    }

    return returnValue;
}

function LogSummary(wasWinner, betAmount) {
    if (config.loggingLevel.value == 'compact') {
        if (wasWinner == 'true') {
            var winAmount = (betAmount * config.payout.value) - betAmount;
            log.success('Winner!! You won ' + winAmount.toFixed(8));
        } else {
            log.error('Loser!! You lost ' + betAmount.toFixed(8));
        }
        var winPercentage = (totalWins / totalNumberOfGames) * 100;
        var losePercentage = (totalLoses / totalNumberOfGames) * 100;

        log.info('Total Games: ' + totalNumberOfGames);
        log.info('Wins: ' + totalWins + '(' + winPercentage.toFixed(2) + ' % )');
        log.info('Loses: ' + totalLoses + '(' + losePercentage.toFixed(2) + ' % )');

        var netNumber = runningbalance - originalbalance;
        var netPecentage = (netNumber / originalbalance) * 100;

        if (originalbalance < runningbalance) {
            log.success('Total Profit: ' + netNumber.toFixed(8) + '(' + netPecentage.toFixed(2) + '%)');
        } else {
            log.error('Total Profit: ' + netNumber.toFixed(8) + '(' + netPecentage.toFixed(2) + '%)');
        }
    }
}

/// Determines whether or not to log an event or not to make it easier later
function LogMessage(message, loggingLevel) {
    if (message) {

        if (config.loggingLevel.value != 'compact') {
            switch (loggingLevel) {
                case 'success':
                    log.success(message);
                    break;
                case 'failure':
                    log.error(message);
                    break;
                case 'info':
                    log.info(message);
                    break;
                case 'compact':
                    break;
                case 'verbose':
                    if (isVerbose)
                        log.info(message);
                    break;
            }
        } else {
            switch (loggingLevel) {
                case 'success':
                    log.success(message);
                    break;
                case 'failure':
                    log.error(message);
                    break;
                case 'compact':
                    log.info(message);
                    break;
                case 'info':
                    break;
                case 'verbose':
                    break;
            }
        }
    }
}
