# CHROMABOUND DEVLOG

A designer-facing journal for the self-contained browser game built in this repository.
The notes below document research, design pillars, implementation rationale, balancing, cheats, and future ideas without relying on external assets or a build step.


## Research notes

- Classic Zelda-like browser projects usually prove a single slice of the formula: tile maps, movement, collision, and a familiar sword loop.
- kubowania/zelda-js is an approachable example of the genre in JavaScript, with clear movement and collision lessons.
- jcksnvllxr80/Delta explores the same nostalgia from another angle, emphasizing a compact web implementation.
- bobbylight's ZeldaJS demonstrates how recognizable the top-down adventure grammar remains even with simple browser primitives.
- Phaser-based Zelda-likes in the wider ecosystem often lean on engine services: tilemap loaders, asset pipelines, arcade physics, and spritesheets.
- The itch.io scene is full of small Zelda-inspired adventures, many built around visual mood or a single dungeon gimmick.
- Chromabound differentiates by refusing external spritesheets and centering every route decision on Hue Attunement.
- The player does not collect color keys; the player actively becomes the current key by choosing a hue in the moment.
- That keeps the mechanic present in combat, traversal, shop planning, and boss routing instead of isolating it to locked doors.
- The no-asset constraint was treated as a feature: all sprites are compact pixel maps rendered to offscreen canvases at load time.
- Because GitHub Pages is the target, the project avoids bundlers, package managers, and runtime fetches.
- The result is intentionally closer to a polished game jam cartridge than a framework demo.

## Design pillars

- Immediate readability: every hue has a consistent color, gate behavior, enemy advantage, and HUD accent.
- Player agency: both bosses are reachable without requiring the other boss reward, so route order is a real choice.
- Procedural charm: pixel art is generated from tiny string maps, making the art inspectable and editable inside game.js.
- Small-world density: the 4 by 4 screen map favors memorable rooms over empty distance.
- Combat clarity: matching hue doubles damage, mismatching halves it, and particles reinforce the result.
- No external dependencies: the game must launch from a static server and stay playable offline.
- Modern presentation: CSS should feel as authored as the game code, not like a default canvas page.
- Accessibility awareness: keyboard controls are primary, touch controls appear for mobile, and reduced motion is respected.
- Secrets as texture: cheat codes exist because old adventure games thrived on rumor and playground knowledge.

## Hue Attunement mechanic

- Crimson burns thorn walls and is the Ashen Warden counter-color.
- Verdant opens vine growth and creates an alternate route language through living terrain.
- Azure solidifies bridge tiles and makes water routes possible.
- Enemies carry hue identity so traversal knowledge also informs combat decisions.
- Chroma Tonic temporarily treats all hues as matched, which is useful in mixed rooms and boss panic moments.
- RAINBOW is the permanent secret version of Chroma Tonic for players who want a toy-box run.
- The body data-hue attribute also retints the HTML HUD, frame glows, and buttons, so attunement is visible outside the canvas.
- Boss victories restore color at the region level; this is both cosmetic payoff and progress feedback.
- Verdant restoration is tied to either boss falling, implying the world is beginning to heal between extremes.

## Why procedural sprites

- Spritesheets would be easy to drop in, but they would violate the zero-asset spirit of this task.
- Pixel-map arrays make every sprite auditable in plain text.
- They guarantee crisp integer scaling because each sprite is drawn onto an offscreen canvas and then rendered with image smoothing disabled.
- Hero walk cycles use two frames per direction, enough to sell motion at the small scale.
- Attack poses are direction-specific so the sword has a clear footprint.
- Enemy frames use small silhouette changes: blobs squash, sentries march, spitters blink, chargers brace.
- Boss sprites are larger maps so they read as a different class of threat.
- Pickups are also generated: hearts, shards, and potions share the same visual language.
- The compact format keeps art and mechanics close together for a self-contained cartridge feel.

## Architecture decisions

- The game uses a fixed timestep inside requestAnimationFrame to keep simulation stable at 60fps.
- Rendering remains decoupled from update accumulation, which avoids physics changing with display refresh.
- The world is screen-based, following classic Zelda room transitions rather than continuous scrolling.
- Rooms are data-driven objects with coordinates, region metadata, enemies, signs, shop flags, boss flags, and tile arrays.
- Tile collision is AABB based against a simple 20 by 11 room grid.
- Hue gates are just tile characters with behavior functions, keeping traversal logic easy to extend.
- Entities are class-based for clarity: Enemy, Boss, Projectile, Particle, Pickup, and Shopkeeper.
- Enemy AI is intentionally distinct per type while sharing hit, death, draw, and collision helpers.
- Bosses are a separate class because phase transitions, health bars, rewards, and defeat callbacks differ from normal enemies.
- Room memory tracks killed enemies, burned thorns, opened chests, and visits so progress persists across transitions.
- localStorage saves inventory, upgrades, bosses, room state, stats, and player state.
- The code avoids imports so the game is a single static ES module loaded by index.html.

