import * as d3 from 'd3';
import * as dat from 'dat.gui';

import { waveforms } from './waveforms';
import { presets } from './presets';

function formatSiPrefix(number, unit) {
  // guesses a prefix based on the position of the most significant digit
  // we ignore prefixes for 10 and 100 so that we change units every factor of 1000
  let prefix = "";
  let absoluteValue = Math.abs(number);
  if (absoluteValue > 1000000000000000) {
    console.log("error, too big for prefix " + absoluteValue);
  } else if (absoluteValue > 1000000000000) {
    prefix = "T";
    number /= 1000000000000;
  } else if (absoluteValue > 1000000000) {
    prefix = "G";
    number /= 1000000000;
  } else if (absoluteValue > 1000000) {
    prefix = "M";
    number /= 1000000;
  } else if (absoluteValue > 1000) {
    prefix = "k";
    number /= 1000;
  } else if (absoluteValue < 0.0000000000000001) {
    console.log("error, too small for prefix " + absoluteValue);
  } else if (absoluteValue < 0.0000000000001) {
    prefix = "f";
    number *= 1000000000000000;
  } else if (absoluteValue < 0.0000000001) {
    prefix = "p";
    number *= 1000000000000;
  } else if (absoluteValue < 0.0000001) {
    prefix = "n";
    number *= 1000000000;
  } else if (absoluteValue < 0.0001) {
    prefix = "μ";
    number *= 1000000;
  } else if (absoluteValue < 1) {
    prefix = "m";
    number *= 1000;
  }
  if (!unit) {
    unit = "";
  }
  let rounded = number.toLocaleString(undefined, { maximumSignificantDigits: 3 });
  return rounded + prefix + unit;
}

// For drawing that only has to be done one, at the start
// independent of time or user controlled variables
function setup(svg, layout) {

  // create a particle layer so that particles never
  // draw over graphs, annotations, etc
  d3.select(svg).append('g').attr('class', 'particleLayer');
  let overlayLayer = d3.select(svg).append('g').attr('class', 'overlayLayer');

  let height = svg.getBoundingClientRect().height;

  // the graph above the particle simulator
  // showing the pressure at each particles origin X
  overlayLayer.append('path')
    .attr('id', 'pressure-curve')
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr("fill", "transparent")
    .attr("transform", `translate(0,${layout.chartHeights * 0.5 + 10})`);

  // the graph below the particle simulator
  // showing the displacement of each particle from it's origin X
  overlayLayer.append('path')
    .attr('id', 'displacement-curve')
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr("fill", "transparent")
    .attr("transform", `translate(0,${height - layout.chartHeights - 10 + layout.chartHeights * 0.5})`);

  // the speaker cone to the left of the particles
  overlayLayer.append("line")
    .attr("id", "cone")
    .style("stroke", "black")
    .attr("x1", layout.speakerConeX)
    .attr("y1", layout.particleArea.y)
    .attr("x2", layout.speakerConeX)
    .attr("y2", layout.particleArea.y + layout.particleArea.height);

  // other stuff

  drawPressureChart(svg, layout.speakerConeX, 10, layout.chartHeights);
  drawDisplacementChart(svg, layout.speakerConeX, layout.particleArea.x + layout.particleArea.width, height - layout.chartHeights - 10, layout.chartHeights);
  metersScale(svg, layout.particleArea);
  waveLengthScale(svg, layout.particleArea);
}

function drawPressureChart(svg, x, y, chartHeight) {

  d3.select(svg)
    .append("g")
    .attr('id', 'pressure-chart')
    .attr("transform", `translate(${x},${y})`);

  // 130 is just how far we needed to go for the text to
  // not overlap with axis (on my machine anyway)
  d3.select(svg).append("text")
    .attr("transform", `translate(${x - 130},${y + chartHeight / 2})`)
    .text("Pressure");
}

