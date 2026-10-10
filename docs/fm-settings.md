# Where the sliders come from

The slider groups started from how Future Motion describes its ride settings. The definitions below were written by Neil Bennett and are shared here with his permission.

## Mapping to the Refloat Shaping sliders

| FM setting | Slider | Notes |
|---|---|---|
| Aggressiveness | Accel Feel | |
| Aggressiveness, advanced tab (per speed) | Accel Feel (speed) | Firmness as speed increases (Dynamic Pitch KP) |
| Braking Aggression | Brake Feel | |
| Dynamic Responsiveness | Input Play | **Opposite direction**: + = more free play (looser), − = quicker response |
| Turn Compensation – Roll | Carve Trim | Based on yaw (Refloat Turn Tilt), not on roll |
| Turn Compensation – Yaw Mix Rate | Carve Trim Speed | |
| Gradient Tracking – Strength | Adaptive Response – uphill / downhill strength | One per direction; ATR (slope) and Torque Tilt (effort) together, since "any strain on the motor simulates a change in gradient" (Neil) |
| Gradient Tracking – Response Speed | Adaptive Response – uphill / downhill speed | One per direction |
| Gradient Tracking – Max Angle | Response Limit | One Max Angle for ATR and Torque Tilt, 0 to 18° (Torque Tilt held at 8°); 0 = off |
| Jump Reengagement Time, Zone Engagement | — | Footpad / startup behaviour, deliberately left out |
| — | Stance Profile | Constant tiltback, no FM equivalent |

Exact parameters and values: [sliders.md](sliders.md).

## FM setting definitions (Neil Bennett)

**Braking Aggression:** Control how aggressive brakes are independent of overall aggressiveness. Dial this down to maneuver your nose up and over obstacles easier. Dial this up to increase tail clearance while braking, especially useful for steep descents and hard braking.

**Aggressiveness:** dial for trail tread / traction. This is essentially how concentrated your board's power is. You can think of high aggression like a light switch demanding full power immediately. Low aggression, however, is like a dimmer that allows you to roll the power on and off gradually and with more precision at the expense of clearance. You can set aggressiveness at different speeds by selecting the advanced tab.

**Dynamic Responsiveness:** dial for terrain and board maneuverability. This is the free play between acceleration and braking inputs. Tightening Dynamic Responsiveness will have your board responding to your inputs sooner, giving you more clearance. Alternatively, loosening Dynamic Responsiveness will allow you to manipulate the board back and forth, which can help when riding trails with a lot of rollers or harsh transitions.

**Turn Compensation – Roll:** This lifts your nose when you roll your board to the side (i.e. when turning). If the corners along your trail are mostly flat or off-camber, pull the roll down, which will allow the nose to fall towards the roll during your turn. If you're riding a flow trail with bermed turns, you'll want to dial the roll up to lift the nose and maximize clearance through the berm.

**Turn Compensation – Yaw Mix Rate:** This is how quickly the roll effect is filtered in and out of your turn. If you are navigating tight, slow speed or poorly built berms, you may want to crank up the yaw mix rate to get brief nose lift in a small berm. If you have longer berms built to maintain speed or you're on a hybrid trail with some tech to navigate, you'll want to dial the yaw mix rate down.

**Jump Reengagement Time:** This will keep your footpad sensor engaged longer. If you expect some airtime, you'll want to dial this up.

**Zone Engagement:** This allows for a quicker, more consistent single-zone activation when initially bringing your board to level. The board will remain in single zone until it reaches 2 mph, then it reverts back to dual zone.

**Gradient Tracking – Strength:** This allows you to configure the board's tilt response when climbing and descending hills. The strength slider allows riders to dial the effect in for their body weight and terrain. Heavier riders will want a lower strength while kids will opt for a higher strength. Tire pressure can also factor into where you set your strength, as it can change your rolling resistance.

**Gradient Tracking – Response Speed:** This controls how quickly the board reacts to changes in gradient. I'd recommend starting with a slow response speed and raising it until the board reacts fast enough for your terrain. Too fast and the board will tilt for every bump along the trail.

**Gradient Tracking – Max Angle:** This allows you to limit the amount of correction that Gradient Tracking can apply.