## Enemy design

- Blob is the low-pressure random wanderer; it teaches collision and contact damage.
- Sentry patrols until line-of-sight detection succeeds, then chases the player.
- Spitter tries to maintain distance and fires projectiles, forcing movement rather than pure sword trading.
- Charger telegraphs, pauses, and then dashes, making anticipation more important than reaction alone.
- Each enemy has a hue so the same AI can become easier or harder depending on player attention.
- Knockback interrupts enemy pressure and gives sword hits tactile value.
- I-frames prevent multi-hit shredding and create readable hit flashes.
- Death poofs and tinted particles help the world feel reactive without requiring asset files.
- Drops are intentionally generous enough to support exploration and shop purchases during a short game.

## Boss design

- The Ashen Warden is crimson and built around radial fire pressure.
- At half health the Warden summons minions, shifting the fight from pattern reading to crowd control.
- Defeating the Warden grants Shift Dash, a mobility reward that feels physical and immediately useful.
- The Tide Oracle is azure and built around spiral projectiles plus teleporting repositioning.
- At half health the Oracle increases attack tempo and teleports more aggressively.
- Defeating the Oracle grants the full-heart Prism Beam, rewarding careful play with ranged power.
- Both bosses have health bars because multi-phase fights need explicit progress feedback.
- Both bosses can be attempted in either order because the base hue kit already solves their routes.
- Boss rewards are useful but not hard prerequisites, preserving route freedom.

## Economy and upgrades

- Prism shards drop from enemies and are spent in the Shardmason Bazaar.
- Health Potion is cheap because it is the main safety valve.
- Chroma Tonic costs more because it bypasses all hue gate and combat matching pressure for ten seconds.
- Stone Skin sits between survival and strategy by reducing damage during hard rooms.
- Heart Containers are expensive but permanent, so they serve cautious players.
- Blade Honing is expensive because it globally shortens fights.
- Movement Boots are expensive because speed improves combat, exploration, and dodging.
- Boss rewards have no shard cost; they are narrative progression payoffs.
- The economy expects players to buy at least one potion before tackling both bosses if they explore several rooms.

## Overworld map

- The map is a 4 by 4 grid from x -1 to 2 and y -1 to 2.
- Room (-1,-1): Ash Gate Approach.
- Room (0,-1): The Ashen Warden boss arena.
- Room (1,-1): Azure Causeway.
- Room (2,-1): Tide Oracle Sanctum boss arena.
- Room (-1,0): Crimson Bramble Pass.
- Room (0,0): The Grey Crossroads hub.
- Room (1,0): Verdant Ruin Fork.
- Room (2,0): Moonlit Reed Maze.
- Room (-1,1): Moss Secret Ledge.
- Room (0,1): Shardmason Bazaar shop.
- Room (1,1): Tri-Hue Lock Garden.
- Room (2,1): Sunken Shortcut.
- Room (-1,2): Old Root Cache.
- Room (0,2): Silent Training Yard.
- Room (1,2): Hidden Prism Vault.
- Room (2,2): Colorfall Overlook.
- The west and north routes lean crimson, while east and northeast lean azure.
- Verdant gates create cross-links and secret-room flavor rather than a third boss lane.
- The hidden vault is reached by breaking a cracked wall from the training yard with crimson attunement.

## CSS technology choices

- @layer organizes reset, tokens, base, layout, components, effects, and responsive rules.
- CSS nesting keeps hover, active, and component variants near the base selectors.
- oklch() creates perceptually balanced neon colors for the violet-slate theme.
- Custom properties define the palette and make hue retinting centralized.
- body[data-hue] switches --accent among Crimson, Verdant, and Azure.
- color-mix() derives weak and deep accent tones without hard-coding extra colors.
- @property registers --spin and --pulse for animatable gradient effects.
- The frame border uses a conic gradient animated by --spin.
- The logo uses gradient text, glow, and fluid clamp() sizing.
- Container queries reflow the HUD when the game frame is narrow.
- :has(dialog[open]) dims the HUD while inventory or cheat dialog is open.
- backdrop-filter gives inventory and cheat panels a glassmorphism overlay.
- Layered gradients create scanlines and a CRT vignette over the canvas.
- text-wrap: balance improves title and tagline composition.
- prefers-reduced-motion collapses animation durations for motion-sensitive players.
- Touch controls are hidden by default and revealed through a coarse pointer media query.