function updatePressureChartAxis(height, pressure) {

  let range = d3.scaleLinear().domain([pressure, -pressure]).range([0, height]);

  var axis = d3.axisLeft(range)
    .tickFormat((d, i) => d3.format(".3s")(d) + "Pa")
    .ticks(3);

  d3.select('#pressure-chart')
    .call(axis);
}

function drawDisplacementChart(svg, leftX, rightX, y, chartHeight) {
  let svgDim = svg.getBoundingClientRect();
  var yRange = d3.scaleLinear().domain([1, -1]).range([0, chartHeight]);

  var axis = d3.axisRight(yRange)
    .ticks(3, "s");

  d3.select(svg)
    .append("g")
    .attr("transform", `translate(${rightX},${y})`)
    .call(axis);

  let offsetForTicks = 30;

  d3.select(svg).append("text")
    .attr("transform", `translate(${rightX + offsetForTicks},${y + chartHeight * 0.5})`)
    .text("Normalized");

  d3.select(svg)
    .append("g")
    .attr('id', 'displacement-chart')
    .attr("transform", `translate(${leftX},${y})`);

  d3.select(svg).append("text")
    .attr("transform", `translate(${leftX - 160},${y + chartHeight * 0.5})`)
    .text("Displacement");
}

function updateDisplacementChartAxis(height, maxDisplacement) {
  let yRange = d3.scaleLinear().domain([maxDisplacement, -maxDisplacement]).range([0, height]);

  var axis = d3.axisLeft(yRange)
    .tickFormat((d, i) => d3.format(".3s")(d) + "m")
    .ticks(3);

  d3.select('#displacement-chart')
    .call(axis);
}

// rmsFactor is used if you want the average SPL across a wave's cycle
// if getting SPL for an instantaneous pressure, leave it blank
function pressureToSpl(pressure, rmsFactor) {
  //https://en.wikipedia.org/wiki/Sound_pressure#Sound_pressure_level
  let referencePressure = 20 * 0.000001;//20 microPa
  if (!rmsFactor) {
    rmsFactor = 1;
  }
  let pressureRMS = pressure * rmsFactor;
  let spl = 20 * Math.log10(pressureRMS / referencePressure);
  return spl;
}

function cache(modelCache, model, svgWidth) {
  // cycles per second. spatial freq
  modelCache.w = 2 * Math.PI * model.freq;
  modelCache.waveLength = model.speedOfSound / model.freq;
  // cycles per meter, angular freq
  modelCache.k = 2 * Math.PI / modelCache.waveLength;
  modelCache.wTimeScale = modelCache.w * model.timeScale;
  modelCache.toMetersScaleFactor = modelCache.simWidth / svgWidth;
  modelCache.toCordsScaleFactor = svgWidth / modelCache.simWidth;

  let pressure = maxPressure(model, modelCache);
  model.pressure = pressure;
  let spl = pressureToSpl(pressure, model.waveform.rms);
  document.getElementById('sound-pressure-level').innerText = `Sound Pressure Level (dB): ${spl}`

  document.getElementById('wave-length').innerText = `Wave length (m): ${modelCache.waveLength}`;
  pressureEquations(model, modelCache);
  loudnessEquations(model, modelCache);
  return modelCache;
}

function maxPressure(model, modelCache) {
  // https://physics.stackexchange.com/questions/93424/how-far-do-air-particles-move-when-a-sound-wave-passes-through-them?rq=1
  // ^^ the 400 number given there is rounded from 413, see links below
  //https://en.wikipedia.org/wiki/Density#Air
  let airDensity = 1.204; // kg/m^3
  // Equation for z0, characteristic specific acoustic impedance
  // see equation at the bottom of this section
  // https://en.wikipedia.org/wiki/Acoustic_impedance#Characteristic_specific_acoustic_impedance
  // for reference, this should be 413 for actual speed of sound in air (and our assumed air pressure)
  // https://en.wikipedia.org/wiki/Acoustic_impedance#Effect_of_temperature
  let roomairAccousticImpedance = airDensity * model.speedOfSound;
  modelCache.roomairAccousticImpedance = roomairAccousticImpedance;
  let pressure = modelCache.maxDisplacement * 2 * Math.PI * model.freq * roomairAccousticImpedance;
  return pressure;
}

