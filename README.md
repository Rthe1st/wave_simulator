# Wave simulator

[The code for this simulator.](https://rthe1st.github.io/wave_simulator/)

It's visualization of how sound waves emerge from the vibrations of sound particles - there's a more detailed explanation on the simulation page.

Code-wise, it's written in Javascript, with the particles drawn on an html canvas and everything else as SVG elements using D3. The maths equations are rendered with mathjax and the interactive controls are done with DatGui.

A little bit of python was used to turn a piano wav file into an array of amplitudes to use as a waveform in the simulator.

Thanks to all the people who have contributed to wikipedia articles, stackoverflow questions and other online sound resources. It's amazing how much learning material the internet has.

Some of the sites I read while trying to build this (there's more specific ones cited as specific references on the simulation page):

* https://physics.bu.edu/~duffy/semester1/c20_disp_pressure.html
* https://www.animations.physics.unsw.edu.au/jw/sound-wave-equation.htm
* https://en.wikipedia.org/wiki/Sound_particle
* https://www.physicsclassroom.com/Physics-Interactives/Waves-and-Sound/Simple-Wave-Simulator/Simple-Wave-Simulator-Interactive
  * [Just the simulation](https://www.physicsclassroom.com/PhysicsClassroom/media/interactive/SimpleWaves/index.html)
  * [Made by these guys](https://www.simbucket.com/) - who were kind enough to give me some pointers when I emailed them
