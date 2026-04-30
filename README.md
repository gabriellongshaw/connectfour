## Connect Four

A web-based Connect Four game with three ways to play: local two-player, online multiplayer, and solo against a bot.

## How to Play

Drop coloured discs into a 7×6 grid — first player to connect four in a row (horizontal, vertical, or diagonal) wins. Players take turns, and the disc falls to the lowest available slot in the chosen column.

## Game Modes

### Local

Pass-and-play on the same device. Player 1 plays as Red and Player 2 plays as Yellow. Players take turns clicking a column to drop their disc. Either player can hit Restart to reset the board at any time.

### Online

Real-time multiplayer over the internet powered by Firebase. One player hosts a game and receives a room code, which they share with a friend. The friend enters the code to join. Player 1 (the host) plays as Red, Player 2 plays as Yellow, and turns are enforced so only the active player can move. The host is the only one who can restart the game between rounds.

### vs Bot

Solo play against an AI. Choose a difficulty before the game starts — the bot always plays as Yellow and moves automatically after your turn. Four difficulty levels are available:

- **Easy** — plays mostly random moves, rarely blocks you
- **Medium** — knows the basics but makes mistakes, good for learning
- **Hard** — strong minimax AI with occasional slip-ups, a real challenge
- **Impossible** — full-depth minimax, plays perfectly and is very hard to beat

## Leaderboard

Every mode tracks wins and draws for the current session. The leaderboard is shown above the board and updates after each game. It resets when you leave the game or start a new session.

## Credits

- [Gabriel Longshaw](https://www.gabriellongshaw.co.uk) - Main Developer
- [bocajthomas](https://github.com/bocajthomas) - Contributor

## Contribute

Would you like to contribute to this project? Do you have any cool ideas or would like to improve the game?

Even if you don’t have any experience in web development your ideas and feedback are still appreciated.

[Contact me here](https://www.gabriellongshaw.co.uk)