function displacement_equations(model, modelCache, particle, time) {
  //todo: need to map model.tone==sin to cos
  //todo: explain how k and w account for wave position
  // explain k is https://en.wikipedia.org/wiki/Spatial_frequency
  let x = particle[0] * modelCache.toMetersScaleFactor;
  let displacement = modelCache.maxDisplacement * Math.cos(modelCache.k * x - modelCache.w * time);
  let template = `$\${displacement}=A {F}(k x - wt)$$\
  $$${formatSiPrefix(displacement, "m")}=${formatSiPrefix(modelCache.maxDisplacement, "m")} ${model.waveform.equationName} (k ${formatSiPrefix(x, "m")} - w${formatSiPrefix(time, "s")})$$
  $$k=\\frac{2\\pi}{λ}, λ=\\frac{v}{f}$$
  $$k=\\frac{2\\pi}{${formatSiPrefix(modelCache.waveLength, "m")}}=${formatSiPrefix(2 * Math.PI * model.freq, "\\mathrm{^c/m}")}, λ=\\frac{${formatSiPrefix(model.speedOfSound, "m/s")}}{${formatSiPrefix(model.freq, "hz")}}=${formatSiPrefix(modelCache.waveLength, "m")}$$
  $$w=\\frac{2\\pi}{T} = 2\\pi f$$
  $$w=\\frac{2\\pi}{T} = 2\\pi ${formatSiPrefix(model.freq, "{Hz}")}=${formatSiPrefix(2 * Math.PI * model.freq, "^c/s")}$$`;
  let element = document.getElementById("displacement-equations");
  element.innerText = template;
  MathJax.typeset([element]);
}

function pressureEquations(model, modelCache) {
  let template = `
$\$p=AZ_0w=${formatSiPrefix(modelCache.maxDisplacement, "m")}${formatSiPrefix(modelCache.roomairAccousticImpedance, "kg/m^2s")}${formatSiPrefix(2 * Math.PI * model.freq, "^c/s")}=${formatSiPrefix(model.pressure, "pa")}$$
$$Z_0=ρc=1.204kg/m^3${formatSiPrefix(model.speedOfSound, "m/s")}$$
$$w=${formatSiPrefix(2 * Math.PI * model.freq, "^c/s")}$$
`
  let element = document.getElementById("pressure-equations");
  element.innerText = template;
  MathJax.typeset([element]);
}

function loudnessEquations(model, modelCache) {
  let referencePressure = 20 * 0.000001;
  let pressureRMS = model.pressure * model.waveform.rms;
  let spl = 20 * Math.log10(pressureRMS / referencePressure);
  let template = `
  $\${SPL} = 20{log}_{10}(\\frac{p}{p_0})=20{log}_{10}(\\frac{${formatSiPrefix(pressureRMS, "pa")}}{${formatSiPrefix(referencePressure, "pa")}})=${formatSiPrefix(spl, "dB")}$$
  `
  let element = document.getElementById("loudness-equations");
  element.innerText = template;
  MathJax.typeset([element]);
}

function unitToScalingFactor(unit) {
  let scalingFactor = 1;
  switch (unit) {
    case "meters": scalingFactor = 1; break;
    case "millimeters": scalingFactor = 0.001; break;
    case "micrometers": scalingFactor = 0.000001; break;
    case "nanometers": scalingFactor = 0.000000001; break;
  }
  return scalingFactor;
}

