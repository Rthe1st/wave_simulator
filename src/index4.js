//https://jsfiddle.net/tm5166e1/11/
//https://stackoverflow.com/questions/46034414/how-to-move-circlesdata-points-in-d3-js
//https://www.tutorialsteacher.com/d3js/animation-with-d3js

import * as d3 from 'd3';
import * as dat from 'dat.gui';

function setup(svg, particleArea){

  let svgDim = svg.getBoundingClientRect()

  let particleLayer = d3.select(svg).append('g').attr('class', 'particleLayer');
  let overlayLayer = d3.select(svg).append('g').attr('class', 'overlayLayer');

  //these rectangles from a window that hides particles when they leave the particle area
  overlayLayer.append("rect")
  .attr("width", particleArea.x)
  .attr("height", svgDim.height)
  .attr("x", 0)
  .attr("y", 0)
  .attr("fill", "white");

  overlayLayer.append("rect")
  .attr("width", svgDim.width)
  // this just needs to at least hit the bottom of the screen
  .attr("height", particleArea.height)
  .attr("x", particleArea.x)
  .attr("y", particleArea.y + particleArea.height)
  .attr("fill", "white");

  overlayLayer.append("rect")
  .attr("width", svgDim.width)
  .attr("height", particleArea.y)
  .attr("x", particleArea.x)
  .attr("y", 0)
  .attr("fill", "white");

  overlayLayer.append("rect")
  .attr("width", svgDim.width)
  .attr("height", particleArea.height)
  .attr("x", particleArea.x + particleArea.width)
  .attr("y", particleArea.y)
  .attr("fill", "white");

  overlayLayer.append('path')
      .datum([])
      .attr('class', 'level-curve')
      .attr('d', d3.line())
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr("fill","transparent");

  overlayLayer.append('path')
    .datum([])
    .attr('class', 'displacement-curve')
    .attr('d', d3.line())
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr("fill","transparent");
}

function drawPressureChat(svg, particleArea){
  let svgDim = svg.getBoundingClientRect();
  // the pressure graph
  var yRange = d3.scaleLinear().domain([-1,1]).range([0, svgDim.height*0.1]);

  var axis = d3.axisLeft(yRange)
    .ticks(3, "s");

  let y = svgDim.height*0.1;

  let leftAxis = d3.select(svg)
  .append("g")
    .attr("transform", `translate(${particleArea.x},${y})`)
    .call(axis);

    d3.select(svg).append("text")
    .attr("transform", `translate(${particleArea.x},${y})`)
    .text("% of max");

    //domain needs to be dynamic based on max displacement
  let pressureYRange = d3.scaleLinear().domain([-65754,65754]).range([0, svgDim.height*0.1]);

  var axis = d3.axisRight(pressureYRange)
    .ticks(3, "s");

  d3.select(svg)
  .append("g")
    .attr('class', 'pressure-chart')
    .attr("transform", `translate(${particleArea.x + particleArea.width},${y})`)
    .call(axis);

  d3.select(svg).append("text")
    .attr("transform", `translate(${particleArea.x+particleArea.width},${y})`)
    .text("Pressure (Pa)");
}

function drawDisplacementChart(svg, particleArea){
  let svgDim = svg.getBoundingClientRect();
  // the pressure graph
  var yRange = d3.scaleLinear().domain([-1,1]).range([0, svgDim.height*0.1]);

  var axis = d3.axisLeft(yRange)
    .ticks(3, "s");

  let y = svgDim.height*0.8;

  let leftAxis = d3.select(svg)
  .append("g")
    .attr("transform", `translate(${particleArea.x},${y})`)
    .call(axis);

  d3.select(svg).append("text")
    .attr("transform", `translate(${particleArea.x},${y})`)
    .text("% of max");

  d3.select(svg)
    .append("g")
      .attr('class', 'displacement-chart')
      .attr("transform", `translate(${particleArea.x + particleArea.width},${y})`);

  d3.select(svg).append("text")
    .attr("transform", `translate(${particleArea.x+particleArea.width},${y})`)
    .text("Displacement (m)");
}

