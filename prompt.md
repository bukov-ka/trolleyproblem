I want to implement a simple browser game about the famous 'trolley problem'.
I have the following sprites:
- 'train.png' 172x119 - The train moving along the rails, rotated at 18 degrees to the bottom. The view is not directly from the side, the rails are rotated 18 degrees clockwise to show 2.5D picture
- 'switch.png' 158x171 - The person switching the path. It should be just displayed on the left bottom and the number of humans met the train should be dispayed near the sprite.
- 'human.png' 186x117 - The human being laying on the rails.
The rails distance is 30 pixels (measured by vertical).
The train should be stationary by the x axis and moves only after a switch vertically and the rails with the haman beings on it should be moving toward it.
The game is a set of `decisions`. Each decision is a rail switch. On each path laying some persons (or just empty rails). The train chooses either top path or bottom path, hitting the corresponding humans. Then it rails merge together and another decision is to be made. Near the switch.png sprite there is an indicator of the selected path. It's either 'up' or 'down' and is switched by the cursor arrows or 'W' and 'S' buttons. After train passes a 'decision' and returns on the track, before the next 'decision' the switch position is undefined. If a user hasn't choosen anything, a random path is choosen.
Each 'human' met with the train is counted as 'hit'.


The following 'map' is used. It is a set of decisions, the first number is the number of persons on the top path, the second - number of persons on the bottom path.
- 1,5
- 5,1
- 1,1
- 0,5
- 5,5
- 0,0
- 1,0
- 0,1

For each 'decision' the switch chosen by the user should be saved. Undefined should be saved if the user hasn't choosen anything.