window.onload = function () {

  let model = {
    widthUnit: "millimeters",
    width: 100,
    timeScale: 0.0001,
    freq: 261.63,
    //todo: consider making this a dropdown
    // of speed of sound at specific temperatures/materials
    speedOfSound: 343,
    particleNumber: 2000,
    maxDisplacementUnit: "millimeters",
    maxDisplacement: 500,
    size: 1,
    tone: 'sin',
    waveform: waveforms['sin'],
  }

  const gui = new dat.GUI({load: presets});
  gui.remember(model);

  let svg = document.getElementById('diagram')
  let svgDim = svg.getBoundingClientRect()
  var particles = [];

  let particleArea = {
    x: svgDim.width * 0.1,
    y: svgDim.height * 0.2,
    width: svgDim.width * 0.8,
    height: svgDim.height * 0.6,
  };

  let layout = {
    // initial speaker X, before displacement
    // particles that might cross this should not be rendered
    speakerConeX: particleArea.x + (particleArea.width * 0.1),
    particleArea: particleArea,
    chartHeights: svgDim.height * 0.1,
  }

  let highlightedParticleCount = 3;

  setup(svg, layout);

  let modelCache = {};

  modelCache.pressureCurveYoffset = layout.chartHeights * 0.5 + 10;
  modelCache.displacementCurveYoffset = svgDim.height - layout.chartHeights - 10 + layout.chartHeights * 0.5;
  modelCache.simWidth = unitToScalingFactor(model.widthUnit) * model.width;
  modelCache.maxDisplacement = unitToScalingFactor(model.maxDisplacementUnit) * model.maxDisplacement;
  modelCache = cache(modelCache, model, svgDim.width);

  gui.add(model, 'particleNumber', 0, 8000, 100)
    .onChange(() => {
      particles = newParticleNumber(svg, particles, model.particleNumber, particleArea, model.size);
      // the displacement and pressure curves need
      // particles sorted on x axis so they can draw a line easily
      // but we don't want to sort the original particles
      // because random order makes it easy to add/remove particles
      // evenly across the particle space
      modelCache.sortedParticles = [...particles].sort((a, b) => a[0] - b[0]);
      modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
    });

  gui.add(model, 'size', 1, 10, 1)
    .onChange(() => {
      newParticleSize(svg, particles, model.size);
    });

  gui.add(model, 'widthUnit', ["meters", "millimeters", "micrometers", "nanometers"])
    .onChange((value) => {
      modelCache.simWidth = unitToScalingFactor(value) * model.width;
      meterScaleUpdate(svg, modelCache.simWidth, particleArea);
      modelCache = cache(modelCache, model, svgDim.width);
      updateWaveLengthScale(svg, modelCache.simWidth, particleArea, modelCache);
      modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
    });


  gui.add(model, 'width', 0, 1000, 1)
    .onChange(() => {
      modelCache.simWidth = unitToScalingFactor(model.widthUnit) * model.width;
      meterScaleUpdate(svg, modelCache.simWidth, particleArea);
      modelCache = cache(modelCache, model, svgDim.width);
      updateWaveLengthScale(svg, modelCache.simWidth, particleArea, modelCache);
      modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
    });

  //todo: make steps better (bigger steps at bigger values)
  // or one of N fixed speeds
  // if you let this get big (0.2101) wave starts going backwards, why?
  gui.add(model, 'timeScale', 0.00001, 0.0005, 0.00001)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
    });

  gui.add(model, 'freq', 20, 20020, 1)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
      updateWaveLengthScale(svg, modelCache.simWidth, particleArea, modelCache);
      updatePressureChartAxis(layout.chartHeights, model.pressure);
      displacement_equations(model, modelCache, particles[0], document.getElementById('equation-t').value);
    });

  gui.add(model, 'speedOfSound', 100, 1000, 1)
    .onChange(() => {
      modelCache = cache(modelCache, model, svgDim.width);
      updatePressureChartAxis(layout.chartHeights, model.pressure);
      displacement_equations(model, modelCache, particles[0], document.getElementById('equation-t').value);
    });

  gui.add(model, 'maxDisplacementUnit', ["millimeters", "micrometers", "nanometers"])
    .onChange((value) => {
      modelCache.maxDisplacement = unitToScalingFactor(value) * model.maxDisplacement;
      modelCache = cache(modelCache, model, svgDim.width);
      updateDisplacementChartAxis(layout.chartHeights, modelCache.maxDisplacement);
      updatePressureChartAxis(layout.chartHeights, model.pressure);
      modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
      displacement_equations(model, modelCache, particles[0], document.getElementById('equation-t').value);
    });

  gui.add(model, 'maxDisplacement', 0, 1000, 1)
    .onChange(() => {
      modelCache.maxDisplacement = unitToScalingFactor(model.maxDisplacementUnit) * model.maxDisplacement;
      modelCache = cache(modelCache, model, svgDim.width);
      updateDisplacementChartAxis(layout.chartHeights, modelCache.maxDisplacement);
      updatePressureChartAxis(layout.chartHeights, model.pressure);
      modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
      displacement_equations(model, modelCache, particles[0], document.getElementById('equation-t').value);
    });

  gui.add(model, 'tone').options(['sin', 'triangle', 'square'])
    .onChange((tone) => {
      model.waveform = waveforms[tone];
      loudnessEquations(model, modelCache);
      displacement_equations(model, modelCache, particles[0], document.getElementById('equation-t').value);
    });

  particles = newParticleNumber(svg, particles, model.particleNumber, particleArea, model.size);
  modelCache.sortedParticles = [...particles].sort((a, b) => a[0] - b[0]);
  modelCache.highLightedParticles = highlightedParticles(svg, particles, model.size, modelCache.maxDisplacement * modelCache.toCordsScaleFactor, highlightedParticleCount);
  meterScaleUpdate(svg, modelCache.simWidth, particleArea);
  updateWaveLengthScale(svg, modelCache.simWidth, particleArea, modelCache);
  update(svg, particles, modelCache, model, particleArea, layout.speakerConeX);
  displacement_equations(model, modelCache, particles[0], 0);
  updateDisplacementChartAxis(layout.chartHeights, modelCache.maxDisplacement);
  updatePressureChartAxis(layout.chartHeights, model.pressure);

  document.getElementById('equation-t').onchange = (e) => {
    displacement_equations(model, modelCache, particles[0], e.target.value);
  };
}