function cache(modelCache, model, svgWidth){
  /*
  middle c freq = 261.63 hz (cycles per second)
  // waveLength = v/f
  // speed of sound: 343 m/s in air at 20 °C. 
  // waveLength = 343/261.63
  */

  let period = 1/model.freq;//seconds (time of 1 cycle)
  let waveLength = model.speedOfSound/model.freq;//meters

  //is w/c equivlent to our k?
  let k = 2*Math.PI/waveLength;// cycles per meter, angular freq, oscillations per unit of space
  let w = 2*Math.PI/period;// occislations per period of time, 0.1 = 10th of a wave per tick

  modelCache.waveLength = waveLength;
  modelCache.wTimeScale = w * model.timeScale;
  modelCache.k = k;
  modelCache.toMetersScaleFactor = model.simWidth/svgWidth;
  modelCache.toCordsScaleFactor = svgWidth/model.simWidth;

  let pressure = maxPressure(model);
  document.getElementById('pressure').innerText = `Peak pressure (pa): ${pressure}`

  //https://en.wikipedia.org/wiki/Sound_pressure#Sound_pressure_level
  //we need
  let referencePressure = 20 * 0.000001;//20 microPa
  let pressureRMS = pressure/Math.sqrt(2);
  let spl = 20*Math.log10(pressureRMS/referencePressure)
  document.getElementById('sound-pressure-level').innerText = `Sound Pressure Level (dB): ${spl}`

  return modelCache;
}

function maxPressure(model){
  
  let rho=1.203;//air density, kg/m^3
  //pressure in pa (max pressure)
  //this result seems very loud, is it right?
  //this must be delta pressure as well - as compared to ambiant
  //or is this the max pressure?
  // let pressure = model.maxDisplacement*rho*model.speedOfSound*model.speedOfSound*modelCache.k;
  // pressure = Math.round(pressure)
  
  // https://physics.stackexchange.com/questions/93424/how-far-do-air-particles-move-when-a-sound-wave-passes-through-them?rq=1
  // we need slant our displacement ranges much lower to cover common hearing numbers
  let roomairAccoutsitcImpedance = 400;//this depends on wave speed - we should derive it see https://en.wikipedia.org/wiki/Acoustic_impedance#Characteristic_acoustic_impedance
  let pressure = model.maxDisplacement*2*Math.PI*model.freq*roomairAccoutsitcImpedance;
  return pressure;
}

window.onload = function(){
    const gui = new dat.GUI();
    let model = {
      simWidth: 10,
      timeScale: 0.0001,
      freq: 261.63,
      speedOfSound: 343,
      particleNumber: 2000,
      maxDisplacement: 0.1,//in meters
      size: 1,
      tone: 'sin',
      waveFunction: Math.sin,
      preset: 'C'
    }

    let svg = document.getElementById('diagram3')
    let svgDim = svg.getBoundingClientRect()

    var particles = [];

    let particleArea = {x: svgDim.width*0.1,
      y:svgDim.height*0.2,
      width: svgDim.width*0.8,
      height: svgDim.height*0.6,
    };

    setup(svg, particleArea);

    let modelCache = {};

    modelCache = cache(modelCache, model, svgDim.width);

    let controllers = []

    controllers.push(gui.add(model, 'particleNumber', 0, 8000, 100)
    .onChange(() => {
      particles = newParticleNumber(svg, particles, model.particleNumber, particleArea, model.size);
      highlightedParticles(svg, particles, model.size, model.maxDisplacement * modelCache.toCordsScaleFactor);
    }));

    controllers.push(gui.add(model, 'size', 1, 10, 1)
    .onChange(() => {
      newParticleSize(svg, particles, model.size);
    }));

    controllers.push(gui.add(model, 'simWidth')
    .name('width (m)')
    .options([0.000001, 0.00001, 0.0001, 0.001, 0.01, 0.1, 1, 10, 200])
    .onChange(() => {
      meterScaleUpdate(svg, model.simWidth, particleArea);
      modelCache = cache(modelCache, model, svgDim.width);
      highlightedParticles(svg, particles, model.size, model.maxDisplacement * modelCache.toCordsScaleFactor);
    }));

    //todo: make steps better (bigger steps at bigger values)
    // or one of N fixed speeds
    // if you let this get big (0.2101) wave starts going backwards, why?
    controllers.push(gui.add(model, 'timeScale', 0.00001, 0.0005, 0.00001)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
    }));

    //todo: make logrthic / lock to know freq like middle C
    //max out at 20K
    controllers.push(gui.add(model, 'freq', 20, 2000, 1)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
      updateWaveLengthScale(svg, model.simWidth, particleArea, modelCache);
    }));

    controllers.push(gui.add(model, 'speedOfSound', 100, 1000, 1)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
    }));

    controllers.push(gui.add(model, 'maxDisplacement', 0, 1, 0.00000001)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
      highlightedParticles(svg, particles, model.size, model.maxDisplacement * modelCache.toCordsScaleFactor);
    }));

    gui.add(model, 'preset').options(['real middile C', 'blah'])
    .onChange(() => {
      if(model.preset == 'real middile C'){
        model.simWidth = 10;
        model.timeScale = 0.0001;
        model.freq = 261.63;
        model.speedOfSound = 343;
        model.particleNumber = 2000;
        model.maxDisplacement = 0.1;
        model.size = 1;
      };
      for(let controller of controllers){
        controller.updateDisplay();
      }
      modelCache = cache(modelCache, model, svgDim.width);
    });

    //todo: add a complex one, like a rip of a piance not or something
    gui.add(model, 'tone').options(['sin', 'triangle', 'square'])
    .onChange(()=>{
      switch(model.tone){
        case 'sin':
          model.waveFunction = Math.sin;
          break;
        case 'triangle':
          model.waveFunction = triangle;
          break;
        case 'square':
          model.waveFunction = square;
          break;
      }
    });

    particles = newParticleNumber(svg, particles, model.particleNumber, particleArea, model.size);
    highlightedParticles(svg, particles, model.size, model.maxDisplacement * modelCache.toCordsScaleFactor);
    metersScale(svg, particleArea);
    meterScaleUpdate(svg, model.simWidth, particleArea);
    waveLengthScale(svg, model.simWidth, particleArea, modelCache.waveLength);
    updateWaveLengthScale(svg, model.simWidth, particleArea, modelCache);
    update(svg, particles, modelCache, model);
    drawPressureChat(svg, particleArea);
    drawDisplacementChart(svg, particleArea);

}

