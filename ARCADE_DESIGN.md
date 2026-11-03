# Đã thay thế: sạp cờ tướng và trà đá

> Bản thiết kế sòng bạc cũ được giữ lại chỉ để tương thích với save/migration và lịch sử phát triển. Trong runtime hiện tại, địa điểm này đã được **sạp cờ tướng Phú Thượng**; không còn Blackjack, poker hay vòng quay truy cập được từ game.

Thiết kế đang chạy được ghi ở [TEA_CHESS_PASS.md](TEA_CHESS_PASS.md).

## Tài liệu lịch sử (không còn là gameplay hiện tại)

## Implemented games

- Texas Hold'em: four seats (human + three computer players), No Limit, blinds 5/10. Each hand escrows a chosen 50/100/200/300-token stack, then returns remaining chips plus winnings on completion. Opponent stacks reset for each new hand; the dealer rotates. This is a series of independent hands, not a tournament.
- Pre-flop / flop / turn / river, burned cards, best five of seven, fold/check/call/raise/all-in, minimum full raises, short all-in reopening restrictions, main and side pots, ties and odd chips. No rake. Bots use only their own cards and public board, with different aggression thresholds.
- Blackjack: existing player rules preserved. Two neighbouring computer players play separate shoes, drawing to 17, with their own simulated 10-token stakes and displayed results. Their cards never consume or expose cards from the human's shoe.
- Wheel: existing 16 equal sectors preserved. Three computer participants have separate simulated balances and receive the same sector award on the communal spin. Insolvent NPCs receive a simulated 10-token refill for the next spin, without affecting the human's wallet.

## Presentation and persistence

- Tables open only their own game through the nearby world interaction. There is no lobby/game-picker or in-dialog navigation to another game. An unfinished hand at another table must be resumed at its physical table; it is never opened automatically from a different seat. Daily token gifts are available on each table instead of a separate lobby.

- Felt table, animated deal/reveal, hidden opponent cards until showdown (folded and uncontested hands remain hidden), chip placement and collection, dealer marker, thinking and winner states, collapsible hand history.
- Blackjack deal/reveal delay, animated guest hands, wheel slowing and rim glow, animated crowd reactions.
- Four seated 3D guests reuse local CC0 citizen models, with procedural breathing/head/arm motion only within 28m of the shop. No new shadow-casting lights.
- Closing pauses pending AI/actions. Exact deck, board, stacks, betting state and pot contributions survive reload; reopening resumes play. Old unfinished draw-poker stakes are refunded during migration to Texas.
- All money is free, non-convertible play tokens, separate from household money.

## Pacing and decision support

- Default calm pacing: 2.6s per computer decision and 3.4s between streets. Standard pacing: 1.5s / 1.9s. Step mode advances exactly one computer decision or street via a button; the human turn is never timed. Pause cancels queued progression. These settings are saved with the arcade.
- All-in (including calls consuming the whole remaining stack) requires an inline second click. Presets select a legal raise target without placing a bet.
- Public-information coach explains current best five, kickers, board-only combinations, draw outs for completing a straight/flush next card, and the pot-odds break-even threshold. Draw chance and pot odds are explicitly not presented as winning equity. No hidden opponent cards or future deck positions are used.
- Showdown review displays each non-folded player's best five and contribution/award. Settlement messages identify the winning hand. In-hand history retains up to 40 events.
- AI folds now depend on price and visible strength; random variation is reserved for occasional aggression or rare bluff attempts. Deck randomness and payout rules remain unchanged.

## Checks

- End-of-hand summaries are reconstructed from visible showdown cards and pot rules, including older saved receipts. They show initial stack, actual contribution, pot return and wallet return separately. Raise range/number/preset controls share a live “additional chips / remaining stack” preview. Each physical table has its own compact ledger of up to 12 recent settled rounds in the shared save (not a new game-selection screen).

`npm test` includes evaluator, betting order, side pots, short all-ins, save round-trips, and 240 deterministic complete hands checking stack conservation and single settlement. Browser harness at `/tests/arcade-preview.html` uses the separate `127.0.0.1` origin and tests walking through the entrance, all three games and reload during a Texas hand.

Rule references used: [WSOP Hold'em rules](https://www.wsoponline.com/nv/learn-to-play-poker/texas-holdem/rules/), [WSOP official tournament rules](https://assets.wsopcdn.com/wsop/1a72ba28-781c-409d-a9c3-5ca13c4c5718.pdf). The game is a local play-token adaptation, not a claim of tournament certification.