function newParticleSize(svg, particles, size) {

  d3.select(svg)
    .selectAll('.particle')
    .data(particles)
    .attr("r", size);

}

function highlightedParticles(svg, particles, size, maxDisplacement, howMany) {

  let scaleFactor = 4;

  let highlightedParticles = particles.slice(0, howMany);

  // the displacement bars showing the range of a particles movement

  let displacement = d3.select(svg)
    .selectAll('.highlightedParticleDisplacement')
    .data(highlightedParticles);

  let enterDisplacement = displacement
    .enter().append("line")
    .attr('class', 'highlightedParticleDisplacement')
    .attr("stroke", "BLACK")
    .attr('stroke-width', 3);

  displacement.merge(enterDisplacement)
    .attr("x1", d => d[0] - maxDisplacement)
    .attr("y1", d => d[1] + size * scaleFactor)
    .attr("x2", d => d[0] + maxDisplacement)
    .attr("y2", d => d[1] + size * scaleFactor);

  displacement
    .exit().remove();

  // the actual particle

  let highlightedParticleSelection = d3.select(svg)
    .selectAll('.highlightedParticle')
    .data(highlightedParticles);

  let enterHighlightedParticleSelection = highlightedParticleSelection
    .enter().append("circle")
    .attr('class', 'highlightedParticle')
    .attr("stroke", "BLACK")
    .attr("fill", "RED");

  highlightedParticleSelection.merge(enterHighlightedParticleSelection)
    .attr("cx", d => d[0])
    .attr("cy", d => d[1])
    .attr("r", size * scaleFactor);

  highlightedParticleSelection
    .exit().remove();

  highlightedParticlesCurve(svg, highlightedParticles, 'highlightedParticlePressureCurve', size * scaleFactor);

  highlightedParticlesCurve(svg, highlightedParticles, 'highlightedParticleDisplacementCurve', size * scaleFactor);

  return highlightedParticles;
}