function newParticleSize(svg, particles, size){

  d3.select(svg)
    .selectAll('.particle')
    .data(particles)
    .attr("r", size);

}

function highlightedParticles(svg, particles, size, maxDisplacement){
  let highlightedParticleDisplacement =  d3.select(svg)
    .selectAll('.highlightedParticleDisplacement')
    .data(particles.slice(0,3));

  let enterHighlightedParticleDisplacement = highlightedParticleDisplacement
  .enter().append("line")
      .attr('class', 'highlightedParticleDisplacement')
      .attr("stroke", "BLACK")
      .attr('stroke-width', 3);

  highlightedParticleDisplacement.merge(enterHighlightedParticleDisplacement)
    //need to do the below on update as well
    .attr("x1", d => d[0] - maxDisplacement)
    .attr("y1", d => d[1] + size * 4)
    .attr("x2", d=> d[0] + maxDisplacement)
    .attr("y2", d => d[1] + size * 4);
  
  highlightedParticleDisplacement
  .exit().remove();

  let highlightedParticleSelection =  d3.select(svg)
    .selectAll('.highlightedParticle')
    .data(particles.slice(0,3));

  highlightedParticleSelection
  .enter().append("circle")
      .attr('class', 'highlightedParticle')
      .attr("stroke", "BLACK")
      .attr("fill", "RED")
      .attr("cx", d => d[0])
      .attr("cy", d=> d[1])
      .attr("r", size * 4);

  highlightedParticleSelection
  .exit().remove();
}

function newParticleNumber(svg, particles, requestedParticleNumber, bounds, size){
  
  while(requestedParticleNumber > particles.length){
    let x = bounds.x + bounds.width * Math.random()
    let y = bounds.y + bounds.height * Math.random()
    particles.push([x, y]);
  }
  while(requestedParticleNumber < particles.length){
    particles.pop();
  }

  let particleSelection =  d3.select(svg).selectAll('.particleLayer')
    .selectAll('.particle')
    .data(particles.slice(3));

  particleSelection
  .enter().append("circle")
      .attr('class', 'particle')
      .attr("stroke", "BLACK")
      .attr("fill", "BLUE")
      .attr("cx", d => d[0])
      .attr("cy", d=> d[1])
      .attr("r", size);

  particleSelection
  .exit().remove();

  return particles;
}

function waveLengthScale(svg, simWidth, particleArea, waveLength){

  d3.select(svg)
  .append("g")
    .attr('class', 'wave-length-chart')
    .attr("transform", `translate(${particleArea.x},${particleArea.y})`);
  // updateWaveLengthScale(svg, simWidth, particleArea, modelCache)
}

function updateWaveLengthScale(svg, simWidth, particleArea, modelCache){
  let pressureYRange = d3.scaleLinear().domain([0,simWidth/modelCache.waveLength]).range([0, particleArea.width]);

  var axis = d3.axisTop(pressureYRange);

  d3.select(svg).select('.wave-length-chart')
    .call(axis);
}

function metersScale(svg, particleArea){
  d3.select(svg)
    .append("g")
    .attr('class', 'meters-chart')
    .attr("transform", `translate(${particleArea.x},${particleArea.y + particleArea.height})`);
}