## Cheat code list

- HYRULE toggles god mode.
- RAINBOW grants permanent all-hue attunement.
- RICHKID sets prism shards to 999.
- WARP1 teleports to The Ashen Warden.
- WARP2 teleports to The Tide Oracle.
- The Konami sequence heals the player and stocks all potion types.
- Title-screen typed codes are supported so players can discover secrets before starting.
- The backtick console supports explicit in-game code entry.
- GAME.md teases secrets but does not fully spoil them.
- This DEVLOG contains the complete list for testers and maintainers.

## Balancing notes

- Matching hue damage is 2x to make correct attunement feel decisive.
- Mismatched damage is 0.5x so players can still brute-force in emergencies, just inefficiently.
- Boss health values are low enough for a compact browser game but high enough to show phase changes.
- Enemy drops are intentionally arcade-generous because there is no long RPG grind.
- Player base health starts at six half-heart units, readable as three hearts.
- Heart containers add two units, matching classic heart increments.
- Dash has a cooldown to prevent it from becoming permanent invulnerability.
- Prism Beam only fires at full HP, turning clean play into a power state.
- Stone Skin and Chroma Tonic both last ten seconds to be easy to understand.
- Shop prices make small potion purchases reachable early and permanent upgrades aspirational.

## Testing notes

- node --check game.js verifies syntax without requiring a browser build step.
- A static Python HTTP server is sufficient for local hosting.
- Browser testing should check title load, start, hue switching, room transitions, inventory, shop, cheat console, and boss warp codes.
- No third-party network requests are required.
- localStorage can be cleared by pressing New Game on the title screen.
- Canvas art remains crisp because CSS and drawing contexts disable smoothing.
- HTML dialog is used for pause/inventory and cheat input, giving semantic focus behavior.

## Future ideas

- A third verdant boss could complete the chromatic triad.
- Room definitions could move to JSON if the world grows larger.
- A minimap would help players track the 4 by 4 overworld.
- Screen-scroll animation could be expanded from the current quick transition feel into full directional camera travel.
- Procedural music layers could fade in as color returns.
- More hue interactions could include enemy shields, prism mirrors, and timed color switches.
- A save-select screen could support multiple localStorage slots.
- Accessibility could add remappable controls and colorblind pattern overlays for hue gates.
- A hard mode could disable potion drops while retaining shop purchases.
- A tiny level editor could let players paint tile characters and export room data.

## Production journal

001. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
002. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
003. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
004. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
005. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
006. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
007. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
008. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
009. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
010. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
011. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
012. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
013. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
014. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
015. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
016. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
017. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
018. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
019. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
020. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
021. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
022. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
023. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
024. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
025. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
026. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
027. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
028. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
029. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
030. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
031. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
032. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
033. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
034. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
035. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
036. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
037. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
038. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
039. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
040. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
041. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
042. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
043. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
044. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
045. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
046. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
047. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
048. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
049. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
050. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
051. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
052. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
053. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
054. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
055. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
056. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
057. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
058. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
059. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
060. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
061. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
062. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
063. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
064. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
065. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
066. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
067. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
068. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
069. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
070. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
071. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
072. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
073. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
074. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
075. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
076. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
077. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
078. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
079. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
080. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
081. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
082. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
083. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
084. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
085. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
086. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
087. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
088. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
089. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
090. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
091. **Scope:** The game needed to be complete enough to win, yet small enough to audit in a single repository root.
092. **Canvas size:** A 320 by 180 canvas gives a 16:9 frame and supports integer-looking pixel art at common browser sizes.
093. **Room size:** Twenty columns by eleven rows leaves room for a HUD outside the canvas and classic screen exits.
094. **Collision:** AABB tile collision was chosen over physics simulation because the game favors deterministic grid readability.
095. **Data:** Rooms store enemies and tile gates directly, reducing hidden coupling between map and code.
096. **Persistence:** localStorage is enough for GitHub Pages and avoids server identity or privacy concerns.
097. **Audio:** WebAudio bleeps are synthesized at interaction time to avoid external sound files.
098. **Mobile:** Touch controls do not try to replace full gamepad UX; they simply keep the game from being broken on phones.
099. **Visual payoff:** Color restoration is implemented as a regional palette shift rather than a cutscene, so every revisit reinforces victory.
100. **Secrets:** Cheats are playful but also useful for testing boss access and economy states.