function newParticleNumber(svg, particles, requestedParticleNumber, bounds, size) {

  while (requestedParticleNumber > particles.length) {
    //0.1 needs to be kept in sync with the % of the width max displacement
    // is allowed to move particles (so they never go off the edge of the world)
    let x = bounds.x + (bounds.width * 0.1) + bounds.width * Math.random()
    let y = bounds.y + bounds.height * Math.random()
    particles.push([x, y]);
  }
  while (requestedParticleNumber < particles.length) {
    particles.pop();
  }

  let particleSelection = d3.select(svg).selectAll('.particleLayer')
    .selectAll('.particle')
    .data(particles.slice(3));

  particleSelection
    .enter().append("circle")
    .attr('class', 'particle')
    .attr("stroke", "BLACK")
    .attr("fill", "BLUE")
    .attr("cx", d => d[0])
    .attr("cy", d => d[1])
    .attr("r", size);

  particleSelection
    .exit().remove();

  return particles;
}

function waveLengthScale(svg, particleArea) {

  d3.select(svg)
    .append("g")
    .attr('id', 'wave-length-chart')
    .attr("transform", `translate(${particleArea.x},${particleArea.y})`);

  d3.select(svg).append("text")
    .attr("transform", `translate(0,${particleArea.y + 20})`)
    .text("Distance from vibration source");

}

function updateWaveLengthScale(svg, simWidth, particleArea, modelCache) {
  let absDomainRange = simWidth / modelCache.waveLength;
  //keep in sync with the speakerConeX (left bound of particle area where we start to draw particles)
  // which is linked to max displacement so they don't move off left of screen
  let domainBelow0 = absDomainRange * 0.1;
  let xRange = d3.scaleLinear().domain([-domainBelow0, absDomainRange - domainBelow0]).range([0, particleArea.width]);

  var axis = d3.axisTop(xRange)
    .tickFormat((d, i) => d3.format(".3s")(d) + "λ");

  d3.select(svg).select('#wave-length-chart')
    .call(axis);
}

function metersScale(svg, particleArea) {
  d3.select(svg)
    .append("g")
    .attr('id', 'meters-chart')
    .attr("transform", `translate(${particleArea.x},${particleArea.y + particleArea.height})`);

  d3.select(svg).append("text")
    .attr("transform", `translate(0,${particleArea.y + particleArea.height - 10})`)
    .text("Distance from vibration source");
}

function meterScaleUpdate(svg, simWidth, particleArea) {
  // keep in sync with the speakerConeX (left bound of particle area where we start to draw particles)
  // which is linked to max displacement so they don't move off left of screen
  let domainBelow0 = simWidth * 0.1;
  let xRange = d3.scaleLinear().domain([-domainBelow0, simWidth - domainBelow0]).range([0, particleArea.width]);

  var axis = d3.axisBottom(xRange)
    .tickFormat((d, i) => d3.format(".3s")(d) + "m");

  d3.select(svg).select('#meters-chart')
    .call(axis);
}

// time in seconds
let t = 0;

function update(svg, particles, modelCache, model, particleArea, speakerConeX, timestamp) {
  t += 1;
  updateSpeakerCone(svg, particleArea, modelCache, model);
  updateParticles(svg, particles, modelCache, model, speakerConeX);
  updatePressureCurve(svg, particles, modelCache, model);
  updateDisplacementCurve(svg, particles, modelCache, model);
  // todo: account for time between calls
  window.requestAnimationFrame((timestamp) => update(svg, particles, modelCache, model, particleArea, speakerConeX, timestamp))
  // window.setTimeout(update, 50, svg, particles, modelCache, model, particleArea, speakerConeX)
}

function updateSpeakerCone(svg, particleArea, modelCache, model) {
  // fakeX is the X is the closest x of visible particles to the cone
  // (which is 2*maxDisplacement away so they never intersect it)
  // we use this so the cones displacement is in sync with theres
  // and it looks like it's pushing them
  // -10 is so that it's slightly ahead of their displacement curve
  // to accentuate the pushing effect
  let fakeX = particleArea.x + (particleArea.width * 0.1) + 2 * modelCache.maxDisplacement;
  let displacement = displacementTransform(fakeX, modelCache, 0, modelCache.maxDisplacement, model.waveform.function);
  d3.select(svg).select("#cone")
    .attr("transform", `translate(${displacement},0)`);
}