function meterScaleUpdate(svg, simWidth,particleArea){
  let pressureYRange = d3.scaleLinear().domain([0,simWidth]).range([0, particleArea.width]);

  var axis = d3.axisBottom(pressureYRange);

  d3.select(svg).select('.meters-chart')
    .call(axis);
}

//time in seconds
let t = 0;

function update(svg, particles, modelCache, model){
    t += 1;
    updateParticles(svg, particles, modelCache, model);
    updateLevels(svg, particles, modelCache, model);
    updatedisplacement(svg, particles, modelCache, model);
    window.setTimeout(update, 50, svg, particles, modelCache, model)
}

//tracks displacement
function updatedisplacement(svg, particles, modelCache, model){

  let height = svg.getBoundingClientRect().height

  let phase = Math.PI;

  let yScale = height*0.05 /(model.maxDisplacement * modelCache.toCordsScaleFactor);

  let particleDisplacements = particles.map(p => [p[0], yScale * displacementTransform(p[0], modelCache, phase, model.maxDisplacement, model.waveFunction)])
      .map(p => [p[0], p[1] + height*0.85])
      .sort((a,b) => a[0] - b[0])

  d3.select(svg).selectAll('.displacement-curve')
    .datum(particleDisplacements)
    .attr('d', d3.line());

  let pressureYRange = d3.scaleLinear().domain([-model.maxDisplacement,+model.maxDisplacement]).range([0, height*0.1]);

  var axis = d3.axisRight(pressureYRange)
    .ticks(3, "s");

  d3.select('.displacement-chart')
    .call(axis);
}

// tracks pressure
function updateLevels(svg, particles, modelCache, model){

    let height = svg.getBoundingClientRect().height

    // 0.25 because pressure is pi/2 out of phase with displacement
    // https://physics.bu.edu/~duffy/semester1/c20_disp_pressure.html
    let phase = 2*Math.PI*0.25;

    let yScale = height*0.05 /(model.maxDisplacement * modelCache.toCordsScaleFactor);

    let particleDisplacements = particles.map(p => [p[0], yScale* displacementTransform(p[0], modelCache, phase, model.maxDisplacement, model.waveFunction)])
        .map(p => [p[0], p[1] + height*0.15])
        .sort((a,b) => a[0] - b[0]);

    d3.select(svg).selectAll('.level-curve')
      .datum(particleDisplacements)
      .attr('d', d3.line());

  let pressure = maxPressure(model);
  let pressureYRange = d3.scaleLinear().domain([-pressure,+pressure]).range([0, height*0.1]);

  var axis = d3.axisRight(pressureYRange)
    .ticks(3, "s");

  d3.select('.pressure-chart')
    .call(axis);

}

function square(radians){
  if((radians % (2*Math.PI)) < Math.PI){
    return -1;
  }else{
    return 1;
  }
}

//todo: why is this broken for first few cycles?
function triangle(radians){
  let placeInCycle = radians % (Math.PI/2);
  let percentOfCycle = placeInCycle / (Math.PI/2);
  let cycle = radians % (2*Math.PI);
  if(cycle < 0.5*Math.PI){
    return percentOfCycle;
  }else if(cycle < Math.PI){
    return 1-percentOfCycle;
  }else if(cycle < 1.5*Math.PI){
    return -percentOfCycle;
  }else{
    return -(1-percentOfCycle);
  }
}

// https://en.wikipedia.org/wiki/Wave_vector
function displacementTransform(x, modelCache, phase, maxDisplacement, waveFunction){
    
    //todo: cache this across time
    let xInMeters = x * modelCache.toMetersScaleFactor;
  
    let A = maxDisplacement; // meters, max displacement, tod: this in real soundpressure units
    // todo: cache this across particles: modelCache.wTimeScale * t
    let displacementInMeters =  (A * waveFunction((modelCache.wTimeScale * t) - (modelCache.k * xInMeters) + phase));
    return displacementInMeters*modelCache.toCordsScaleFactor;
}

function updateParticles(svg, particles, modelCache, model){

    let particleDisplacements = particles.map(p => p[0] + displacementTransform(p[0], modelCache, 0, model.maxDisplacement, model.waveFunction));

    d3.select(svg)
    .selectAll('.particle')
    .data(particleDisplacements.slice(3))
    .attr("cx", d => d);

    d3.select(svg)
    .selectAll('.highlightedParticle')
    .data(particleDisplacements.slice(0,3))
    .attr("cx", d => d);

  }