function highlightedParticlesCurve(svg, highlightedParticles, selectionClass, size) {
  let selection = d3.select(svg)
    .selectAll(`.${selectionClass}`)
    .data(highlightedParticles)

  selection
    .enter().append("circle")
    .attr('class', `${selectionClass}`)
    .attr("stroke", "BLACK")
    .attr("fill", "RED")
    .attr("cx", d => d[0])
    .attr("r", size);

  selection.exit().remove();
}

function updateDisplacementCurve(svg, particles, modelCache, model) {

  let height = svg.getBoundingClientRect().height

  let phase = Math.PI;

  let yScale = height * 0.05 / (modelCache.maxDisplacement * modelCache.toCordsScaleFactor);

  d3.select(svg)
    .selectAll('.highlightedParticleDisplacementCurve')
    .attr("cy", d => yScale * displacementTransform(d[0], modelCache, phase, modelCache.maxDisplacement, model.waveform.function) + modelCache.displacementCurveYoffset);

  let particleDisplacements = modelCache.sortedParticles.map(p => [p[0], yScale * displacementTransform(p[0], modelCache, phase, modelCache.maxDisplacement, model.waveform.function)]);

  d3.select(svg).select('#displacement-curve')
    .datum(particleDisplacements)
    .attr('d', d3.line());
}

function updatePressureCurve(svg, particles, modelCache, model) {

  let height = svg.getBoundingClientRect().height

  // 0.25 because pressure is pi/2 out of phase with displacement
  // https://physics.bu.edu/~duffy/semester1/c20_disp_pressure.html
  let phase = 2 * Math.PI * 0.75;

  let yScale = height * 0.05 / (modelCache.maxDisplacement * modelCache.toCordsScaleFactor);

  d3.select(svg)
    .selectAll('.highlightedParticlePressureCurve')
    .data(modelCache.highLightedParticles)
    .attr("cy", d => yScale * displacementTransform(d[0], modelCache, phase, modelCache.maxDisplacement, model.waveform.function) + modelCache.pressureCurveYoffset);

  let particleDisplacements = modelCache.sortedParticles.map(p => [p[0], yScale * displacementTransform(p[0], modelCache, phase, modelCache.maxDisplacement, model.waveform.function)]);

  d3.select(svg).select('#pressure-curve')
    .datum(particleDisplacements)
    .attr('d', d3.line());//todo: don't make new line eveyr time?
}

function displacementTransform(x, modelCache, phase, maxDisplacement, waveFunction) {

  //todo: cache this across time
  let xInMeters = x * modelCache.toMetersScaleFactor;

  let A = maxDisplacement;
  // todo: cache this across particles: modelCache.wTimeScale * t
  let displacementInMeters = (A * waveFunction((modelCache.wTimeScale * t) - (modelCache.k * xInMeters) + phase));
  return displacementInMeters * modelCache.toCordsScaleFactor;
}

function updateParticles(svg, particles, modelCache, model, speakerConeX) {

  let particleDisplacements = particles.map(p => [p[0] + displacementTransform(p[0], modelCache, 0, modelCache.maxDisplacement, model.waveform.function), p[0]]);
  d3.select(svg)
    .selectAll('.particle')
    .data(particleDisplacements.slice(3))
    .attr("cx", d => {
      if (d[1] < speakerConeX + modelCache.maxDisplacement * 2 * modelCache.toCordsScaleFactor) {
        //hide if too close to cone
        return -10000;
      } else {
        return d[0];
      }
    });

  d3.select(svg)
    .selectAll('.highlightedParticle')
    .data(particleDisplacements.slice(0, 3))
    .attr("cx", d => d[0]);

}
